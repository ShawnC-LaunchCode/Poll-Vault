import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertSurveySchema, insertSurveyPageSchema, insertQuestionSchema, insertRecipientSchema, insertResponseSchema, insertAnswerSchema } from "@shared/schema";
import { sendNotificationEmail } from "./services/emailService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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
      
      const questions = await storage.getQuestionsByPage(req.params.pageId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
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
      
      const pages = await storage.getSurveyPages(recipient.surveyId);
      const surveyData = { survey, pages, recipient };
      
      // Get questions for each page
      for (const page of pages) {
        (page as any).questions = await storage.getQuestionsByPage(page.id);
      }
      
      res.json(surveyData);
    } catch (error) {
      console.error("Error fetching survey:", error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  app.post('/api/survey/:token/response', async (req, res) => {
    try {
      const recipient = await storage.getRecipientByToken(req.params.token);
      if (!recipient) {
        return res.status(404).json({ message: "Survey not found" });
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
      
      const answers = await storage.getAnswersByResponse(req.params.id);
      const recipient = await storage.getRecipient(response.recipientId);
      
      res.json({ response, answers, recipient });
    } catch (error) {
      console.error("Error fetching response:", error);
      res.status(500).json({ message: "Failed to fetch response" });
    }
  });

  // Dashboard stats
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

  const httpServer = createServer(app);
  return httpServer;
}
