import { BaseRepository, type DbTransaction } from "./BaseRepository";
import {
  analyticsEvents,
  type AnalyticsEvent,
  insertAnalyticsEventSchema,
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql, between } from "drizzle-orm";

/**
 * Insert type for analytics events (validated via Zod schema)
 */
export type InsertAnalyticsEvent = typeof insertAnalyticsEventSchema._type;

/**
 * Repository for analytics event-related database operations
 * Handles event tracking, analytics queries, and reporting
 */
export class AnalyticsRepository extends BaseRepository<
  typeof analyticsEvents,
  AnalyticsEvent,
  InsertAnalyticsEvent
> {
  constructor() {
    super(analyticsEvents);
  }

  // ==================== Event Tracking ====================

  /**
   * Create analytics event (fire-and-forget pattern)
   */
  async createEvent(event: InsertAnalyticsEvent, tx?: DbTransaction): Promise<AnalyticsEvent> {
    const database = this.getDb(tx);
    const [newEvent] = await database
      .insert(analyticsEvents)
      .values(event as any)
      .returning();
    return newEvent;
  }

  /**
   * Bulk create analytics events
   */
  async bulkCreateEvents(
    events: InsertAnalyticsEvent[],
    tx?: DbTransaction
  ): Promise<AnalyticsEvent[]> {
    const database = this.getDb(tx);
    return await database.insert(analyticsEvents).values(events as any).returning();
  }

  // ==================== Event Queries ====================

  /**
   * Find events by response ID (ordered by timestamp)
   */
  async findByResponse(responseId: string, tx?: DbTransaction): Promise<AnalyticsEvent[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.responseId, responseId))
      .orderBy(analyticsEvents.timestamp);
  }

  /**
   * Find events by survey ID (ordered by timestamp, with optional limit)
   */
  async findBySurvey(
    surveyId: string,
    limit?: number,
    tx?: DbTransaction
  ): Promise<AnalyticsEvent[]> {
    const database = this.getDb(tx);
    let query = database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.surveyId, surveyId))
      .orderBy(desc(analyticsEvents.timestamp));

    if (limit) {
      query = query.limit(limit) as any;
    }

    return await query;
  }

  /**
   * Find events by survey and event type
   */
  async findBySurveyAndEvent(
    surveyId: string,
    eventType: string,
    tx?: DbTransaction
  ): Promise<AnalyticsEvent[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.surveyId, surveyId), eq(analyticsEvents.event, eventType)))
      .orderBy(desc(analyticsEvents.timestamp));
  }

  /**
   * Find events by question ID
   */
  async findByQuestion(questionId: string, tx?: DbTransaction): Promise<AnalyticsEvent[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.questionId, questionId))
      .orderBy(analyticsEvents.timestamp);
  }

  /**
   * Find events by page ID
   */
  async findByPage(pageId: string, tx?: DbTransaction): Promise<AnalyticsEvent[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.pageId, pageId))
      .orderBy(analyticsEvents.timestamp);
  }

  /**
   * Find events by date range
   */
  async findByDateRange(
    surveyId: string,
    startDate: Date,
    endDate: Date,
    tx?: DbTransaction
  ): Promise<AnalyticsEvent[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.surveyId, surveyId),
          gte(analyticsEvents.timestamp, startDate),
          lte(analyticsEvents.timestamp, endDate)
        )
      )
      .orderBy(analyticsEvents.timestamp);
  }

  // ==================== Analytics Aggregations ====================

  /**
   * Count events by type for a survey
   */
  async countEventsBySurvey(
    surveyId: string,
    eventType?: string,
    tx?: DbTransaction
  ): Promise<number> {
    const database = this.getDb(tx);

    let conditions = eq(analyticsEvents.surveyId, surveyId);
    if (eventType) {
      conditions = and(conditions, eq(analyticsEvents.event, eventType)) as any;
    }

    const result = await database
      .select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(conditions);

    return Number(result[0]?.count || 0);
  }

  /**
   * Get average duration for specific event type
   */
  async getAverageDuration(
    surveyId: string,
    eventType: string,
    tx?: DbTransaction
  ): Promise<number> {
    const database = this.getDb(tx);

    const result = await database
      .select({ avgDuration: sql<number>`avg(${analyticsEvents.duration})` })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.surveyId, surveyId),
          eq(analyticsEvents.event, eventType),
          sql`${analyticsEvents.duration} IS NOT NULL`
        )
      );

    return Number(result[0]?.avgDuration || 0);
  }

  /**
   * Get question-level analytics (views, answers, skips, time spent)
   */
  async getQuestionAnalytics(
    questionId: string,
    tx?: DbTransaction
  ): Promise<{
    totalViews: number;
    totalAnswers: number;
    totalSkips: number;
    avgTimeSpent: number;
    medianTimeSpent: number;
  }> {
    const database = this.getDb(tx);

    // Count views (question_focus events)
    const viewsResult = await database
      .select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(
        and(eq(analyticsEvents.questionId, questionId), eq(analyticsEvents.event, "question_focus"))
      );

    // Count answers
    const answersResult = await database
      .select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.questionId, questionId),
          eq(analyticsEvents.event, "question_answer")
        )
      );

    // Count skips
    const skipsResult = await database
      .select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(
        and(eq(analyticsEvents.questionId, questionId), eq(analyticsEvents.event, "question_skip"))
      );

    // Calculate average time spent (from blur events with duration)
    const timeResult = await database
      .select({
        avgDuration: sql<number>`avg(${analyticsEvents.duration})`,
        medianDuration: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${analyticsEvents.duration})`,
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.questionId, questionId),
          eq(analyticsEvents.event, "question_blur"),
          sql`${analyticsEvents.duration} IS NOT NULL`
        )
      );

    return {
      totalViews: Number(viewsResult[0]?.count || 0),
      totalAnswers: Number(answersResult[0]?.count || 0),
      totalSkips: Number(skipsResult[0]?.count || 0),
      avgTimeSpent: Number(timeResult[0]?.avgDuration || 0),
      medianTimeSpent: Number(timeResult[0]?.medianDuration || 0),
    };
  }

  /**
   * Get page-level analytics (views, completions, time spent)
   */
  async getPageAnalytics(
    pageId: string,
    tx?: DbTransaction
  ): Promise<{
    totalViews: number;
    totalCompletions: number;
    avgTimeSpent: number;
    medianTimeSpent: number;
  }> {
    const database = this.getDb(tx);

    // Count page views
    const viewsResult = await database
      .select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.pageId, pageId), eq(analyticsEvents.event, "page_view")));

    // Count page completions (page_leave events indicate completion)
    const completionsResult = await database
      .select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.pageId, pageId), eq(analyticsEvents.event, "page_leave")));

    // Calculate time spent on page
    const timeResult = await database
      .select({
        avgDuration: sql<number>`avg(${analyticsEvents.duration})`,
        medianDuration: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${analyticsEvents.duration})`,
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.pageId, pageId),
          eq(analyticsEvents.event, "page_leave"),
          sql`${analyticsEvents.duration} IS NOT NULL`
        )
      );

    return {
      totalViews: Number(viewsResult[0]?.count || 0),
      totalCompletions: Number(completionsResult[0]?.count || 0),
      avgTimeSpent: Number(timeResult[0]?.avgDuration || 0),
      medianTimeSpent: Number(timeResult[0]?.medianDuration || 0),
    };
  }

  /**
   * Get survey completion funnel data
   */
  async getSurveyFunnelData(
    surveyId: string,
    tx?: DbTransaction
  ): Promise<
    Array<{
      pageId: string;
      views: number;
      exits: number;
    }>
  > {
    const database = this.getDb(tx);

    const result = await database
      .select({
        pageId: analyticsEvents.pageId,
        views: sql<number>`count(CASE WHEN ${analyticsEvents.event} = 'page_view' THEN 1 END)`,
        exits: sql<number>`count(CASE WHEN ${analyticsEvents.event} = 'page_leave' THEN 1 END)`,
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.surveyId, surveyId),
          sql`${analyticsEvents.pageId} IS NOT NULL`
        )
      )
      .groupBy(analyticsEvents.pageId);

    return result.map((row: any) => ({
      pageId: row.pageId,
      views: Number(row.views || 0),
      exits: Number(row.exits || 0),
    }));
  }

  /**
   * Delete analytics events for a survey (cleanup)
   */
  async deleteBySurvey(surveyId: string, tx?: DbTransaction): Promise<void> {
    const database = this.getDb(tx);
    await database.delete(analyticsEvents).where(eq(analyticsEvents.surveyId, surveyId));
  }

  /**
   * Delete analytics events for a response (cleanup)
   */
  async deleteByResponse(responseId: string, tx?: DbTransaction): Promise<void> {
    const database = this.getDb(tx);
    await database.delete(analyticsEvents).where(eq(analyticsEvents.responseId, responseId));
  }

  /**
   * Delete old analytics events (data retention policy)
   */
  async deleteOlderThan(cutoffDate: Date, tx?: DbTransaction): Promise<number> {
    const database = this.getDb(tx);
    const result = await database
      .delete(analyticsEvents)
      .where(lte(analyticsEvents.timestamp, cutoffDate))
      .returning({ id: analyticsEvents.id });
    return result.length;
  }
}

export const analyticsRepository = new AnalyticsRepository();
