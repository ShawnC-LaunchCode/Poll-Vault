import { BaseRepository, type DbTransaction } from "./BaseRepository";
import {
  analyticsEvents,
  questions,
  surveyPages,
  answers,
  responses,
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

  // ==================== Question Aggregations ====================

  /**
   * Get aggregated answer data for all questions in a survey
   * Returns visualization-ready data per question type
   */
  async getQuestionAggregates(surveyId: string, tx?: DbTransaction): Promise<Record<string, any>> {
    const database = this.getDb(tx);

    // Get all questions for this survey
    const surveyQuestions = await database
      .select({
        questionId: questions.id,
        questionTitle: questions.title,
        questionType: questions.type,
        pageId: questions.pageId,
        options: questions.options,
      })
      .from(questions)
      .innerJoin(surveyPages, eq(questions.pageId, surveyPages.id))
      .where(eq(surveyPages.surveyId, surveyId))
      .orderBy(surveyPages.order, questions.order);

    const results: Record<string, any> = {};

    for (const question of surveyQuestions) {
      // Get all answers for this question
      const questionAnswers = await database
        .select({
          answerId: answers.id,
          value: answers.value,
          responseId: answers.responseId,
        })
        .from(answers)
        .innerJoin(responses, eq(answers.responseId, responses.id))
        .where(
          and(
            eq(responses.surveyId, surveyId),
            eq(answers.questionId, question.questionId)
          )
        );

      // Aggregate based on question type
      results[question.questionId] = {
        questionId: question.questionId,
        questionTitle: question.questionTitle,
        questionType: question.questionType,
        totalAnswers: questionAnswers.length,
        aggregation: this.aggregateQuestionAnswers(question, questionAnswers),
      };
    }

    return results;
  }

  /**
   * Aggregate answers based on question type
   */
  private aggregateQuestionAnswers(
    question: any,
    answers: Array<{ answerId: string; value: any; responseId: string }>
  ): any {
    if (answers.length === 0) {
      return this.getEmptyAggregation(question.questionType);
    }

    switch (question.questionType) {
      case 'yes_no':
        return this.aggregateYesNo(answers);

      case 'multiple_choice':
      case 'radio':
        return this.aggregateMultipleChoice(answers);

      case 'short_text':
      case 'long_text':
        return this.aggregateText(answers);

      default:
        return { raw: answers.map(a => a.value) };
    }
  }

  /**
   * Aggregate yes/no question answers
   */
  private aggregateYesNo(answers: Array<{ value: any }>): { yes: number; no: number } {
    let yes = 0;
    let no = 0;

    for (const answer of answers) {
      const value = answer.value;

      // Handle different value formats
      if (typeof value === 'boolean') {
        value ? yes++ : no++;
      } else if (typeof value === 'object' && value !== null) {
        const text = (value as any).text;
        if (text === true || text === 'true' || text === 'Yes' || text === 'yes') {
          yes++;
        } else {
          no++;
        }
      } else {
        const str = String(value).toLowerCase();
        if (str === 'true' || str === 'yes') {
          yes++;
        } else {
          no++;
        }
      }
    }

    return { yes, no };
  }

  /**
   * Aggregate multiple choice / radio question answers
   */
  private aggregateMultipleChoice(
    answers: Array<{ value: any }>
  ): Array<{ option: string; count: number; percent: number }> {
    const counts: Record<string, number> = {};
    let totalSelections = 0;

    for (const answer of answers) {
      const value = answer.value;
      let options: string[] = [];

      // Handle different value formats
      if (Array.isArray(value)) {
        options = value.map(v => String(v));
      } else if (typeof value === 'object' && value !== null) {
        const valueObj = value as Record<string, any>;
        if (valueObj.text) {
          options = Array.isArray(valueObj.text)
            ? valueObj.text.map(v => String(v))
            : [String(valueObj.text)];
        } else if (valueObj.selected) {
          options = Array.isArray(valueObj.selected)
            ? valueObj.selected.map(v => String(v))
            : [String(valueObj.selected)];
        } else {
          options = [String(value)];
        }
      } else {
        options = [String(value)];
      }

      for (const option of options) {
        counts[option] = (counts[option] || 0) + 1;
        totalSelections++;
      }
    }

    // Convert to array format with percentages
    return Object.entries(counts)
      .map(([option, count]) => ({
        option,
        count,
        percent: totalSelections > 0 ? Math.round((count / totalSelections) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }

  /**
   * Aggregate text answers with keyword extraction
   */
  private aggregateText(
    answers: Array<{ value: any }>
  ): { topKeywords: Array<{ word: string; count: number }>; totalWords: number } {
    // Combine all text answers
    const allText = answers
      .map(a => {
        const value = a.value;
        if (typeof value === 'string') return value;
        if (typeof value === 'object' && value !== null) {
          return (value as any).text || String(value);
        }
        return String(value);
      })
      .join(' ');

    // Extract and count words (excluding common stop words)
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);

    const words = allText
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    const wordFreq: Record<string, number> = {};
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }

    const topKeywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    return {
      topKeywords,
      totalWords: words.length,
    };
  }

  /**
   * Return empty aggregation structure for question type
   */
  private getEmptyAggregation(questionType: string): any {
    switch (questionType) {
      case 'yes_no':
        return { yes: 0, no: 0 };
      case 'multiple_choice':
      case 'radio':
        return [];
      case 'short_text':
      case 'long_text':
        return { topKeywords: [], totalWords: 0 };
      default:
        return null;
    }
  }
}

export const analyticsRepository = new AnalyticsRepository();
