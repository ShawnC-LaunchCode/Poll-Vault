import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import { surveyRepository } from "../repositories";

/**
 * Service for group-level analytics and performance metrics
 * Provides aggregated statistics by recipient group
 */
export class GroupAnalyticsService {
  /**
   * Get group performance statistics for a survey
   * Returns completion metrics aggregated by recipient group
   */
  async getGroupStats(surveyId: string, userId: string): Promise<Array<{
    group: string;
    sent: number;
    completed: number;
    in_progress: number;
    not_started: number;
    completion_rate: number;
  }>> {
    // Verify ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    // Query group statistics
    const result = await db.execute(sql`
      SELECT
        rg.name AS "group",
        COUNT(DISTINCT sr.id)::text AS "sent",
        COUNT(DISTINCT CASE WHEN r.completed = true THEN r.id END)::text AS "completed",
        COUNT(DISTINCT CASE WHEN r.completed = false THEN r.id END)::text AS "in_progress",
        COUNT(DISTINCT CASE WHEN r.id IS NULL THEN sr.id END)::text AS "not_started"
      FROM recipient_groups rg
      INNER JOIN recipient_group_members rgm ON rg.id = rgm.group_id
      INNER JOIN global_recipients gr ON gr.id = rgm.recipient_id
      INNER JOIN recipients sr ON sr.email = gr.email AND sr.survey_id = ${surveyId}
      LEFT JOIN responses r ON r.recipient_id = sr.id AND r.survey_id = ${surveyId}
      WHERE rg.creator_id = ${userId}
      GROUP BY rg.name
      ORDER BY rg.name
    `);

    // Transform and calculate completion rates
    return result.rows.map((row: any) => {
      const sent = parseInt(row.sent) || 0;
      const completed = parseInt(row.completed) || 0;
      const inProgress = parseInt(row.in_progress) || 0;
      const notStarted = parseInt(row.not_started) || 0;
      const completionRate = sent > 0 ? Math.round((completed / sent) * 100) : 0;

      return {
        group: row.group,
        sent,
        completed,
        in_progress: inProgress,
        not_started: notStarted,
        completion_rate: completionRate
      };
    });
  }

  /**
   * Get completion trend data over time
   * Returns daily completion counts
   */
  async getTrendStats(surveyId: string, userId: string): Promise<Array<{
    day: string;
    completions: number;
  }>> {
    // Verify ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    // Query trend data
    const result = await db.execute(sql`
      SELECT
        DATE(r.submitted_at)::text AS "day",
        COUNT(r.id)::text AS "completions"
      FROM responses r
      WHERE r.survey_id = ${surveyId}
        AND r.completed = true
        AND r.submitted_at IS NOT NULL
      GROUP BY DATE(r.submitted_at)
      ORDER BY DATE(r.submitted_at)
    `);

    return result.rows.map((row: any) => ({
      day: row.day,
      completions: parseInt(row.completions) || 0
    }));
  }

  /**
   * Get overall summary statistics
   */
  async getSummaryStats(surveyId: string, userId: string): Promise<{
    totalRecipients: number;
    totalCompleted: number;
    totalInProgress: number;
    totalNotStarted: number;
    overallCompletionRate: number;
    totalGroups: number;
  }> {
    // Verify ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    // Query summary statistics
    const result = await db.execute(sql`
      SELECT
        COUNT(DISTINCT sr.id)::text AS "total_recipients",
        COUNT(DISTINCT CASE WHEN r.completed = true THEN r.id END)::text AS "total_completed",
        COUNT(DISTINCT CASE WHEN r.completed = false THEN r.id END)::text AS "total_in_progress",
        COUNT(DISTINCT CASE WHEN r.id IS NULL THEN sr.id END)::text AS "total_not_started",
        COUNT(DISTINCT rg.id)::text AS "total_groups"
      FROM recipients sr
      LEFT JOIN responses r ON r.recipient_id = sr.id AND r.survey_id = ${surveyId}
      LEFT JOIN global_recipients gr ON gr.email = sr.email AND gr.creator_id = ${userId}
      LEFT JOIN recipient_group_members rgm ON rgm.recipient_id = gr.id
      LEFT JOIN recipient_groups rg ON rg.id = rgm.group_id AND rg.creator_id = ${userId}
      WHERE sr.survey_id = ${surveyId}
    `);

    const row = result.rows[0];
    const totalRecipients = parseInt(row.total_recipients) || 0;
    const totalCompleted = parseInt(row.total_completed) || 0;
    const overallCompletionRate = totalRecipients > 0
      ? Math.round((totalCompleted / totalRecipients) * 100)
      : 0;

    return {
      totalRecipients,
      totalCompleted,
      totalInProgress: parseInt(row.total_in_progress) || 0,
      totalNotStarted: parseInt(row.total_not_started) || 0,
      overallCompletionRate,
      totalGroups: parseInt(row.total_groups) || 0
    };
  }
}

// Export singleton instance
export const groupAnalyticsService = new GroupAnalyticsService();
