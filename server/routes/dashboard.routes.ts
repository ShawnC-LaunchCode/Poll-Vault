import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../googleAuth";

/**
 * Register dashboard-related routes
 * Provides overview statistics and metrics for the creator dashboard
 */
export function registerDashboardRoutes(app: Express): void {

  /**
   * GET /api/dashboard/stats
   * Get dashboard statistics for the authenticated user
   */
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

  /**
   * GET /api/dashboard/analytics
   * Get analytics for all surveys owned by the user
   */
  app.get('/api/dashboard/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analytics = await storage.getSurveyAnalytics(userId);

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard analytics" });
    }
  });

  /**
   * GET /api/dashboard/trends
   * Get response trends across all surveys
   */
  app.get('/api/dashboard/trends', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trends = await storage.getResponseTrends(userId);

      res.json(trends);
    } catch (error) {
      console.error("Error fetching response trends:", error);
      res.status(500).json({ message: "Failed to fetch response trends" });
    }
  });

  /**
   * GET /api/dashboard/activity
   * Get recent activity across all surveys
   */
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

  /**
   * GET /api/dashboard/surveys
   * Get recent surveys with basic stats
   */
  app.get('/api/dashboard/surveys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string | undefined;

      const surveys = await storage.getSurveysByCreator(userId);

      // Filter by status if provided
      let filteredSurveys = surveys;
      if (status && ['draft', 'open', 'closed'].includes(status)) {
        filteredSurveys = surveys.filter(s => s.status === status);
      }

      // Limit results
      const limitedSurveys = filteredSurveys.slice(0, limit);

      res.json(limitedSurveys);
    } catch (error) {
      console.error("Error fetching dashboard surveys:", error);
      res.status(500).json({ message: "Failed to fetch dashboard surveys" });
    }
  });
}
