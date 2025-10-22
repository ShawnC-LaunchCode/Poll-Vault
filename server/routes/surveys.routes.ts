import type { Express } from "express";
import { isAuthenticated } from "../googleAuth";
import { insertSurveySchema } from "@shared/schema";
import { surveyService, analyticsService } from "../services";
import { recipientRepository, surveyRepository, pageRepository, questionRepository, systemStatsRepository } from "../repositories";
import { z } from "zod";
import { exportService } from "../services/exportService";

/**
 * Register survey-related routes
 * Handles survey CRUD operations, validation, status management, and export
 *
 * Uses surveyService for business logic and authorization
 */
export function registerSurveyRoutes(app: Express): void {

  // ============================================================================
  // Core Survey CRUD Operations
  // ============================================================================

  /**
   * POST /api/surveys
   * Create a new survey
   */
  app.post('/api/surveys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      // Add creatorId to request body before validation
      const surveyData = insertSurveySchema.parse({
        ...req.body,
        creatorId: userId
      });
      const survey = await surveyService.createSurvey(surveyData, userId);

      // Increment system stats counter
      await systemStatsRepository.incrementSurveysCreated();

      res.json(survey);
    } catch (error) {
      console.error("Error creating survey:", error);
      res.status(500).json({
        message: "Failed to create survey",
        error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      });
    }
  });

  /**
   * GET /api/surveys
   * Get all surveys for the authenticated user
   */
  app.get('/api/surveys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const surveys = await surveyService.getSurveysByCreator(userId);
      res.json(surveys);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ message: "Failed to fetch surveys" });
    }
  });

  /**
   * GET /api/surveys/check/:publicLink
   * TEMPORARY: Check survey status by public link for debugging
   */
  app.get('/api/surveys/check/:publicLink', async (req, res) => {
    try {
      const { publicLink } = req.params;
      const { surveyRepository } = require('../repositories');
      const survey = await surveyRepository.findByPublicLink(publicLink);

      if (!survey) {
        return res.json({ found: false, publicLink });
      }

      res.json({
        found: true,
        title: survey.title,
        status: survey.status,
        allowAnonymous: survey.allowAnonymous,
        anonymousAccessType: survey.anonymousAccessType,
        publicLink: survey.publicLink,
        diagnosis: {
          statusOk: survey.status === 'open',
          anonymousOk: survey.allowAnonymous === true,
          ready: survey.status === 'open' && survey.allowAnonymous === true
        }
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  /**
   * GET /api/surveys/:id
   * Get a single survey by ID (with ownership check)
   */
  app.get('/api/surveys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const survey = await surveyService.getSurveyForUser(req.params.id, userId);

      res.json(survey);
    } catch (error) {
      console.error("Error fetching survey:", error);
      if (error instanceof Error) {
        if (error.message === "Survey not found") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("Access denied")) {
          return res.status(403).json({ message: error.message });
        }
      }
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  /**
   * PUT /api/surveys/:id
   * Update a survey
   */
  app.put('/api/surveys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = insertSurveySchema.partial().parse(req.body);

      const updatedSurvey = await surveyService.updateSurvey(req.params.id, userId, updates);
      res.json(updatedSurvey);
    } catch (error) {
      console.error("Error updating survey:", error);
      if (error instanceof Error) {
        if (error.message === "Survey not found") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("Access denied")) {
          return res.status(403).json({ message: error.message });
        }
      }
      res.status(500).json({ message: "Failed to update survey" });
    }
  });

  /**
   * DELETE /api/surveys/:id
   * Delete a survey
   */
  app.delete('/api/surveys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await surveyService.deleteSurvey(req.params.id, userId);

      res.json({ message: "Survey deleted successfully" });
    } catch (error) {
      console.error("Error deleting survey:", error);
      if (error instanceof Error) {
        if (error.message === "Survey not found") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("Access denied")) {
          return res.status(403).json({ message: error.message });
        }
      }
      res.status(500).json({ message: "Failed to delete survey" });
    }
  });

  // ============================================================================
  // Survey Validation & Status Management
  // ============================================================================

  /**
   * GET /api/surveys/:id/validate
   * Validate a survey for publishing
   */
  app.get('/api/surveys/:id/validate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validation = await surveyService.validateForPublish(req.params.id, userId);

      res.json(validation);
    } catch (error) {
      console.error("Error validating survey:", error);
      if (error instanceof Error) {
        if (error.message === "Survey not found") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("Access denied")) {
          return res.status(403).json({ message: error.message });
        }
      }
      res.status(500).json({ message: "Failed to validate survey" });
    }
  });

  /**
   * PUT /api/surveys/:id/status
   * Change survey status (draft, open, closed)
   */
  app.put('/api/surveys/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status } = req.body;

      const result = await surveyService.changeStatus(req.params.id, userId, status);
      res.json(result);
    } catch (error) {
      console.error("Error updating survey status:", error);
      if (error instanceof Error) {
        if (error.message === "Survey not found") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("Access denied")) {
          return res.status(403).json({ message: error.message });
        }
        if (error.message.includes("Invalid status") || error.message.includes("not allowed")) {
          return res.status(400).json({ message: error.message });
        }
      }
      res.status(500).json({ message: "Failed to update survey status" });
    }
  });

  // ============================================================================
  // Anonymous Access Management
  // ============================================================================

  /**
   * GET /api/survey/:identifier
   * Get survey data by identifier (auto-detects recipient token or public link)
   */
  app.get('/api/survey/:identifier', async (req, res) => {
    try {
      const { identifier } = req.params;
      console.log('[Survey] Request received for identifier:', identifier);

      // First, try to find recipient by token
      const recipient = await recipientRepository.findByToken(identifier);

      if (recipient) {
        // This is a recipient token
        console.log('[Survey] Recipient found:', {
          id: recipient.id,
          surveyId: recipient.surveyId,
          name: recipient.name
        });

        // Get survey data
        const survey = await surveyRepository.findById(recipient.surveyId);
        if (!survey) {
          console.log('[Survey] Survey not found');
          return res.status(404).json({ message: "Survey not found" });
        }

        // Check if survey is open
        if (survey.status !== 'open') {
          console.log('[Survey] Survey not open, status:', survey.status);
          return res.status(400).json({ message: "Survey is not currently open" });
        }

        // Get pages with questions
        const pages = await pageRepository.findBySurvey(survey.id);
        const pagesWithQuestions = await Promise.all(
          pages.map(async (page: any) => ({
            ...page,
            questions: await questionRepository.findByPage(page.id)
          }))
        );

        console.log('[Survey] Survey found via token:', {
          id: survey.id,
          title: survey.title,
          status: survey.status,
          pageCount: pagesWithQuestions.length
        });

        return res.json({
          survey,
          pages: pagesWithQuestions,
          recipient,
          anonymous: false
        });
      }

      // Not a recipient token, try as public link
      console.log('[Survey] Not a recipient token, trying as public link');

      const surveyData = await surveyService.getSurveyByPublicLink(identifier);

      console.log('[Survey] Survey found via public link:', {
        id: surveyData.survey.id,
        title: surveyData.survey.title,
        status: surveyData.survey.status,
        allowAnonymous: surveyData.survey.allowAnonymous,
        pageCount: surveyData.pages.length
      });

      return res.json({
        survey: surveyData.survey,
        pages: surveyData.pages,
        anonymous: true
      });
    } catch (error) {
      console.error("[Survey] Error:", error);
      if (error instanceof Error) {
        console.error("[Survey] Error message:", error.message);
        console.error("[Survey] Error stack:", error.stack);
        if (error.message === "Survey not found" || error.message === "Survey not available") {
          return res.status(404).json({ message: error.message });
        }
      }
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  /**
   * GET /api/anonymous-survey/:publicLink
   * Get survey data for anonymous respondents using public link
   */
  app.get('/api/anonymous-survey/:publicLink', async (req, res) => {
    try {
      const { publicLink } = req.params;
      console.log('[Anonymous Survey] Request received for public link:', publicLink);

      const surveyData = await surveyService.getSurveyByPublicLink(publicLink);

      console.log('[Anonymous Survey] Survey found:', {
        id: surveyData.survey.id,
        title: surveyData.survey.title,
        status: surveyData.survey.status,
        allowAnonymous: surveyData.survey.allowAnonymous,
        pageCount: surveyData.pages.length
      });

      res.json({
        survey: surveyData.survey,
        pages: surveyData.pages,
        anonymous: true
      });
    } catch (error) {
      console.error("[Anonymous Survey] Error:", error);
      if (error instanceof Error) {
        console.error("[Anonymous Survey] Error message:", error.message);
        console.error("[Anonymous Survey] Error stack:", error.stack);
        if (error.message === "Survey not found" || error.message === "Survey not available") {
          return res.status(404).json({ message: error.message });
        }
      }
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  /**
   * POST /api/surveys/:id/anonymous
   * Enable anonymous access for a survey
   */
  app.post('/api/surveys/:id/anonymous', isAuthenticated, async (req: any, res) => {
    try {
      const surveyId = req.params.id;
      const userId = req.user.claims.sub;
      const { accessType, anonymousConfig } = req.body;

      const updatedSurvey = await surveyService.enableAnonymousAccess(
        surveyId,
        userId,
        { accessType, anonymousConfig }
      );

      res.json({
        survey: updatedSurvey,
        publicLink: `${req.protocol}://${req.get('host')}/survey/${updatedSurvey.publicLink}`
      });
    } catch (error) {
      console.error("Error enabling anonymous access:", error);
      if (error instanceof Error) {
        if (error.message === "Survey not found") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("Access denied")) {
          return res.status(403).json({ message: error.message });
        }
        res.status(500).json({
          message: "Failed to enable anonymous access",
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      } else {
        res.status(500).json({ message: "Failed to enable anonymous access" });
      }
    }
  });

  /**
   * DELETE /api/surveys/:id/anonymous
   * Disable anonymous access for a survey
   */
  app.delete('/api/surveys/:id/anonymous', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updatedSurvey = await surveyService.disableAnonymousAccess(req.params.id, userId);

      res.json(updatedSurvey);
    } catch (error) {
      console.error("Error disabling anonymous access:", error);
      if (error instanceof Error) {
        if (error.message === "Survey not found") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("Access denied")) {
          return res.status(403).json({ message: error.message });
        }
      }
      res.status(500).json({ message: "Failed to disable anonymous access" });
    }
  });

  // ============================================================================
  // Survey Results & Analytics
  // ============================================================================

  /**
   * GET /api/surveys/:id/results
   * Get survey results with analytics
   */
  app.get('/api/surveys/:id/results', isAuthenticated, async (req: any, res) => {
    try {
      const surveyId = req.params.id;
      const userId = req.user.claims.sub;

      const results = await analyticsService.getSurveyResults(surveyId, userId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching survey results:", error);
      if (error instanceof Error) {
        if (error.message === "Survey not found") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("Access denied")) {
          return res.status(403).json({ message: error.message });
        }
      }
      res.status(500).json({ message: "Failed to fetch survey results" });
    }
  });

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * POST /api/surveys/bulk/status
   * Bulk update survey statuses
   */
  app.post('/api/surveys/bulk/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { surveyIds, status } = req.body;

      if (!Array.isArray(surveyIds) || !status) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      const result = await surveyService.bulkUpdateStatus(surveyIds, status, userId);
      res.json(result);
    } catch (error) {
      console.error("Error in bulk status update:", error);
      res.status(500).json({ message: "Failed to update survey statuses" });
    }
  });

  /**
   * POST /api/surveys/bulk/delete
   * Bulk delete surveys
   */
  app.post('/api/surveys/bulk/delete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { surveyIds } = req.body;

      if (!Array.isArray(surveyIds)) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      const result = await surveyService.bulkDeleteSurveys(surveyIds, userId);
      res.json(result);
    } catch (error) {
      console.error("Error in bulk delete:", error);
      res.status(500).json({ message: "Failed to delete surveys" });
    }
  });

  // ============================================================================
  // Survey Management Operations
  // ============================================================================

  /**
   * POST /api/surveys/:id/duplicate
   * Duplicate an existing survey
   */
  app.post('/api/surveys/:id/duplicate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const surveyId = req.params.id;
      const { title } = req.body;

      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      const duplicatedSurvey = await surveyService.duplicateSurvey(surveyId, userId, title);
      res.json(duplicatedSurvey);
    } catch (error) {
      console.error("Error duplicating survey:", error);
      if (error instanceof Error && error.message.includes("Access denied")) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to duplicate survey" });
    }
  });

  /**
   * POST /api/surveys/:id/archive
   * Archive a survey (set status to 'closed')
   */
  app.post('/api/surveys/:id/archive', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const surveyId = req.params.id;

      const archivedSurvey = await surveyService.archiveSurvey(surveyId, userId);
      res.json(archivedSurvey);
    } catch (error) {
      console.error("Error archiving survey:", error);
      if (error instanceof Error && error.message.includes("Access denied")) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to archive survey" });
    }
  });

  // ============================================================================
  // Export Functionality
  // ============================================================================

  /**
   * POST /api/surveys/:surveyId/export
   * Export survey data to CSV or PDF
   */
  app.post('/api/surveys/:surveyId/export', isAuthenticated, async (req: any, res) => {
    try {
      const surveyId = req.params.surveyId;
      const userId = req.user.claims.sub;

      // Verify ownership
      await surveyService.getSurveyForUser(surveyId, userId);

      const exportOptionsSchema = z.object({
        format: z.enum(['csv', 'pdf']),
        includeIncomplete: z.boolean().optional().default(false),
        dateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
        dateTo: z.string().optional().transform(val => val ? new Date(val) : undefined),
        questionIds: z.array(z.string()).optional()
      });

      const options = exportOptionsSchema.parse(req.body);
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
      if (error instanceof Error) {
        if (error.message === "Survey not found") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("Access denied")) {
          return res.status(403).json({ message: error.message });
        }
      }
      res.status(500).json({
        success: false,
        message: "Failed to export survey data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
