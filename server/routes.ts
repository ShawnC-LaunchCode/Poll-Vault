import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertSurveySchema, insertSurveyPageSchema, insertQuestionSchema, insertLoopGroupSubquestionSchema, insertConditionalRuleSchema, insertRecipientSchema, insertResponseSchema, insertAnswerSchema } from "@shared/schema";
import { sendNotificationEmail } from "./services/emailService";
import { upload, isFileTypeAccepted, deleteFile, getFilePath, fileExists } from "./services/fileService";
import path from "path";
import fs from "fs";

// Helper function to get expected MIME type from file extension
function getMimeTypeFromExtension(ext: string): string | null {
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.csv': 'text/csv'
  };
  return mimeMap[ext.toLowerCase()] || null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Rate limiting for file uploads
  const uploadRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 file upload requests per windowMs
    message: {
      success: false,
      errors: ['Too many file upload attempts, please try again later.']
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Survey routes
  app.post('/api/surveys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const surveyData = insertSurveySchema.parse({ ...req.body, creatorId: userId });
      const survey = await storage.createSurvey(surveyData);
      res.json(survey);
    } catch (error) {
      console.error("Error creating survey:", error);
      res.status(500).json({ message: "Failed to create survey" });
    }
  });

  app.get('/api/surveys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const surveys = await storage.getSurveysByCreator(userId);
      res.json(surveys);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ message: "Failed to fetch surveys" });
    }
  });

  app.get('/api/surveys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      // Check if user owns this survey
      if (survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(survey);
    } catch (error) {
      console.error("Error fetching survey:", error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  app.put('/api/surveys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      if (survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updates = insertSurveySchema.partial().parse(req.body);
      const updatedSurvey = await storage.updateSurvey(req.params.id, updates);
      res.json(updatedSurvey);
    } catch (error) {
      console.error("Error updating survey:", error);
      res.status(500).json({ message: "Failed to update survey" });
    }
  });

  app.delete('/api/surveys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      if (survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteSurvey(req.params.id);
      res.json({ message: "Survey deleted successfully" });
    } catch (error) {
      console.error("Error deleting survey:", error);
      res.status(500).json({ message: "Failed to delete survey" });
    }
  });

  // Survey pages routes
  app.post('/api/surveys/:surveyId/pages', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const pageData = insertSurveyPageSchema.parse({ ...req.body, surveyId: req.params.surveyId });
      const page = await storage.createSurveyPage(pageData);
      res.json(page);
    } catch (error) {
      console.error("Error creating page:", error);
      res.status(500).json({ message: "Failed to create page" });
    }
  });

  app.get('/api/surveys/:surveyId/pages', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const pages = await storage.getSurveyPages(req.params.surveyId);
      res.json(pages);
    } catch (error) {
      console.error("Error fetching pages:", error);
      res.status(500).json({ message: "Failed to fetch pages" });
    }
  });

  // Questions routes
  app.post('/api/pages/:pageId/questions', isAuthenticated, async (req: any, res) => {
    try {
      // First, verify that the page belongs to a survey owned by the authenticated user
      const page = await storage.getSurveyPage(req.params.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      const survey = await storage.getSurvey(page.surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      if (survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const questionData = insertQuestionSchema.parse({ ...req.body, pageId: req.params.pageId });
      const question = await storage.createQuestion(questionData);
      res.json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  app.get('/api/pages/:pageId/questions', isAuthenticated, async (req: any, res) => {
    try {
      // First, verify that the page belongs to a survey owned by the authenticated user
      const page = await storage.getSurveyPage(req.params.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      const survey = await storage.getSurvey(page.surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      if (survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Use the new method that includes subquestions for loop groups
      const questions = await storage.getQuestionsWithSubquestionsByPage(req.params.pageId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  // Loop group subquestion routes
  app.post('/api/questions/:questionId/subquestions', isAuthenticated, async (req: any, res) => {
    try {
      // First, verify that the question belongs to a survey owned by the authenticated user
      const question = await storage.getQuestion(req.params.questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const page = await storage.getSurveyPage(question.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      const survey = await storage.getSurvey(page.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Verify this is a loop group question
      if (question.type !== 'loop_group') {
        return res.status(400).json({ message: "Question is not a loop group" });
      }
      
      const subquestionData = insertLoopGroupSubquestionSchema.parse({ 
        ...req.body, 
        loopQuestionId: req.params.questionId 
      });
      const subquestion = await storage.createLoopGroupSubquestion(subquestionData);
      res.json(subquestion);
    } catch (error) {
      console.error("Error creating subquestion:", error);
      res.status(500).json({ message: "Failed to create subquestion" });
    }
  });

  app.get('/api/questions/:questionId/subquestions', isAuthenticated, async (req: any, res) => {
    try {
      // First, verify that the question belongs to a survey owned by the authenticated user
      const question = await storage.getQuestion(req.params.questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const page = await storage.getSurveyPage(question.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      const survey = await storage.getSurvey(page.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const subquestions = await storage.getLoopGroupSubquestions(req.params.questionId);
      res.json(subquestions);
    } catch (error) {
      console.error("Error fetching subquestions:", error);
      res.status(500).json({ message: "Failed to fetch subquestions" });
    }
  });

  app.put('/api/subquestions/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Verify access through the loop question
      const subquestion = await storage.getLoopGroupSubquestion(req.params.id);
      if (!subquestion) {
        return res.status(404).json({ message: "Subquestion not found" });
      }
      
      const question = await storage.getQuestion(subquestion.loopQuestionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const page = await storage.getSurveyPage(question.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      const survey = await storage.getSurvey(page.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updates = insertLoopGroupSubquestionSchema.partial().parse(req.body);
      const updatedSubquestion = await storage.updateLoopGroupSubquestion(req.params.id, updates);
      res.json(updatedSubquestion);
    } catch (error) {
      console.error("Error updating subquestion:", error);
      res.status(500).json({ message: "Failed to update subquestion" });
    }
  });

  app.delete('/api/subquestions/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Verify access through the loop question
      const subquestion = await storage.getLoopGroupSubquestion(req.params.id);
      if (!subquestion) {
        return res.status(404).json({ message: "Subquestion not found" });
      }
      
      const question = await storage.getQuestion(subquestion.loopQuestionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const page = await storage.getSurveyPage(question.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      const survey = await storage.getSurvey(page.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteLoopGroupSubquestion(req.params.id);
      res.json({ message: "Subquestion deleted successfully" });
    } catch (error) {
      console.error("Error deleting subquestion:", error);
      res.status(500).json({ message: "Failed to delete subquestion" });
    }
  });

  // Conditional rules routes
  app.post('/api/surveys/:surveyId/conditional-rules', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const ruleData = insertConditionalRuleSchema.parse({ ...req.body, surveyId: req.params.surveyId });
      const rule = await storage.createConditionalRule(ruleData);
      res.json(rule);
    } catch (error) {
      console.error("Error creating conditional rule:", error);
      res.status(500).json({ message: "Failed to create conditional rule" });
    }
  });

  app.get('/api/surveys/:surveyId/conditional-rules', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const rules = await storage.getConditionalRulesBySurvey(req.params.surveyId);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching conditional rules:", error);
      res.status(500).json({ message: "Failed to fetch conditional rules" });
    }
  });

  app.get('/api/questions/:questionId/conditional-rules', isAuthenticated, async (req: any, res) => {
    try {
      // Verify access through the question
      const question = await storage.getQuestion(req.params.questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const page = await storage.getSurveyPage(question.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      const survey = await storage.getSurvey(page.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const rules = await storage.getConditionalRulesByQuestion(req.params.questionId);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching conditional rules:", error);
      res.status(500).json({ message: "Failed to fetch conditional rules" });
    }
  });

  app.put('/api/conditional-rules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const rule = await storage.getConditionalRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ message: "Conditional rule not found" });
      }
      
      // Verify access through the survey
      const survey = await storage.getSurvey(rule.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updates = insertConditionalRuleSchema.partial().parse(req.body);
      const updatedRule = await storage.updateConditionalRule(req.params.id, updates);
      res.json(updatedRule);
    } catch (error) {
      console.error("Error updating conditional rule:", error);
      res.status(500).json({ message: "Failed to update conditional rule" });
    }
  });

  app.delete('/api/conditional-rules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const rule = await storage.getConditionalRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ message: "Conditional rule not found" });
      }
      
      // Verify access through the survey
      const survey = await storage.getSurvey(rule.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteConditionalRule(req.params.id);
      res.json({ message: "Conditional rule deleted successfully" });
    } catch (error) {
      console.error("Error deleting conditional rule:", error);
      res.status(500).json({ message: "Failed to delete conditional rule" });
    }
  });

  // Recipients routes
  app.post('/api/surveys/:surveyId/recipients', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const recipientData = insertRecipientSchema.parse({ ...req.body, surveyId: req.params.surveyId });
      const recipient = await storage.createRecipient(recipientData);
      res.json(recipient);
    } catch (error) {
      console.error("Error creating recipient:", error);
      res.status(500).json({ message: "Failed to create recipient" });
    }
  });

  app.get('/api/surveys/:surveyId/recipients', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const recipients = await storage.getRecipientsBySurvey(req.params.surveyId);
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      res.status(500).json({ message: "Failed to fetch recipients" });
    }
  });

  // Start response endpoint (public, token-based)
  app.post('/api/survey/:token/start-response', async (req, res) => {
    try {
      const recipient = await storage.getRecipientByToken(req.params.token);
      if (!recipient) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      const survey = await storage.getSurvey(recipient.surveyId);
      if (!survey || survey.status !== 'open') {
        return res.status(404).json({ message: "Survey not available" });
      }
      
      // Check if recipient has already started a response
      let existingResponse = await storage.getResponseByRecipient(recipient.id);
      if (existingResponse) {
        return res.json({ responseId: existingResponse.id });
      }
      
      // Create new response
      const responseData = insertResponseSchema.parse({
        surveyId: recipient.surveyId,
        recipientId: recipient.id,
        completed: false // Not completed yet
      });
      
      const response = await storage.createResponse(responseData);
      res.json({ responseId: response.id });
    } catch (error) {
      console.error("Error starting response:", error);
      res.status(500).json({ message: "Failed to start response" });
    }
  });

  // Survey response routes (public, token-based)
  app.get('/api/survey/:token', async (req, res) => {
    try {
      const recipient = await storage.getRecipientByToken(req.params.token);
      if (!recipient) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      const survey = await storage.getSurvey(recipient.surveyId);
      if (!survey || survey.status !== 'open') {
        return res.status(404).json({ message: "Survey not available" });
      }
      
      // Check if recipient has already submitted a response
      const existingResponse = await storage.getResponseByRecipient(recipient.id);
      if (existingResponse) {
        return res.json({ 
          survey, 
          recipient, 
          alreadyCompleted: true,
          submittedAt: existingResponse.submittedAt
        });
      }
      
      const pages = await storage.getSurveyPages(recipient.surveyId);
      const surveyData = { survey, pages, recipient, alreadyCompleted: false };
      
      // Get questions for each page, including subquestions for loop groups
      for (const page of pages) {
        (page as any).questions = await storage.getQuestionsWithSubquestionsByPage(page.id);
      }
      
      res.json(surveyData);
    } catch (error) {
      console.error("Error fetching survey:", error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  // Create individual answer endpoint (requires authentication)
  app.post('/api/answers', isAuthenticated, async (req: any, res) => {
    try {
      const { responseId, questionId, subquestionId, loopIndex, value } = req.body;
      
      if (!responseId || !questionId || !value) {
        return res.status(400).json({ message: "responseId, questionId, and value are required" });
      }
      
      // Verify ownership through response -> survey -> creator/recipient chain
      const response = await storage.getResponse(responseId);
      if (!response) {
        return res.status(404).json({ message: "Response not found" });
      }
      
      const survey = await storage.getSurvey(response.surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      // Check if user is survey creator or the recipient
      const userId = req.user.claims.sub;
      const recipient = await storage.getRecipient(response.recipientId);
      const isCreator = survey.creatorId === userId;
      const isRecipient = recipient && recipient.email === req.user.claims.email;
      
      if (!isCreator && !isRecipient) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const answerData = insertAnswerSchema.parse({
        responseId,
        questionId,
        subquestionId,
        loopIndex,
        value
      });
      
      const answer = await storage.createAnswer(answerData);
      res.json(answer);
    } catch (error) {
      console.error("Error creating answer:", error);
      res.status(500).json({ message: "Failed to create answer" });
    }
  });

  app.post('/api/survey/:token/response', async (req, res) => {
    try {
      const recipient = await storage.getRecipientByToken(req.params.token);
      if (!recipient) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      // Check if recipient has already submitted a response
      const existingResponse = await storage.getResponseByRecipient(recipient.id);
      if (existingResponse) {
        return res.status(400).json({ 
          message: "Response already submitted",
          alreadyCompleted: true,
          submittedAt: existingResponse.submittedAt
        });
      }
      
      const responseData = insertResponseSchema.parse({
        surveyId: recipient.surveyId,
        recipientId: recipient.id,
        completed: true,
        submittedAt: new Date()
      });
      
      const response = await storage.createResponse(responseData);
      
      // Save answers
      const { answers } = req.body;
      if (answers && Array.isArray(answers)) {
        for (const answerData of answers) {
          const answer = insertAnswerSchema.parse({
            ...answerData,
            responseId: response.id
          });
          await storage.createAnswer(answer);
        }
      }
      
      // Send notification email to creator
      const survey = await storage.getSurvey(recipient.surveyId);
      if (survey) {
        const creator = await storage.getUser(survey.creatorId);
        if (creator && creator.email) {
          await sendNotificationEmail(
            creator.email,
            survey.title,
            recipient.name,
            `${process.env.REPLIT_DOMAINS?.split(',')[0]}/responses/${response.id}`
          );
        }
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error submitting response:", error);
      res.status(500).json({ message: "Failed to submit response" });
    }
  });

  // Responses routes
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
      const recipient = await storage.getRecipient(response.recipientId);
      
      res.json({ response, answers: answersWithQuestions, recipient });
    } catch (error) {
      console.error("Error fetching response:", error);
      res.status(500).json({ message: "Failed to fetch response" });
    }
  });

  // Enhanced dashboard analytics
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/dashboard/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analytics = await storage.getSurveyAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching survey analytics:", error);
      res.status(500).json({ message: "Failed to fetch survey analytics" });
    }
  });

  app.get('/api/dashboard/trends', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const days = parseInt(req.query.days as string) || 30;
      const trends = await storage.getResponseTrends(userId, days);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching response trends:", error);
      res.status(500).json({ message: "Failed to fetch response trends" });
    }
  });

  app.get('/api/dashboard/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await storage.getRecentActivity(userId, limit);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Bulk operations
  app.post('/api/surveys/bulk/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { surveyIds, status } = req.body;
      
      if (!Array.isArray(surveyIds) || !status) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      const result = await storage.bulkUpdateSurveyStatus(surveyIds, status, userId);
      res.json(result);
    } catch (error) {
      console.error("Error in bulk status update:", error);
      res.status(500).json({ message: "Failed to update survey statuses" });
    }
  });

  app.post('/api/surveys/bulk/delete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { surveyIds } = req.body;
      
      if (!Array.isArray(surveyIds)) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      const result = await storage.bulkDeleteSurveys(surveyIds, userId);
      res.json(result);
    } catch (error) {
      console.error("Error in bulk delete:", error);
      res.status(500).json({ message: "Failed to delete surveys" });
    }
  });

  // Survey management
  app.post('/api/surveys/:id/duplicate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const surveyId = req.params.id;
      const { title } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      const duplicatedSurvey = await storage.duplicateSurvey(surveyId, title, userId);
      res.json(duplicatedSurvey);
    } catch (error) {
      console.error("Error duplicating survey:", error);
      res.status(500).json({ message: "Failed to duplicate survey" });
    }
  });

  app.post('/api/surveys/:id/archive', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const surveyId = req.params.id;

      const archivedSurvey = await storage.archiveSurvey(surveyId, userId);
      res.json(archivedSurvey);
    } catch (error) {
      console.error("Error archiving survey:", error);
      res.status(500).json({ message: "Failed to archive survey" });
    }
  });

  // File upload routes with authentication and authorization
  app.post('/api/upload', uploadRateLimit, isAuthenticated, upload.array('files', 5), async (req: any, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, errors: ['No files provided'] });
      }

      const { answerId } = req.body;
      if (!answerId) {
        return res.status(400).json({ success: false, errors: ['Answer ID is required'] });
      }

      // Verify ownership through answerId -> response -> survey -> creator chain
      const answer = await storage.getAnswer(answerId);
      if (!answer) {
        return res.status(404).json({ success: false, errors: ['Answer not found'] });
      }

      const response = await storage.getResponse(answer.responseId);
      if (!response) {
        return res.status(404).json({ success: false, errors: ['Response not found'] });
      }

      const survey = await storage.getSurvey(response.surveyId);
      if (!survey) {
        return res.status(404).json({ success: false, errors: ['Survey not found'] });
      }

      // Check if user is survey creator or the recipient
      const userId = req.user.claims.sub;
      const recipient = await storage.getRecipient(response.recipientId);
      const isCreator = survey.creatorId === userId;
      const isRecipient = recipient && recipient.email === req.user.claims.email;
      
      if (!isCreator && !isRecipient) {
        return res.status(403).json({ success: false, errors: ['Access denied'] });
      }

      // Get question config from database for server-side validation
      const question = await storage.getQuestion(answer.questionId);
      if (!question || question.type !== 'file_upload') {
        return res.status(400).json({ success: false, errors: ['Invalid question for file upload'] });
      }

      const config = question.options as any; // This should contain FileUploadConfig
      if (!config) {
        return res.status(400).json({ success: false, errors: ['No file upload configuration found'] });
      }

      // Check if files are required but none provided
      if (config.required && req.files.length === 0) {
        return res.status(400).json({ success: false, errors: ['Files are required for this question'] });
      }

      // Check existing files count to enforce maxFiles limit
      const existingFiles = await storage.getFilesByAnswer(answerId);
      const totalFiles = existingFiles.length + req.files.length;
      if (config.maxFiles && totalFiles > config.maxFiles) {
        return res.status(400).json({ 
          success: false, 
          errors: [`Cannot upload ${req.files.length} files. Maximum ${config.maxFiles} files allowed, you already have ${existingFiles.length} files.`] 
        });
      }

      const uploadedFiles = [];
      const errors = [];

      for (const file of req.files as Express.Multer.File[]) {
        try {
          // Validate file type against question config (server-side validation)
          if (config.acceptedTypes && config.acceptedTypes.length > 0 && !isFileTypeAccepted(file.mimetype, config.acceptedTypes)) {
            errors.push(`File type ${file.mimetype} not allowed for ${file.originalname}`);
            await deleteFile(file.filename); // Clean up uploaded file
            continue;
          }

          // Validate file size against question config (server-side validation)
          if (config.maxFileSize && file.size > config.maxFileSize) {
            errors.push(`File ${file.originalname} exceeds maximum size limit of ${Math.round(config.maxFileSize / 1024 / 1024)}MB`);
            await deleteFile(file.filename); // Clean up uploaded file
            continue;
          }

          // Additional security: check file extension matches MIME type
          const ext = path.extname(file.originalname).toLowerCase();
          const expectedMimeType = getMimeTypeFromExtension(ext);
          if (expectedMimeType && expectedMimeType !== file.mimetype) {
            errors.push(`File ${file.originalname} has mismatched extension and content type`);
            await deleteFile(file.filename); // Clean up uploaded file
            continue;
          }

          // Store file metadata in database
          const fileMetadata = await storage.createFile({
            answerId,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size
          });

          uploadedFiles.push(fileMetadata);
        } catch (error) {
          console.error('Error processing file:', error);
          errors.push(`Error processing ${file.originalname}: ${error.message}`);
        }
      }

      res.json({
        success: uploadedFiles.length > 0,
        files: uploadedFiles,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ success: false, errors: ['Failed to upload files'] });
    }
  });

  // File download route with authentication and access control
  app.get('/api/files/:fileId/download', isAuthenticated, async (req, res) => {
    try {
      const fileId = req.params.fileId;
      const fileMetadata = await storage.getFile(fileId);
      
      if (!fileMetadata) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Verify ownership through file -> answer -> response -> survey -> creator/recipient chain
      const answer = await storage.getAnswer(fileMetadata.answerId);
      if (!answer) {
        return res.status(404).json({ message: 'Associated answer not found' });
      }

      const response = await storage.getResponse(answer.responseId);
      if (!response) {
        return res.status(404).json({ message: 'Associated response not found' });
      }

      const survey = await storage.getSurvey(response.surveyId);
      if (!survey) {
        return res.status(404).json({ message: 'Associated survey not found' });
      }

      // Check if user is survey creator or the recipient
      const userId = req.user.claims.sub;
      const recipient = await storage.getRecipient(response.recipientId);
      const isCreator = survey.creatorId === userId;
      const isRecipient = recipient && recipient.email === req.user.claims.email;
      
      if (!isCreator && !isRecipient) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const filePath = getFilePath(fileMetadata.filename);
      
      if (!(await fileExists(fileMetadata.filename))) {
        return res.status(404).json({ message: 'File not found on disk' });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', fileMetadata.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.originalName}"`);
      res.setHeader('Content-Length', fileMetadata.size.toString());

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Get files by answer ID with authentication and access control
  app.get('/api/answers/:answerId/files', isAuthenticated, async (req, res) => {
    try {
      const answerId = req.params.answerId;
      
      // Verify ownership through answerId -> response -> survey -> creator/recipient chain
      const answer = await storage.getAnswer(answerId);
      if (!answer) {
        return res.status(404).json({ message: 'Answer not found' });
      }

      const response = await storage.getResponse(answer.responseId);
      if (!response) {
        return res.status(404).json({ message: 'Response not found' });
      }

      const survey = await storage.getSurvey(response.surveyId);
      if (!survey) {
        return res.status(404).json({ message: 'Survey not found' });
      }

      // Check if user is survey creator or the recipient
      const userId = req.user.claims.sub;
      const recipient = await storage.getRecipient(response.recipientId);
      const isCreator = survey.creatorId === userId;
      const isRecipient = recipient && recipient.email === req.user.claims.email;
      
      if (!isCreator && !isRecipient) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const files = await storage.getFilesByAnswer(answerId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  // Delete file route with authentication and access control
  app.delete('/api/files/:fileId', isAuthenticated, async (req, res) => {
    try {
      const fileId = req.params.fileId;
      const fileMetadata = await storage.getFile(fileId);
      
      if (!fileMetadata) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Verify ownership through file -> answer -> response -> survey -> creator/recipient chain
      const answer = await storage.getAnswer(fileMetadata.answerId);
      if (!answer) {
        return res.status(404).json({ message: 'Associated answer not found' });
      }

      const response = await storage.getResponse(answer.responseId);
      if (!response) {
        return res.status(404).json({ message: 'Associated response not found' });
      }

      const survey = await storage.getSurvey(response.surveyId);
      if (!survey) {
        return res.status(404).json({ message: 'Associated survey not found' });
      }

      // Check if user is survey creator or the recipient
      const userId = req.user.claims.sub;
      const recipient = await storage.getRecipient(response.recipientId);
      const isCreator = survey.creatorId === userId;
      const isRecipient = recipient && recipient.email === req.user.claims.email;
      
      if (!isCreator && !isRecipient) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Delete file from filesystem
      await deleteFile(fileMetadata.filename);
      
      // Delete file metadata from database
      await storage.deleteFile(fileId);
      
      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
