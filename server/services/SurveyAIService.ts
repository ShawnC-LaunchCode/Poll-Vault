import { GoogleGenerativeAI } from "@google/generative-ai";
import { DEFAULT_SURVEY_GEN_PROMPT } from "../../shared/aiPromptConfig";
import {
  surveyRepository,
  pageRepository,
  questionRepository,
  type DbTransaction
} from "../repositories";
import { surveys, surveyPages, questions } from "@shared/schema";
import type { Survey, Question } from "@shared/schema";
import {
  getPrimaryGeminiModel,
  getFallbackGeminiModels,
  shouldTryFallback
} from "../config/aiModels";
import { slackNotificationService } from "./SlackNotificationService";

type QuestionType = Question['type'];

type GenQuestion = {
  type: QuestionType;
  title: string;
  description?: string;
  options?: string[];
  required?: boolean;
};

type GenPage = {
  pageTitle: string;
  questions: GenQuestion[];
};

type GenSurvey = {
  title: string;
  description?: string;
  pages: GenPage[];
};

/**
 * Service for AI-powered survey generation using Google Gemini
 */
export class SurveyAIService {
  private surveyRepo: typeof surveyRepository;
  private pageRepo: typeof pageRepository;
  private questionRepo: typeof questionRepository;
  private modelName: string;

  constructor(
    surveyRepo?: typeof surveyRepository,
    pageRepo?: typeof pageRepository,
    questionRepo?: typeof questionRepository,
    modelName?: string
  ) {
    this.surveyRepo = surveyRepo || surveyRepository;
    this.pageRepo = pageRepo || pageRepository;
    this.questionRepo = questionRepo || questionRepository;
    this.modelName = modelName || getPrimaryGeminiModel();
  }

  /**
   * Get configured Gemini model
   */
  private getModel(modelName?: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = modelName || this.modelName;
    console.log(`[AI] Using model: ${model}`);
    return genAI.getGenerativeModel({ model });
  }

  /**
   * Parse and validate AI-generated survey data
   */
  private parseAndValidateResponse(text: string): GenSurvey {
    // Strip code fences if present
    const cleaned = text
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new Error("AI returned invalid JSON. Please refine the topic and try again.");
    }

    // Validate and normalize structure
    if (!parsed.title || typeof parsed.title !== 'string') {
      throw new Error("AI response missing valid title");
    }

    if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      throw new Error("AI response missing valid pages array");
    }

    // Validate question types
    const validTypes: QuestionType[] = [
      'short_text',
      'long_text',
      'multiple_choice',
      'radio',
      'yes_no',
      'date_time'
    ];

    // Normalize pages: ensure 3-4 questions per page
    parsed.pages = parsed.pages
      .map((p: any) => ({
        pageTitle: String(p.pageTitle || "General"),
        questions: (Array.isArray(p.questions) ? p.questions : [])
          .slice(0, 4) // Limit to 4 questions max
          .map((q: any) => {
            // Validate question type
            if (!validTypes.includes(q.type)) {
              throw new Error(`Invalid question type: ${q.type}`);
            }

            // Validate multiple_choice and radio have options
            if ((q.type === 'multiple_choice' || q.type === 'radio') &&
                (!Array.isArray(q.options) || q.options.length < 2)) {
              throw new Error(`Question type ${q.type} requires at least 2 options`);
            }

            return {
              type: q.type as QuestionType,
              title: String(q.title || "Untitled Question"),
              description: q.description ? String(q.description) : undefined,
              options: Array.isArray(q.options) ? q.options.map(String) : undefined,
              required: Boolean(q.required)
            };
          })
      }))
      .filter((p: GenPage) => p.questions.length > 0); // Remove empty pages

    if (parsed.pages.length === 0) {
      throw new Error("AI returned an empty questionnaire. Try a more specific topic.");
    }

    return {
      title: parsed.title,
      description: parsed.description ? String(parsed.description) : undefined,
      pages: parsed.pages
    };
  }

  /**
   * Generate content with automatic fallback to alternative models
   */
  private async generateContentWithFallback(prompt: string, context?: any): Promise<string> {
    const fallbackModels = getFallbackGeminiModels(this.modelName);
    const modelsToTry = [this.modelName, ...fallbackModels];

    let lastError: Error | null = null;
    let successfulModel: string | null = null;
    let primaryModelFailed = false;
    const errors: Array<{ model: string; error: string }> = [];

    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i];

      try {
        console.log(`[AI] Attempt ${i + 1}/${modelsToTry.length}: Trying model ${currentModel}`);
        const model = this.getModel(currentModel);
        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();

        console.log(`[AI] ✓ Success with model: ${currentModel}`);
        successfulModel = currentModel;

        // If primary model failed but a fallback succeeded, send Slack notification
        if (primaryModelFailed && slackNotificationService.isConfigured()) {
          await slackNotificationService.notifyAIModelFailure({
            primaryModel: this.modelName,
            successfulModel: currentModel,
            attemptedModels: modelsToTry.slice(0, i + 1),
            totalAttempts: i + 1,
            errors,
            timestamp: new Date(),
            environment: process.env.NODE_ENV || 'unknown',
            endpoint: '/api/ai/generate',
            requestData: context
          });
        }

        return text;

      } catch (error) {
        lastError = error as Error;
        const errorMsg = lastError.message;

        console.error(`[AI] ✗ Model ${currentModel} failed:`, errorMsg);

        // Track this error
        errors.push({ model: currentModel, error: errorMsg });

        // Mark that primary model failed
        if (i === 0) {
          primaryModelFailed = true;
        }

        // If this was the last model, throw the error
        if (i === modelsToTry.length - 1) {
          console.error(`[AI] All ${modelsToTry.length} models failed. Last error:`, errorMsg);

          // Send critical Slack notification - all models failed
          if (slackNotificationService.isConfigured()) {
            await slackNotificationService.notifyAIModelFailure({
              primaryModel: this.modelName,
              successfulModel: null,
              attemptedModels: modelsToTry,
              totalAttempts: modelsToTry.length,
              errors,
              timestamp: new Date(),
              environment: process.env.NODE_ENV || 'unknown',
              endpoint: '/api/ai/generate',
              requestData: context
            });
          }

          throw new Error(
            `AI service unavailable. All models failed. Last error: ${errorMsg}`
          );
        }

        // Check if we should try the next model
        if (shouldTryFallback(lastError)) {
          console.log(`[AI] Error is recoverable, trying next fallback model...`);
          continue;
        } else {
          // Non-recoverable error (auth, validation, etc.)
          console.error(`[AI] Error is not recoverable, aborting fallback chain`);

          // Send Slack notification for non-recoverable error
          if (slackNotificationService.isConfigured()) {
            await slackNotificationService.notifyAIModelFailure({
              primaryModel: this.modelName,
              successfulModel: null,
              attemptedModels: modelsToTry.slice(0, i + 1),
              totalAttempts: i + 1,
              errors,
              timestamp: new Date(),
              environment: process.env.NODE_ENV || 'unknown',
              endpoint: '/api/ai/generate',
              requestData: context
            });
          }

          throw lastError;
        }
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error("Unknown error occurred during AI generation");
  }

  /**
   * Generates a survey using AI and persists it as a draft
   * Returns the created survey with all pages and questions
   */
  async generateAndCreateSurvey(
    userId: string,
    topic: string,
    promptOverride?: string
  ): Promise<Survey> {
    if (!topic || !topic.trim()) {
      throw new Error("Topic is required");
    }

    const systemPrompt = (promptOverride && promptOverride.trim()) || DEFAULT_SURVEY_GEN_PROMPT;

    // Generate content with Gemini (with automatic fallback)
    const prompt = `${systemPrompt}\n\nTopic: ${topic}\n\nReturn JSON only.`;

    const text = await this.generateContentWithFallback(prompt, { topic });

    // Parse and validate response
    const surveyData = this.parseAndValidateResponse(text);

    // Create survey with pages and questions in a transaction
    return await this.surveyRepo.transaction(async (tx) => {
      // Create survey
      const [survey] = await tx
        .insert(surveys)
        .values({
          title: surveyData.title,
          description: surveyData.description || "",
          creatorId: userId,
          status: 'draft' as any
        })
        .returning();

      console.log('AI Survey created:', {
        id: survey.id,
        title: survey.title,
        pageCount: surveyData.pages.length
      });

      // Create pages and questions
      let pageOrder = 1;
      for (const pageData of surveyData.pages) {
        const [page] = await tx
          .insert(surveyPages)
          .values({
            surveyId: survey.id,
            title: pageData.pageTitle,
            order: pageOrder++
          })
          .returning();

        console.log('Page created:', {
          pageId: page.id,
          title: page.title,
          questionCount: pageData.questions.length
        });

        // Create questions for this page
        let questionOrder = 1;
        for (const questionData of pageData.questions) {
          await tx
            .insert(questions)
            .values({
              pageId: page.id,
              type: questionData.type as any,
              title: questionData.title,
              description: questionData.description || "",
              required: questionData.required || false,
              options: questionData.options || null,
              order: questionOrder++
            });
        }
      }

      return survey;
    });
  }
}
