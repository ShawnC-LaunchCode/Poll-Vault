import type { Express } from "express";
import { isAuthenticated } from "../googleAuth";
import { groupAnalyticsService } from "../services/GroupAnalyticsService";
import { createObjectCsvStringifier } from "csv-writer";
import * as fs from "fs";
import * as path from "path";

/**
 * Register group analytics routes
 * Provides endpoints for group-level performance metrics
 */
export function registerGroupAnalyticsRoutes(app: Express): void {
  /**
   * GET /api/surveys/:surveyId/analytics/groups
   * Get group performance statistics and trend data
   */
  app.get('/api/surveys/:surveyId/analytics/groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const { surveyId } = req.params;

      // Fetch all analytics data in parallel
      const [groups, trend, summary] = await Promise.all([
        groupAnalyticsService.getGroupStats(surveyId, userId),
        groupAnalyticsService.getTrendStats(surveyId, userId),
        groupAnalyticsService.getSummaryStats(surveyId, userId)
      ]);

      res.json({
        groups,
        trend,
        summary
      });
    } catch (error: any) {
      console.error("Error fetching group analytics:", error);

      if (error.message === "Survey not found") {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("Access denied")) {
        return res.status(403).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to fetch group analytics" });
    }
  });

  /**
   * GET /api/surveys/:surveyId/analytics/groups/summary
   * Get summary statistics only
   */
  app.get('/api/surveys/:surveyId/analytics/groups/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const { surveyId } = req.params;
      const summary = await groupAnalyticsService.getSummaryStats(surveyId, userId);

      res.json(summary);
    } catch (error: any) {
      console.error("Error fetching group summary:", error);

      if (error.message === "Survey not found") {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("Access denied")) {
        return res.status(403).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to fetch group summary" });
    }
  });

  /**
   * GET /api/surveys/:surveyId/export?format=csv&scope=groups
   * Export group analytics as CSV
   */
  app.get('/api/surveys/:surveyId/export', isAuthenticated, async (req: any, res) => {
    try {
      // Only handle group exports on this route
      if (req.query.scope !== 'groups') {
        return; // Let other export routes handle this
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const { surveyId } = req.params;
      const format = req.query.format || 'csv';

      if (format !== 'csv') {
        return res.status(400).json({ message: "Only CSV format is supported for group analytics" });
      }

      // Fetch group analytics data
      const groups = await groupAnalyticsService.getGroupStats(surveyId, userId);

      // Create CSV string
      const csvStringifier = createObjectCsvStringifier({
        header: [
          { id: 'group', title: 'Group Name' },
          { id: 'sent', title: 'Total Recipients' },
          { id: 'completed', title: 'Completed' },
          { id: 'in_progress', title: 'In Progress' },
          { id: 'not_started', title: 'Not Started' },
          { id: 'completion_rate', title: 'Completion Rate (%)' }
        ]
      });

      const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(groups);

      // Set response headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="group-analytics-${surveyId}.csv"`);
      res.send(csvContent);

    } catch (error: any) {
      console.error("Error exporting group analytics:", error);

      if (error.message === "Survey not found") {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("Access denied")) {
        return res.status(403).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to export group analytics" });
    }
  });
}
