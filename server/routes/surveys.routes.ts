import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../googleAuth";
import { insertSurveySchema } from "@shared/schema";
import { validateSurveyForPublish, canChangeStatus } from "../services/surveyValidation";
import { z } from "zod";
import { exportService } from "../services/exportService";

/**
 * Register survey-related routes
 * Handles survey CRUD operations, validation, status management, and export
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
      console.log('Creating survey for user:', userId);

      if (!userId) {
        console.error('Survey creation failed: No user ID');
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const surveyData = insertSurveySchema.parse({ ...req.body, creatorId: userId });
      console.log('Parsed survey data:', {
        title: surveyData.title,
        description: surveyData.description?.substring(0, 100),
        creatorId: surveyData.creatorId
      });

      const survey = await storage.createSurvey(surveyData);
      console.log('Survey created successfully:', { id: survey.id, title: survey.title });

      res.json(survey);
    } catch (error) {
      console.error("Error creating survey:", error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
        res.status(500).json({
          message: "Failed to create survey",
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      } else {
        res.status(500).json({ message: "Failed to create survey" });
      }
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
      const surveys = await storage.getSurveysByCreator(userId);
      res.json(surveys);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ message: "Failed to fetch surveys" });
    }
  });

  /**
   * GET /api/surveys/:id
   * Get a single survey by ID (with ownership check)
   */
  app.get('/api/surveys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(survey);
    } catch (error) {
      console.error("Error fetching survey:", error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  /**
   * PUT /api/surveys/:id
   * Update a survey
   */
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

  /**
   * DELETE /api/surveys/:id
   * Delete a survey
   */
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

  // ============================================================================
  // Survey Validation & Status Management
  // ============================================================================

  /**
   * GET /api/surveys/:id/validate
   * Validate a survey for publishing
   */
  app.get('/api/surveys/:id/validate', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validation = await validateSurveyForPublish(req.params.id);
      res.json(validation);
    } catch (error) {
      console.error("Error validating survey:", error);
      res.status(500).json({ message: "Failed to validate survey" });
    }
  });

  /**
   * PUT /api/surveys/:id/status
   * Change survey status (draft, open, closed)
   */
  app.put('/api/surveys/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { status } = req.body;
      if (!status || !['draft', 'open', 'closed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'draft', 'open', or 'closed'" });
      }

      const statusCheck = await canChangeStatus(req.params.id, survey.status, status);
      if (!statusCheck.allowed) {
        return res.status(400).json({
          message: statusCheck.reason || "Status change not allowed",
          validation: statusCheck.reason
        });
      }

      const updatedSurvey = await storage.updateSurvey(req.params.id, { status });

      res.json({
        survey: updatedSurvey,
        message: statusCheck.reason || "Status updated successfully"
      });
    } catch (error) {
      console.error("Error updating survey status:", error);
      res.status(500).json({ message: "Failed to update survey status" });
    }
  });

  // ============================================================================
  // Anonymous Access Management
  // ============================================================================

  /**
   * POST /api/surveys/:id/anonymous
   * Enable anonymous access for a survey
   */
  app.post('/api/surveys/:id/anonymous', isAuthenticated, async (req: any, res) => {
    try {
      const surveyId = req.params.id;
      const userId = req.user.claims.sub;

      console.log('Enabling anonymous access for survey:', surveyId, 'by user:', userId);

      const survey = await storage.getSurvey(surveyId);
      if (!survey) {
        console.error('Survey not found when enabling anonymous access:', surveyId);
        return res.status(404).json({ message: "Survey not found" });
      }

      console.log('Found survey for anonymous access:', {
        id: survey.id,
        title: survey.title,
        creatorId: survey.creatorId
      });

      if (survey.creatorId !== userId) {
        console.error('Access denied for anonymous access:', { surveyCreator: survey.creatorId, requestUser: userId });
        return res.status(403).json({ message: "Access denied" });
      }

      const { accessType, anonymousConfig } = req.body;
      console.log('Anonymous access config:', { accessType, anonymousConfig });

      const updatedSurvey = await storage.enableAnonymousAccess(surveyId, {
        accessType,
        anonymousConfig
      });

      console.log('Anonymous access enabled successfully:', {
        id: updatedSurvey.id,
        publicLink: updatedSurvey.publicLink,
        allowAnonymous: updatedSurvey.allowAnonymous
      });

      res.json({
        survey: updatedSurvey,
        publicLink: `${req.protocol}://${req.get('host')}/survey/${updatedSurvey.publicLink}`
      });
    } catch (error) {
      console.error("Error enabling anonymous access:", error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
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

      const survey = await storage.getSurvey(surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (survey.creatorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const responses = await storage.getResponsesBySurvey(surveyId);
      const completedResponses = responses.filter(r => r.completed);

      const totalResponses = responses.length;
      const completedCount = completedResponses.length;
      const completionRate = totalResponses > 0 ? (completedCount / totalResponses) * 100 : 0;

      const pages = await storage.getSurveyPages(surveyId);
      const allQuestions: any[] = [];

      for (const page of pages) {
        const questions = await storage.getQuestionsWithSubquestionsByPage(page.id);
        allQuestions.push(...questions);
      }

      const questionBreakdown: Record<string, any> = {};

      for (const question of allQuestions) {
        const questionId = question.id;

        questionBreakdown[questionId] = {
          questionId,
          questionTitle: question.title,
          questionType: question.type,
          totalResponses: 0,
          answers: [],
          breakdown: {}
        };

        for (const response of completedResponses) {
          const answers = await storage.getAnswersByResponse(response.id);
          const questionAnswers = answers.filter(a => a.questionId === questionId);

          if (questionAnswers.length > 0) {
            questionBreakdown[questionId].totalResponses++;

            for (const answer of questionAnswers) {
              if (question.type === 'multiple_choice' || question.type === 'radio') {
                const value = answer.value;
                let selectedOptions: string[] = [];

                if (Array.isArray(value)) {
                  selectedOptions = value;
                } else if (typeof value === 'object' && value !== null) {
                  if (value.text) {
                    selectedOptions = Array.isArray(value.text) ? value.text : [value.text];
                  } else if (value.selected) {
                    selectedOptions = Array.isArray(value.selected) ? value.selected : [value.selected];
                  }
                } else if (typeof value === 'string') {
                  selectedOptions = [value];
                }

                selectedOptions.forEach(option => {
                  const optionStr = String(option);
                  questionBreakdown[questionId].breakdown[optionStr] =
                    (questionBreakdown[questionId].breakdown[optionStr] || 0) + 1;
                });

              } else if (question.type === 'yes_no') {
                const value = answer.value;
                let boolValue: string;

                if (typeof value === 'boolean') {
                  boolValue = value ? 'Yes' : 'No';
                } else if (typeof value === 'object' && value !== null) {
                  boolValue = value.text === true || value.text === 'true' || value.text === 'Yes' ? 'Yes' : 'No';
                } else {
                  boolValue = String(value) === 'true' || String(value) === 'Yes' ? 'Yes' : 'No';
                }

                questionBreakdown[questionId].breakdown[boolValue] =
                  (questionBreakdown[questionId].breakdown[boolValue] || 0) + 1;
              }
            }
          }
        }
      }

      res.json({
        survey,
        stats: {
          totalResponses,
          completedResponses: completedCount,
          completionRate: Math.round(completionRate * 100) / 100
        },
        questionBreakdown
      });
    } catch (error) {
      console.error("Error fetching survey results:", error);
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

      const result = await storage.bulkUpdateSurveyStatus(surveyIds, status, userId);
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

      const result = await storage.bulkDeleteSurveys(surveyIds, userId);
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

      const duplicatedSurvey = await storage.duplicateSurvey(surveyId, title, userId);
      res.json(duplicatedSurvey);
    } catch (error) {
      console.error("Error duplicating survey:", error);
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

      const archivedSurvey = await storage.archiveSurvey(surveyId, userId);
      res.json(archivedSurvey);
    } catch (error) {
      console.error("Error archiving survey:", error);
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

      const survey = await storage.getSurvey(surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (survey.creatorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

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
      res.status(500).json({
        success: false,
        message: "Failed to export survey data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
