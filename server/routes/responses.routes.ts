import type { Express } from "express";
import { isAuthenticated } from "../googleAuth";
import { storage } from "../storage";
import { insertResponseSchema, insertAnswerSchema } from "@shared/schema";

/**
 * Register response-related routes
 * Handles response creation, answer submission, and response completion
 */
export function registerResponseRoutes(app: Express): void {

  // ============================================================================
  // Response Creation Routes
  // ============================================================================

  /**
   * POST /api/surveys/:surveyId/responses
   * Create a new response for authenticated users or token-based recipients
   */
  app.post('/api/surveys/:surveyId/responses', async (req, res) => {
    try {
      const { surveyId } = req.params;
      const { token } = req.body;

      const survey = await storage.getSurvey(surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (survey.status !== 'open') {
        return res.status(400).json({ message: "Survey is not currently open for responses" });
      }

      let recipientId: string | undefined;

      if (token) {
        const recipient = await storage.getRecipientByToken(token);
        if (!recipient || recipient.surveyId !== surveyId) {
          return res.status(403).json({ message: "Invalid token for this survey" });
        }

        const existingResponse = await storage.getResponseByRecipient(recipient.id);
        if (existingResponse) {
          return res.status(400).json({
            message: "Response already exists",
            responseId: existingResponse.id
          });
        }

        recipientId = recipient.id;
      }

      const responseData = insertResponseSchema.parse({
        surveyId,
        recipientId: recipientId || null,
        completed: false,
        isAnonymous: false
      });

      const response = await storage.createResponse(responseData);

      res.status(201).json({
        responseId: response.id,
        surveyId: response.surveyId,
        message: "Response created successfully"
      });
    } catch (error) {
      console.error("Error creating response:", error);
      res.status(500).json({ message: "Failed to create response" });
    }
  });

  /**
   * POST /api/surveys/:publicLink/responses
   * Create a new anonymous response using the survey's public link
   */
  app.post('/api/surveys/:publicLink/responses', async (req, res) => {
    try {
      const { publicLink } = req.params;

      const survey = await storage.getSurveyByPublicLink(publicLink);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (!survey.allowAnonymous) {
        return res.status(403).json({ message: "Anonymous responses are not allowed for this survey" });
      }

      if (survey.status !== 'open') {
        return res.status(400).json({ message: "Survey is not currently open for responses" });
      }

      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                       req.socket.remoteAddress ||
                       'unknown';
      const userAgent = req.get('user-agent') || '';
      const sessionId = req.body.sessionId || `session_${Date.now()}_${Math.random().toString(36)}`;

      if (survey.anonymousAccessType === 'one_per_ip') {
        const canRespond = await storage.checkAnonymousResponseLimit(survey.id, ipAddress, sessionId);
        if (!canRespond) {
          return res.status(429).json({
            message: "Response limit reached",
            error: "You have already responded to this survey from this IP address."
          });
        }
      } else if (survey.anonymousAccessType === 'one_per_session') {
        const canRespond = await storage.checkAnonymousResponseLimit(survey.id, ipAddress, sessionId);
        if (!canRespond) {
          return res.status(429).json({
            message: "Response limit reached",
            error: "You have already responded to this survey in this session."
          });
        }
      }

      const anonymousMetadata = {
        browserInfo: {
          userAgent,
          language: req.get('accept-language') || 'unknown',
          timezone: req.body.timezone || 'unknown'
        },
        deviceInfo: {
          isMobile: /Mobile|Android|iPhone|iPad/i.test(userAgent),
          screenResolution: req.body.screenResolution || 'unknown'
        },
        accessInfo: {
          referrer: req.get('referer'),
          entryTime: Date.now()
        }
      };

      const response = await storage.createAnonymousResponse({
        surveyId: survey.id,
        ipAddress,
        userAgent,
        sessionId,
        anonymousMetadata
      });

      await storage.createAnonymousResponseTracking({
        surveyId: survey.id,
        ipAddress,
        sessionId,
        responseId: response.id
      });

      res.status(201).json({
        responseId: response.id,
        surveyId: response.surveyId,
        sessionId,
        message: "Anonymous response created successfully"
      });
    } catch (error) {
      console.error("Error creating anonymous response:", error);
      res.status(500).json({ message: "Failed to create anonymous response" });
    }
  });

  // ============================================================================
  // Answer Submission Routes
  // ============================================================================

  /**
   * POST /api/responses/:responseId/answers
   * Submit or update an answer for a specific question
   */
  app.post('/api/responses/:responseId/answers', async (req, res) => {
    try {
      const { responseId } = req.params;
      const { questionId, subquestionId, loopIndex, value } = req.body;

      if (!questionId || value === undefined) {
        return res.status(400).json({
          message: "questionId and value are required"
        });
      }

      const response = await storage.getResponse(responseId);
      if (!response) {
        return res.status(404).json({ message: "Response not found" });
      }

      if (response.completed) {
        return res.status(400).json({
          message: "Cannot modify a completed response"
        });
      }

      const survey = await storage.getSurvey(response.surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const page = await storage.getSurveyPage(question.pageId);
      if (!page || page.surveyId !== survey.id) {
        return res.status(400).json({
          message: "Question does not belong to this survey"
        });
      }

      if (subquestionId) {
        const subquestion = await storage.getLoopGroupSubquestion(subquestionId);
        if (!subquestion || subquestion.loopQuestionId !== questionId) {
          return res.status(400).json({
            message: "Invalid subquestion for this question"
          });
        }
      }

      const existingAnswers = await storage.getAnswersByResponse(responseId);
      const existingAnswer = existingAnswers.find(a =>
        a.questionId === questionId &&
        a.subquestionId === (subquestionId || null) &&
        a.loopIndex === (loopIndex || null)
      );

      let answer;
      if (existingAnswer) {
        answer = await storage.updateAnswer(existingAnswer.id, { value });
      } else {
        const answerData = insertAnswerSchema.parse({
          responseId,
          questionId,
          subquestionId: subquestionId || null,
          loopIndex: loopIndex || null,
          value
        });
        answer = await storage.createAnswer(answerData);
      }

      res.status(200).json({
        answer,
        message: existingAnswer ? "Answer updated successfully" : "Answer created successfully"
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ message: "Failed to submit answer" });
    }
  });

  /**
   * PUT /api/responses/:responseId/complete
   * Mark a response as complete with validation
   */
  app.put('/api/responses/:responseId/complete', async (req, res) => {
    try {
      const { responseId } = req.params;

      const response = await storage.getResponse(responseId);
      if (!response) {
        return res.status(404).json({ message: "Response not found" });
      }

      if (response.completed) {
        return res.status(400).json({
          message: "Response is already completed",
          submittedAt: response.submittedAt
        });
      }

      const survey = await storage.getSurvey(response.surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      const pages = await storage.getSurveyPages(survey.id);
      const conditionalRules = await storage.getConditionalRulesBySurvey(survey.id);
      const answers = await storage.getAnswersByResponse(responseId);

      const answersMap: Record<string, any> = {};
      answers.forEach(answer => {
        answersMap[answer.questionId] = answer.value;
      });

      // Note: Import conditional logic evaluator if available
      // For now, we'll do basic required field validation
      const missingRequired: string[] = [];

      for (const page of pages) {
        const questions = await storage.getQuestionsWithSubquestionsByPage(page.id);

        for (const question of questions) {
          // Basic required check (conditional logic would go here)
          if (question.required) {
            const hasAnswer = answers.some(a => a.questionId === question.id);
            if (!hasAnswer) {
              missingRequired.push(question.title);
            }
          }
        }
      }

      if (missingRequired.length > 0) {
        return res.status(400).json({
          message: "Missing required questions",
          missingQuestions: missingRequired,
          count: missingRequired.length
        });
      }

      const updatedResponse = await storage.updateResponse(responseId, {
        completed: true,
        submittedAt: new Date()
      });

      res.status(200).json({
        response: updatedResponse,
        message: "Response completed successfully"
      });
    } catch (error) {
      console.error("Error completing response:", error);
      res.status(500).json({ message: "Failed to complete response" });
    }
  });

  // ============================================================================
  // Response Viewing Routes (Creator Access)
  // ============================================================================

  /**
   * GET /api/surveys/:surveyId/responses
   * List all responses for a survey (creator only)
   */
  app.get('/api/surveys/:surveyId/responses', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const responses = await storage.getResponsesBySurvey(req.params.surveyId);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  /**
   * GET /api/responses/:id
   * Get a single response with all answers (creator only)
   */
  app.get('/api/responses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const response = await storage.getResponse(req.params.id);
      if (!response) {
        return res.status(404).json({ message: "Response not found" });
      }

      const survey = await storage.getSurvey(response.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const answersWithQuestions = await storage.getAnswersWithQuestionsByResponse(req.params.id);
      const recipient = response.recipientId ? await storage.getRecipient(response.recipientId) : null;

      res.json({ response, answers: answersWithQuestions, recipient });
    } catch (error) {
      console.error("Error fetching response:", error);
      res.status(500).json({ message: "Failed to fetch response" });
    }
  });
}
