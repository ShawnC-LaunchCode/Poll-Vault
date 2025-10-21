import type { Express } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { isAuthenticated } from "../googleAuth";
import { insertAnalyticsEventSchema } from "@shared/schema";

/**
 * Rate limiting for analytics events
 */
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

/**
 * Register analytics-related routes
 * Handles analytics event tracking and reporting
 */
export function registerAnalyticsRoutes(app: Express): void {

  // ============================================================================
  // Analytics Event Tracking
  // ============================================================================

  /**
   * POST /api/analytics/events
   * Create an analytics event with strict validation
   */
  app.post('/api/analytics/events', analyticsRateLimit, async (req, res) => {
    try {
      const eventData = insertAnalyticsEventSchema.parse(req.body);

      // Verify responseId and surveyId consistency
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

      // Validate pageId if provided
      if (eventData.pageId) {
        const page = await storage.getSurveyPage(eventData.pageId);
        if (!page || page.surveyId !== eventData.surveyId) {
          return res.status(400).json({
            success: false,
            message: "Invalid page ID or page does not belong to specified survey"
          });
        }
      }

      // Validate questionId if provided
      if (eventData.questionId) {
        const question = await storage.getQuestion(eventData.questionId);
        if (!question) {
          return res.status(400).json({
            success: false,
            message: "Invalid question ID - question does not exist"
          });
        }

        if (eventData.pageId && question.pageId !== eventData.pageId) {
          return res.status(400).json({
            success: false,
            message: "Question does not belong to specified page"
          });
        }

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

      const event = await storage.createAnalyticsEvent({
        ...eventData,
        data: eventData.data || {},
        pageId: eventData.pageId || null,
        questionId: eventData.questionId || null,
        duration: eventData.duration || null
      });

      res.json({ success: true, event });
    } catch (error) {
      console.error("Error creating analytics event:", error);

      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: "Invalid analytics event data",
          errors: (error as any).errors
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create analytics event"
      });
    }
  });

  // ============================================================================
  // Analytics Reporting Routes
  // ============================================================================

  /**
   * GET /api/surveys/:surveyId/analytics/questions
   * Get question-level analytics
   */
  app.get('/api/surveys/:surveyId/analytics/questions', isAuthenticated, async (req: any, res) => {
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

  /**
   * GET /api/surveys/:surveyId/analytics/pages
   * Get page-level analytics
   */
  app.get('/api/surveys/:surveyId/analytics/pages', isAuthenticated, async (req: any, res) => {
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

  /**
   * GET /api/surveys/:surveyId/analytics/funnel
   * Get completion funnel data
   */
  app.get('/api/surveys/:surveyId/analytics/funnel', isAuthenticated, async (req: any, res) => {
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

  /**
   * GET /api/surveys/:surveyId/analytics/time-spent
   * Get time spent data
   */
  app.get('/api/surveys/:surveyId/analytics/time-spent', isAuthenticated, async (req: any, res) => {
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

  /**
   * GET /api/surveys/:surveyId/analytics/engagement
   * Get engagement metrics
   */
  app.get('/api/surveys/:surveyId/analytics/engagement', isAuthenticated, async (req: any, res) => {
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

  /**
   * GET /api/surveys/:surveyId/analytics
   * Get overall survey analytics
   */
  app.get('/api/surveys/:surveyId/analytics', isAuthenticated, async (req: any, res) => {
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
}
