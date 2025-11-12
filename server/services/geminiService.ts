import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Survey, Question, Response, Answer } from "@shared/schema";
import { SURVEY_ANALYSIS_PROMPT, fillPromptVariables } from "../config/aiPrompts";
import { surveyRepository, pageRepository, responseRepository } from "../repositories";
import { extractTextValue } from "../utils/answerFormatting";
import {
  getPrimaryGeminiModel,
  getFallbackGeminiModels,
  shouldTryFallback
} from "../config/aiModels";

/**
 * Service for Google Gemini AI integration
 * Handles AI-powered analytics and insights
 */
export class GeminiService {
  private genAI!: GoogleGenerativeAI;
  private modelName: string = getPrimaryGeminiModel();

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // In test environment, allow instantiation without API key
      // Methods will throw errors if called without proper configuration
      if (process.env.NODE_ENV !== 'test') {
        throw new Error("GEMINI_API_KEY not configured in environment variables");
      }
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = getPrimaryGeminiModel();
  }

  /**
   * Get a Gemini model instance
   */
  private getModel(modelName?: string) {
    if (!this.genAI) {
      throw new Error("GEMINI_API_KEY not configured - AI features are unavailable");
    }
    const model = modelName || this.modelName;
    console.log(`[AI] Using model: ${model}`);
    return this.genAI.getGenerativeModel({ model });
  }

  /**
   * Check if the service is properly initialized
   */
  private ensureInitialized(): void {
    if (!this.genAI) {
      throw new Error("GEMINI_API_KEY not configured - AI features are unavailable");
    }
  }

  /**
   * Generate content with automatic fallback to alternative models
   */
  private async generateContentWithFallback(prompt: string): Promise<string> {
    const fallbackModels = getFallbackGeminiModels(this.modelName);
    const modelsToTry = [this.modelName, ...fallbackModels];

    let lastError: Error | null = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i];

      try {
        console.log(`[AI] Attempt ${i + 1}/${modelsToTry.length}: Trying model ${currentModel}`);
        const model = this.getModel(currentModel);
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        console.log(`[AI] ✓ Success with model: ${currentModel}`);
        return text;

      } catch (error) {
        lastError = error as Error;
        const errorMsg = lastError.message;

        console.error(`[AI] ✗ Model ${currentModel} failed:`, errorMsg);

        // If this was the last model, throw the error
        if (i === modelsToTry.length - 1) {
          console.error(`[AI] All ${modelsToTry.length} models failed. Last error:`, errorMsg);
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
          throw lastError;
        }
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error("Unknown error occurred during AI generation");
  }

  /**
   * Generate AI insights for a complete survey
   */
  async analyzeSurvey(surveyId: string): Promise<{
    insights: string;
    metadata: {
      model: string;
      promptTokens: number;
      responseTokens: number;
      analysisDate: Date;
    };
  }> {
    this.ensureInitialized();

    // 1. Fetch survey data
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    // 2. Fetch all questions (via pages)
    const pagesWithQuestions = await pageRepository.findBySurveyWithQuestions(surveyId);
    const questions = pagesWithQuestions.flatMap(page => page.questions);

    // 3. Fetch all responses with answers
    const responses = await responseRepository.findBySurvey(surveyId);

    // 4. Fetch answers for each response
    const responsesWithAnswers = await Promise.all(
      responses.map(async (response) => {
        const answers = await responseRepository.findAnswersByResponse(response.id);
        return { ...response, answers };
      })
    );

    // 5. Count anonymous responses
    const anonymousCount = responses.filter(r => r.isAnonymous).length;

    // 6. Build the prompt
    const promptVariables = {
      surveyTitle: survey.title,
      surveyDescription: survey.description || "No description provided",
      questionCount: questions.length,
      responseCount: responses.length,
      anonymousCount: anonymousCount,
    };

    const basePrompt = fillPromptVariables(SURVEY_ANALYSIS_PROMPT, promptVariables);

    // 7. Format the survey data for AI
    const surveyData = this.formatSurveyData(survey, questions, responsesWithAnswers);

    // 7. Combine prompt and data
    const fullPrompt = `${basePrompt}\n\n${surveyData}`;

    // 8. Send to Gemini with fallback
    const insights = await this.generateContentWithFallback(fullPrompt);

    return {
      insights,
      metadata: {
        model: this.modelName,
        promptTokens: 0, // Token counting would require response metadata
        responseTokens: 0,
        analysisDate: new Date(),
      },
    };
  }

  /**
   * Format survey data for AI consumption
   */
  private formatSurveyData(
    survey: Survey,
    questions: Question[],
    responses: Array<Response & { answers: Answer[] }>
  ): string {
    let formatted = `## Survey Questions and Responses\n\n`;

    for (const question of questions) {
      formatted += `### Question ${questions.indexOf(question) + 1}: ${question.title}\n`;
      formatted += `**Type:** ${question.type}\n`;
      formatted += `**Required:** ${question.required ? 'Yes' : 'No'}\n`;

      if (question.description) {
        formatted += `**Description:** ${question.description}\n`;
      }

      if (question.options && Array.isArray(question.options) && question.options.length > 0) {
        formatted += `**Options:** ${(question.options as string[]).join(', ')}\n`;
      }

      formatted += `\n**Responses (${responses.length} total):**\n\n`;

      // Get all answers for this question
      const answers = responses
        .flatMap(r => r.answers || [])
        .filter(a => a.questionId === question.id);

      if (answers.length === 0) {
        formatted += `- No responses yet\n\n`;
        continue;
      }

      // Format answers based on question type
      switch (question.type) {
        case 'short_text':
        case 'long_text':
          // Show all text responses, extracting from { text: "value" } objects if needed
          const textResponses = answers
            .map(a => extractTextValue(a.value))
            .filter(v => v && v.trim().length > 0);

          if (textResponses.length > 0) {
            textResponses.forEach((text, idx) => {
              formatted += `${idx + 1}. "${text}"\n`;
            });
          } else {
            formatted += `- No text responses\n`;
          }
          break;

        case 'multiple_choice':
          // Show all selected options
          const selectedOptions = answers
            .flatMap(a => Array.isArray(a.value) ? a.value : [a.value])
            .filter(v => v)
            .map(v => extractTextValue(v));

          const optionCounts = selectedOptions.reduce((acc, option) => {
            acc[option] = (acc[option] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          Object.entries(optionCounts)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .forEach(([option, count]) => {
              const percentage = (((count as number) / responses.length) * 100).toFixed(1);
              formatted += `- ${option}: ${count} responses (${percentage}%)\n`;
            });
          break;

        case 'radio':
          // Show distribution
          const choices = answers.map(a => extractTextValue(a.value));
          const choiceCounts = choices.reduce((acc, choice) => {
            acc[choice] = (acc[choice] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          Object.entries(choiceCounts)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .forEach(([choice, count]) => {
              const percentage = (((count as number) / responses.length) * 100).toFixed(1);
              formatted += `- ${choice}: ${count} responses (${percentage}%)\n`;
            });
          break;

        case 'yes_no':
          const yesCount = answers.filter(a => a.value === true || a.value === 'Yes').length;
          const noCount = answers.filter(a => a.value === false || a.value === 'No').length;
          const yesPercent = ((yesCount / answers.length) * 100).toFixed(1);
          const noPercent = ((noCount / answers.length) * 100).toFixed(1);
          formatted += `- Yes: ${yesCount} responses (${yesPercent}%)\n`;
          formatted += `- No: ${noCount} responses (${noPercent}%)\n`;
          break;

        case 'date_time':
          // Show date range
          const dates = answers
            .map(a => new Date(extractTextValue(a.value)))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());

          if (dates.length > 0) {
            const earliest = dates[0].toLocaleDateString();
            const latest = dates[dates.length - 1].toLocaleDateString();
            formatted += `- Date range: ${earliest} to ${latest}\n`;
            formatted += `- Total date responses: ${dates.length}\n`;
          }
          break;

        default:
          formatted += `- ${answers.length} responses (details not formatted)\n`;
      }

      formatted += `\n---\n\n`;
    }

    return formatted;
  }

  /**
   * Quick sentiment analysis for text responses
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    confidence: number;
    reasoning: string;
  }> {
    this.ensureInitialized();

    const prompt = `Analyze the sentiment of this text and respond in JSON format:

Text: "${text}"

Respond with:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "confidence": 0-100,
  "reasoning": "brief explanation"
}`;

    const response = await this.generateContentWithFallback(prompt);

    // Parse JSON response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback if JSON parsing fails
    }

    // Fallback response
    return {
      sentiment: 'neutral',
      confidence: 0,
      reasoning: 'Unable to parse AI response',
    };
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
