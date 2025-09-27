import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";

// Extend Express Request type for authenticated requests
declare global {
  namespace Express {
    interface User {
      claims: {
        sub: string;
        email: string;
        [key: string]: any;
      };
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    }
  }
}
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertSurveySchema, insertSurveyPageSchema, insertQuestionSchema, insertLoopGroupSubquestionSchema, insertConditionalRuleSchema, insertRecipientSchema, insertGlobalRecipientSchema, insertResponseSchema, insertAnswerSchema, insertAnalyticsEventSchema } from "@shared/schema";
import { sendNotificationEmail } from "./services/emailService";
import { sendSurveyInvitation } from "./services/sendgrid";
import { upload, isFileTypeAccepted, deleteFile, getFilePath, fileExists } from "./services/fileService";
import { exportService, type ExportOptions } from "./services/exportService";
import path from "path";
import fs from "fs";
import { z } from "zod";

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

  // Rate limiting for analytics events
  const analyticsRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 analytics events per minute
    message: {
      success: false,
      errors: ['Too many analytics events, please slow down.']
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Development authentication helper (only for testing in development)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/auth/dev-login', async (req, res) => {
      try {
        // Create a test user for development
        const testUser = {
          id: "dev-user-123",
          email: "dev@example.com",
          firstName: "Dev",
          lastName: "User",
          profileImageUrl: null,
        };
        
        // Upsert the test user
        await storage.upsertUser(testUser);
        
        // Simulate authentication by setting up the session
        const mockAuthUser = {
          claims: {
            sub: testUser.id,
            email: testUser.email,
            first_name: testUser.firstName,
            last_name: testUser.lastName,
            exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
          },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          access_token: "dev-token",
          refresh_token: "dev-refresh-token"
        };
        
        // Set up the session
        req.login(mockAuthUser, (err) => {
          if (err) {
            console.error("Dev login error:", err);
            return res.status(500).json({ message: "Failed to create dev session" });
          }
          res.json({ message: "Development authentication successful", user: testUser });
        });
      } catch (error) {
        console.error("Dev login error:", error);
        res.status(500).json({ message: "Failed to authenticate in dev mode" });
      }
    });
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }
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
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }
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
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }
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

  // Send survey invitations endpoint
  app.post('/api/surveys/:surveyId/send-invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      // Validate that user owns the survey
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      if (survey.creatorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate request body
      const { recipientIds } = req.body;
      if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
        return res.status(400).json({ message: "Recipient IDs are required" });
      }

      // Get recipients to send invitations to
      const allRecipients = await storage.getRecipientsBySurvey(req.params.surveyId);
      const recipientsToInvite = allRecipients.filter(recipient => recipientIds.includes(recipient.id));
      
      if (recipientsToInvite.length === 0) {
        return res.status(400).json({ message: "No valid recipients found" });
      }

      // Get user information for the email
      const user = await storage.getUser(userId);
      const creatorName = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;
      
      // Use environment variable for from email or default
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@pollvault.com';

      // Send invitations and track results
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const recipient of recipientsToInvite) {
        try {
          // Generate survey URL with recipient token
          const surveyUrl = `${process.env.CLIENT_URL || 'http://localhost:5000'}/survey/${survey.id}?token=${recipient.token}`;
          
          // Send invitation email
          const emailSent = await sendSurveyInvitation({
            recipientName: recipient.name,
            recipientEmail: recipient.email,
            surveyTitle: survey.title,
            surveyUrl: surveyUrl,
            creatorName: creatorName
          }, fromEmail);

          if (emailSent) {
            // Update recipient sentAt timestamp
            await storage.updateRecipient(recipient.id, { sentAt: new Date() });
            successCount++;
            results.push({
              recipientId: recipient.id,
              email: recipient.email,
              status: 'sent',
              message: 'Invitation sent successfully'
            });
          } else {
            errorCount++;
            results.push({
              recipientId: recipient.id,
              email: recipient.email,
              status: 'failed',
              message: 'Failed to send invitation'
            });
          }
        } catch (error) {
          console.error(`Error sending invitation to ${recipient.email}:`, error);
          errorCount++;
          results.push({
            recipientId: recipient.id,
            email: recipient.email,
            status: 'failed',
            message: 'Error sending invitation'
          });
        }
      }

      // Return comprehensive response
      res.json({
        success: errorCount === 0,
        message: `${successCount} invitation(s) sent successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        results: results,
        stats: {
          total: recipientsToInvite.length,
          sent: successCount,
          failed: errorCount
        }
      });

    } catch (error) {
      console.error("Error sending survey invitations:", error);
      res.status(500).json({ message: "Failed to send survey invitations" });
    }
  });

  // Global recipient routes
  app.post('/api/recipients/global', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }
      
      // Check for duplicate email within creator's global recipients
      const existingRecipient = await storage.getGlobalRecipientByCreatorAndEmail(userId, req.body.email);
      if (existingRecipient) {
        return res.status(409).json({ message: "Email already exists in your global recipient list" });
      }
      
      const globalRecipientData = insertGlobalRecipientSchema.parse({ ...req.body, creatorId: userId });
      const globalRecipient = await storage.createGlobalRecipient(globalRecipientData);
      res.json(globalRecipient);
    } catch (error) {
      console.error("Error creating global recipient:", error);
      res.status(500).json({ message: "Failed to create global recipient" });
    }
  });

  app.get('/api/recipients/global', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }
      
      const globalRecipients = await storage.getGlobalRecipientsByCreator(userId);
      res.json(globalRecipients);
    } catch (error) {
      console.error("Error fetching global recipients:", error);
      res.status(500).json({ message: "Failed to fetch global recipients" });
    }
  });

  app.get('/api/recipients/global/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }
      
      const globalRecipient = await storage.getGlobalRecipient(req.params.id);
      if (!globalRecipient) {
        return res.status(404).json({ message: "Global recipient not found" });
      }
      
      // Check if user owns this global recipient
      if (globalRecipient.creatorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(globalRecipient);
    } catch (error) {
      console.error("Error fetching global recipient:", error);
      res.status(500).json({ message: "Failed to fetch global recipient" });
    }
  });

  app.put('/api/recipients/global/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }
      
      const globalRecipient = await storage.getGlobalRecipient(req.params.id);
      if (!globalRecipient) {
        return res.status(404).json({ message: "Global recipient not found" });
      }
      
      // Check if user owns this global recipient
      if (globalRecipient.creatorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // If email is being updated, check for duplicates
      if (req.body.email && req.body.email !== globalRecipient.email) {
        const existingRecipient = await storage.getGlobalRecipientByCreatorAndEmail(userId, req.body.email);
        if (existingRecipient && existingRecipient.id !== req.params.id) {
          return res.status(409).json({ message: "Email already exists in your global recipient list" });
        }
      }
      
      const updates = insertGlobalRecipientSchema.partial().parse(req.body);
      const updatedGlobalRecipient = await storage.updateGlobalRecipient(req.params.id, updates);
      res.json(updatedGlobalRecipient);
    } catch (error) {
      console.error("Error updating global recipient:", error);
      res.status(500).json({ message: "Failed to update global recipient" });
    }
  });

  app.delete('/api/recipients/global/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }
      
      const globalRecipient = await storage.getGlobalRecipient(req.params.id);
      if (!globalRecipient) {
        return res.status(404).json({ message: "Global recipient not found" });
      }
      
      // Check if user owns this global recipient
      if (globalRecipient.creatorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteGlobalRecipient(req.params.id);
      res.json({ message: "Global recipient deleted successfully" });
    } catch (error) {
      console.error("Error deleting global recipient:", error);
      res.status(500).json({ message: "Failed to delete global recipient" });
    }
  });

  // Bulk delete global recipients
  app.delete('/api/recipients/global/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }
      
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Recipient IDs are required" });
      }
      
      const result = await storage.bulkDeleteGlobalRecipients(ids, userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error bulk deleting global recipients:", error);
      res.status(500).json({ message: "Failed to bulk delete global recipients" });
    }
  });

  // Bulk add global recipients to survey
  app.post('/api/surveys/:surveyId/recipients/bulk-from-global', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }
      
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { globalRecipientIds } = req.body;
      if (!globalRecipientIds || !Array.isArray(globalRecipientIds) || globalRecipientIds.length === 0) {
        return res.status(400).json({ message: "Global recipient IDs are required" });
      }
      
      const newRecipients = await storage.bulkAddGlobalRecipientsToSurvey(
        req.params.surveyId, 
        globalRecipientIds, 
        userId
      );
      
      res.json({
        message: `Successfully added ${newRecipients.length} recipients to survey`,
        recipients: newRecipients,
        addedCount: newRecipients.length
      });
    } catch (error) {
      console.error("Error bulk adding global recipients to survey:", error);
      if (error.message.includes("All selected recipients are already in this survey")) {
        res.status(409).json({ message: error.message });
      } else if (error.message.includes("No valid global recipients found")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to add recipients to survey" });
      }
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
      const recipient = response.recipientId ? await storage.getRecipient(response.recipientId) : null;
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

  // Anonymous survey configuration routes
  app.post('/api/surveys/:id/anonymous', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      if (survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { accessType, anonymousConfig } = req.body;
      
      const updatedSurvey = await storage.enableAnonymousAccess(req.params.id, {
        accessType,
        anonymousConfig
      });
      
      res.json({
        survey: updatedSurvey,
        publicLink: `${req.protocol}://${req.get('host')}/survey/${updatedSurvey.publicLink}`
      });
    } catch (error) {
      console.error("Error enabling anonymous access:", error);
      res.status(500).json({ message: "Failed to enable anonymous access" });
    }
  });

  app.delete('/api/surveys/:id/anonymous', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      if (survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedSurvey = await storage.disableAnonymousAccess(req.params.id);
      res.json(updatedSurvey);
    } catch (error) {
      console.error("Error disabling anonymous access:", error);
      res.status(500).json({ message: "Failed to disable anonymous access" });
    }
  });

  // Anonymous survey access routes (no authentication required)
  app.get('/api/anonymous-survey/:publicLink', async (req, res) => {
    try {
      const survey = await storage.getSurveyByPublicLink(req.params.publicLink);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      if (!survey.allowAnonymous || survey.status !== 'open') {
        return res.status(404).json({ message: "Survey not available for anonymous access" });
      }
      
      const pages = await storage.getSurveyPages(survey.id);
      
      // Get questions for each page, including subquestions for loop groups
      for (const page of pages) {
        (page as any).questions = await storage.getQuestionsWithSubquestionsByPage(page.id);
      }
      
      const surveyData = {
        survey: {
          ...survey,
          // Don't expose sensitive creator information in anonymous access
          creatorId: undefined
        },
        pages,
        anonymous: true
      };
      
      res.json(surveyData);
    } catch (error) {
      console.error("Error fetching anonymous survey:", error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  app.post('/api/anonymous-survey/:publicLink/start-response', async (req, res) => {
    try {
      const survey = await storage.getSurveyByPublicLink(req.params.publicLink);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      if (!survey.allowAnonymous || survey.status !== 'open') {
        return res.status(404).json({ message: "Survey not available for anonymous access" });
      }
      
      // Get IP address and session info
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent');
      const sessionId = req.body.sessionId || `session_${Date.now()}_${Math.random().toString(36)}`;
      
      // Check if anonymous response is allowed based on survey configuration
      const canRespond = await storage.checkAnonymousResponseLimit(survey.id, ipAddress, sessionId);
      if (!canRespond) {
        return res.status(429).json({ 
          message: "Response limit reached",
          error: "You have already responded to this survey or the response limit has been reached."
        });
      }
      
      // Create anonymous response
      const anonymousMetadata = {
        browserInfo: {
          userAgent,
          language: req.get('accept-language'),
          timezone: req.body.timezone
        },
        deviceInfo: {
          isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent || ''),
          screenResolution: req.body.screenResolution
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
      
      // Create tracking record for response limiting
      await storage.createAnonymousResponseTracking({
        surveyId: survey.id,
        ipAddress,
        sessionId,
        responseId: response.id
      });
      
      res.json({ responseId: response.id, sessionId });
    } catch (error) {
      console.error("Error starting anonymous response:", error);
      res.status(500).json({ message: "Failed to start anonymous response" });
    }
  });

  app.post('/api/anonymous-survey/:publicLink/response', async (req, res) => {
    try {
      const survey = await storage.getSurveyByPublicLink(req.params.publicLink);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      if (!survey.allowAnonymous || survey.status !== 'open') {
        return res.status(404).json({ message: "Survey not available for anonymous access" });
      }
      
      const { responseId, answers } = req.body;
      
      // Verify the response exists and is anonymous
      const response = await storage.getResponse(responseId);
      if (!response || !response.isAnonymous || response.surveyId !== survey.id) {
        return res.status(400).json({ message: "Invalid response" });
      }
      
      // Update response to completed
      const updatedResponse = await storage.updateResponse(responseId, {
        completed: true,
        submittedAt: new Date()
      });
      
      // Save answers
      if (answers && Array.isArray(answers)) {
        for (const answerData of answers) {
          const answer = insertAnswerSchema.parse({
            ...answerData,
            responseId: responseId
          });
          await storage.createAnswer(answer);
        }
      }
      
      // Send notification email to creator (anonymous)
      const creator = await storage.getUser(survey.creatorId);
      if (creator && creator.email) {
        await sendNotificationEmail(
          creator.email,
          survey.title,
          'Anonymous User',
          `${process.env.REPLIT_DOMAINS?.split(',')[0]}/responses/${responseId}`
        );
      }
      
      res.json({
        id: updatedResponse.id,
        message: "Response submitted successfully"
      });
    } catch (error) {
      console.error("Error submitting anonymous response:", error);
      res.status(500).json({ message: "Failed to submit anonymous response" });
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
      const recipient = response.recipientId ? await storage.getRecipient(response.recipientId) : null;
      
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

  // Enhanced Analytics Routes
  app.get('/api/analytics/questions/:surveyId', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const analytics = await storage.getQuestionAnalytics(req.params.surveyId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching question analytics:", error);
      res.status(500).json({ message: "Failed to fetch question analytics" });
    }
  });

  app.get('/api/analytics/pages/:surveyId', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const analytics = await storage.getPageAnalytics(req.params.surveyId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching page analytics:", error);
      res.status(500).json({ message: "Failed to fetch page analytics" });
    }
  });

  app.get('/api/analytics/funnel/:surveyId', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const funnelData = await storage.getCompletionFunnelData(req.params.surveyId);
      res.json(funnelData);
    } catch (error) {
      console.error("Error fetching funnel data:", error);
      res.status(500).json({ message: "Failed to fetch funnel data" });
    }
  });

  app.get('/api/analytics/time-spent/:surveyId', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const timeData = await storage.getTimeSpentData(req.params.surveyId);
      res.json(timeData);
    } catch (error) {
      console.error("Error fetching time spent data:", error);
      res.status(500).json({ message: "Failed to fetch time spent data" });
    }
  });

  app.get('/api/analytics/engagement/:surveyId', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const engagement = await storage.getEngagementMetrics(req.params.surveyId);
      res.json(engagement);
    } catch (error) {
      console.error("Error fetching engagement metrics:", error);
      res.status(500).json({ message: "Failed to fetch engagement metrics" });
    }
  });

  app.get('/api/analytics/survey/:surveyId', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const analytics = await storage.getAnalyticsBySurvey(req.params.surveyId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching survey analytics:", error);
      res.status(500).json({ message: "Failed to fetch survey analytics" });
    }
  });

  // Analytics events - SECURED with validation, rate limiting, and consistency checks
  app.post('/api/analytics/events', analyticsRateLimit, async (req, res) => {
    try {
      // Validate the analytics event payload with strict Zod schema
      const eventData = insertAnalyticsEventSchema.parse(req.body);
      
      // Critical security checks: Verify responseId and surveyId consistency
      const response = await storage.getResponse(eventData.responseId);
      if (!response) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid response ID - response does not exist" 
        });
      }
      
      if (response.surveyId !== eventData.surveyId) {
        return res.status(400).json({ 
          success: false, 
          message: "Response ID and survey ID are inconsistent" 
        });
      }
      
      // Additional validation for pageId if provided
      if (eventData.pageId) {
        const page = await storage.getSurveyPage(eventData.pageId);
        if (!page || page.surveyId !== eventData.surveyId) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid page ID or page does not belong to specified survey" 
          });
        }
      }
      
      // Additional validation for questionId if provided
      if (eventData.questionId) {
        const question = await storage.getQuestion(eventData.questionId);
        if (!question) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid question ID - question does not exist" 
          });
        }
        
        // If pageId is provided, verify question belongs to that page
        if (eventData.pageId && question.pageId !== eventData.pageId) {
          return res.status(400).json({ 
            success: false, 
            message: "Question does not belong to specified page" 
          });
        }
        
        // If pageId not provided, verify question's page belongs to the survey
        if (!eventData.pageId) {
          const questionPage = await storage.getSurveyPage(question.pageId);
          if (!questionPage || questionPage.surveyId !== eventData.surveyId) {
            return res.status(400).json({ 
              success: false, 
              message: "Question does not belong to specified survey" 
            });
          }
        }
      }
      
      const event = await storage.createAnalyticsEvent(eventData);
      
      // Cache invalidation: Since we don't have a cache service here, 
      // we'll rely on client-side cache invalidation in the frontend
      // The frontend should invalidate analytics-related queries after posting events
      
      res.json({ success: true, event });
    } catch (error) {
      console.error("Error creating analytics event:", error);
      
      // Handle validation errors specifically
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false,
          message: "Invalid analytics event data",
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Failed to create analytics event" 
      });
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
      const recipient = response.recipientId ? await storage.getRecipient(response.recipientId) : null;
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
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Error processing ${file.originalname}: ${errorMessage}`);
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
      const recipient = response.recipientId ? await storage.getRecipient(response.recipientId) : null;
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
      const recipient = response.recipientId ? await storage.getRecipient(response.recipientId) : null;
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
      const recipient = response.recipientId ? await storage.getRecipient(response.recipientId) : null;
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

  // Export validation schema
  const exportOptionsSchema = z.object({
    format: z.enum(['csv', 'pdf']),
    includeIncomplete: z.boolean().optional().default(false),
    dateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
    dateTo: z.string().optional().transform(val => val ? new Date(val) : undefined),
    questionIds: z.array(z.string()).optional()
  });

  // Export routes
  app.post('/api/surveys/:surveyId/export', isAuthenticated, async (req: any, res) => {
    try {
      const surveyId = req.params.surveyId;
      const userId = req.user.claims.sub;

      // Verify survey ownership
      const survey = await storage.getSurvey(surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (survey.creatorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate export options
      const options = exportOptionsSchema.parse(req.body);

      // Generate export
      const exportedFile = await exportService.exportSurveyData(surveyId, options);

      res.json({
        success: true,
        filename: exportedFile.filename,
        downloadUrl: `/api/exports/download/${exportedFile.filename}`,
        size: exportedFile.size,
        mimeType: exportedFile.mimeType
      });
    } catch (error) {
      console.error("Error exporting survey data:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to export survey data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Export download route
  app.get('/api/exports/download/:filename', isAuthenticated, async (req: any, res) => {
    try {
      const filename = req.params.filename;
      const filePath = exportService.getExportPath(filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Export file not found" });
      }

      // Security check: ensure filename doesn't contain path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ message: "Invalid filename" });
      }

      // Determine content type
      const ext = path.extname(filename).toLowerCase();
      const mimeType = ext === '.csv' ? 'text/csv' : 
                     ext === '.pdf' ? 'application/pdf' : 
                     'application/octet-stream';

      // Set headers for download
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('Error streaming export file:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error downloading file' });
        }
      });
    } catch (error) {
      console.error("Error downloading export:", error);
      res.status(500).json({ message: "Failed to download export" });
    }
  });

  // Export cleanup route (admin/maintenance)
  app.delete('/api/exports/cleanup', isAuthenticated, async (req: any, res) => {
    try {
      await exportService.cleanupOldExports(24); // Clean up files older than 24 hours
      res.json({ message: "Export cleanup completed" });
    } catch (error) {
      console.error("Error cleaning up exports:", error);
      res.status(500).json({ message: "Failed to clean up exports" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
