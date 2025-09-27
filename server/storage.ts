import {
  users,
  surveys,
  surveyPages,
  questions,
  loopGroupSubquestions,
  conditionalRules,
  recipients,
  responses,
  answers,
  analyticsEvents,
  files,
  type User,
  type UpsertUser,
  type Survey,
  type InsertSurvey,
  type SurveyPage,
  type InsertSurveyPage,
  type Question,
  type InsertQuestion,
  type LoopGroupSubquestion,
  type InsertLoopGroupSubquestion,
  type ConditionalRule,
  type InsertConditionalRule,
  type QuestionWithSubquestions,
  type Recipient,
  type InsertRecipient,
  type Response,
  type InsertResponse,
  type Answer,
  type InsertAnswer,
  type AnalyticsEvent,
  type DashboardStats,
  type ActivityItem,
  type SurveyAnalytics,
  type ResponseTrend,
  type BulkOperationRequest,
  type BulkOperationResult,
  type SurveyDuplication,
  type FileMetadata,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sql, gte, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Survey operations
  createSurvey(survey: InsertSurvey): Promise<Survey>;
  getSurvey(id: string): Promise<Survey | undefined>;
  getSurveysByCreator(creatorId: string): Promise<Survey[]>;
  updateSurvey(id: string, updates: Partial<InsertSurvey>): Promise<Survey>;
  deleteSurvey(id: string): Promise<void>;
  
  // Survey page operations
  createSurveyPage(page: InsertSurveyPage): Promise<SurveyPage>;
  getSurveyPage(id: string): Promise<SurveyPage | undefined>;
  getSurveyPages(surveyId: string): Promise<SurveyPage[]>;
  updateSurveyPage(id: string, updates: Partial<InsertSurveyPage>): Promise<SurveyPage>;
  deleteSurveyPage(id: string): Promise<void>;
  
  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestion(id: string): Promise<Question | undefined>;
  getQuestionsByPage(pageId: string): Promise<Question[]>;
  getQuestionsWithSubquestionsByPage(pageId: string): Promise<QuestionWithSubquestions[]>;
  updateQuestion(id: string, updates: Partial<InsertQuestion>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;
  
  // Loop group subquestion operations
  createLoopGroupSubquestion(subquestion: InsertLoopGroupSubquestion): Promise<LoopGroupSubquestion>;
  getLoopGroupSubquestion(id: string): Promise<LoopGroupSubquestion | undefined>;
  getLoopGroupSubquestions(loopQuestionId: string): Promise<LoopGroupSubquestion[]>;
  updateLoopGroupSubquestion(id: string, updates: Partial<InsertLoopGroupSubquestion>): Promise<LoopGroupSubquestion>;
  deleteLoopGroupSubquestion(id: string): Promise<void>;
  deleteLoopGroupSubquestionsByLoopId(loopQuestionId: string): Promise<void>;
  
  // Conditional rules operations
  createConditionalRule(rule: InsertConditionalRule): Promise<ConditionalRule>;
  getConditionalRule(id: string): Promise<ConditionalRule | undefined>;
  getConditionalRulesBySurvey(surveyId: string): Promise<ConditionalRule[]>;
  getConditionalRulesByQuestion(questionId: string): Promise<ConditionalRule[]>;
  updateConditionalRule(id: string, updates: Partial<InsertConditionalRule>): Promise<ConditionalRule>;
  deleteConditionalRule(id: string): Promise<void>;
  deleteConditionalRulesBySurvey(surveyId: string): Promise<void>;
  
  // Recipient operations
  createRecipient(recipient: InsertRecipient): Promise<Recipient>;
  getRecipient(id: string): Promise<Recipient | undefined>;
  getRecipientByToken(token: string): Promise<Recipient | undefined>;
  getRecipientsBySurvey(surveyId: string): Promise<Recipient[]>;
  updateRecipient(id: string, updates: Partial<InsertRecipient>): Promise<Recipient>;
  
  // Response operations
  createResponse(response: InsertResponse): Promise<Response>;
  getResponse(id: string): Promise<Response | undefined>;
  getResponsesBySurvey(surveyId: string): Promise<Response[]>;
  getResponseByRecipient(recipientId: string): Promise<Response | undefined>;
  updateResponse(id: string, updates: Partial<InsertResponse>): Promise<Response>;
  
  // Answer operations
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  getAnswersByResponse(responseId: string): Promise<Answer[]>;
  getAnswersWithQuestionsByResponse(responseId: string): Promise<(Answer & { question: Question })[]>;
  updateAnswer(id: string, updates: Partial<InsertAnswer>): Promise<Answer>;
  
  // Analytics operations
  createAnalyticsEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<AnalyticsEvent>;
  getAnalyticsByResponse(responseId: string): Promise<AnalyticsEvent[]>;
  
  // Enhanced dashboard analytics
  getDashboardStats(creatorId: string): Promise<DashboardStats>;
  getSurveyAnalytics(creatorId: string): Promise<SurveyAnalytics[]>;
  getResponseTrends(creatorId: string, days?: number): Promise<ResponseTrend[]>;
  getRecentActivity(creatorId: string, limit?: number): Promise<ActivityItem[]>;
  
  // Bulk operations
  bulkUpdateSurveyStatus(surveyIds: string[], status: string, creatorId: string): Promise<BulkOperationResult>;
  bulkDeleteSurveys(surveyIds: string[], creatorId: string): Promise<BulkOperationResult>;
  
  // Survey management
  duplicateSurvey(surveyId: string, newTitle: string, creatorId: string): Promise<Survey>;
  archiveSurvey(surveyId: string, creatorId: string): Promise<Survey>;
  
  // File operations
  createFile(fileData: {
    answerId: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
  }): Promise<FileMetadata>;
  getFile(id: string): Promise<FileMetadata | undefined>;
  getFilesByAnswer(answerId: string): Promise<FileMetadata[]>;
  deleteFile(id: string): Promise<void>;
  deleteFilesByAnswer(answerId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  
  // Survey operations
  async createSurvey(survey: InsertSurvey): Promise<Survey> {
    const [newSurvey] = await db.insert(surveys).values(survey).returning();
    return newSurvey;
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    return survey;
  }

  async getSurveysByCreator(creatorId: string): Promise<Survey[]> {
    return await db
      .select()
      .from(surveys)
      .where(eq(surveys.creatorId, creatorId))
      .orderBy(desc(surveys.updatedAt));
  }

  async updateSurvey(id: string, updates: Partial<InsertSurvey>): Promise<Survey> {
    const [updatedSurvey] = await db
      .update(surveys)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(surveys.id, id))
      .returning();
    return updatedSurvey;
  }

  async deleteSurvey(id: string): Promise<void> {
    await db.delete(surveys).where(eq(surveys.id, id));
  }
  
  // Survey page operations
  async createSurveyPage(page: InsertSurveyPage): Promise<SurveyPage> {
    const [newPage] = await db.insert(surveyPages).values(page).returning();
    return newPage;
  }

  async getSurveyPage(id: string): Promise<SurveyPage | undefined> {
    const [page] = await db.select().from(surveyPages).where(eq(surveyPages.id, id));
    return page;
  }

  async getSurveyPages(surveyId: string): Promise<SurveyPage[]> {
    return await db
      .select()
      .from(surveyPages)
      .where(eq(surveyPages.surveyId, surveyId))
      .orderBy(surveyPages.order);
  }

  async updateSurveyPage(id: string, updates: Partial<InsertSurveyPage>): Promise<SurveyPage> {
    const [updatedPage] = await db
      .update(surveyPages)
      .set(updates)
      .where(eq(surveyPages.id, id))
      .returning();
    return updatedPage;
  }

  async deleteSurveyPage(id: string): Promise<void> {
    await db.delete(surveyPages).where(eq(surveyPages.id, id));
  }
  
  // Question operations
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [newQuestion] = await db.insert(questions).values(question).returning();
    return newQuestion;
  }

  async getQuestionsByPage(pageId: string): Promise<Question[]> {
    return await db
      .select()
      .from(questions)
      .where(eq(questions.pageId, pageId))
      .orderBy(questions.order);
  }

  async updateQuestion(id: string, updates: Partial<InsertQuestion>): Promise<Question> {
    const [updatedQuestion] = await db
      .update(questions)
      .set(updates)
      .where(eq(questions.id, id))
      .returning();
    return updatedQuestion;
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async deleteQuestion(id: string): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  async getQuestionsWithSubquestionsByPage(pageId: string): Promise<QuestionWithSubquestions[]> {
    const questionsData = await db
      .select()
      .from(questions)
      .where(eq(questions.pageId, pageId))
      .orderBy(questions.order);

    const result: QuestionWithSubquestions[] = [];
    
    for (const question of questionsData) {
      if (question.type === 'loop_group') {
        const subquestions = await this.getLoopGroupSubquestions(question.id);
        result.push({ ...question, subquestions });
      } else {
        result.push(question);
      }
    }
    
    return result;
  }
  
  // Loop group subquestion operations
  async createLoopGroupSubquestion(subquestion: InsertLoopGroupSubquestion): Promise<LoopGroupSubquestion> {
    const [newSubquestion] = await db.insert(loopGroupSubquestions).values(subquestion).returning();
    return newSubquestion;
  }

  async getLoopGroupSubquestion(id: string): Promise<LoopGroupSubquestion | undefined> {
    const [subquestion] = await db.select().from(loopGroupSubquestions).where(eq(loopGroupSubquestions.id, id));
    return subquestion;
  }

  async getLoopGroupSubquestions(loopQuestionId: string): Promise<LoopGroupSubquestion[]> {
    return await db
      .select()
      .from(loopGroupSubquestions)
      .where(eq(loopGroupSubquestions.loopQuestionId, loopQuestionId))
      .orderBy(loopGroupSubquestions.order);
  }

  async updateLoopGroupSubquestion(id: string, updates: Partial<InsertLoopGroupSubquestion>): Promise<LoopGroupSubquestion> {
    const [updatedSubquestion] = await db
      .update(loopGroupSubquestions)
      .set(updates)
      .where(eq(loopGroupSubquestions.id, id))
      .returning();
    return updatedSubquestion;
  }

  async deleteLoopGroupSubquestion(id: string): Promise<void> {
    await db.delete(loopGroupSubquestions).where(eq(loopGroupSubquestions.id, id));
  }

  async deleteLoopGroupSubquestionsByLoopId(loopQuestionId: string): Promise<void> {
    await db.delete(loopGroupSubquestions).where(eq(loopGroupSubquestions.loopQuestionId, loopQuestionId));
  }
  
  // Conditional rules operations
  async createConditionalRule(rule: InsertConditionalRule): Promise<ConditionalRule> {
    const [newRule] = await db.insert(conditionalRules).values(rule).returning();
    return newRule;
  }

  async getConditionalRule(id: string): Promise<ConditionalRule | undefined> {
    const [rule] = await db.select().from(conditionalRules).where(eq(conditionalRules.id, id));
    return rule;
  }

  async getConditionalRulesBySurvey(surveyId: string): Promise<ConditionalRule[]> {
    return await db
      .select()
      .from(conditionalRules)
      .where(eq(conditionalRules.surveyId, surveyId))
      .orderBy(conditionalRules.order);
  }

  async getConditionalRulesByQuestion(questionId: string): Promise<ConditionalRule[]> {
    return await db
      .select()
      .from(conditionalRules)
      .where(eq(conditionalRules.targetQuestionId, questionId))
      .orderBy(conditionalRules.order);
  }

  async updateConditionalRule(id: string, updates: Partial<InsertConditionalRule>): Promise<ConditionalRule> {
    const [updatedRule] = await db
      .update(conditionalRules)
      .set(updates)
      .where(eq(conditionalRules.id, id))
      .returning();
    return updatedRule;
  }

  async deleteConditionalRule(id: string): Promise<void> {
    await db.delete(conditionalRules).where(eq(conditionalRules.id, id));
  }

  async deleteConditionalRulesBySurvey(surveyId: string): Promise<void> {
    await db.delete(conditionalRules).where(eq(conditionalRules.surveyId, surveyId));
  }
  
  // Recipient operations
  async createRecipient(recipient: InsertRecipient): Promise<Recipient> {
    const token = randomUUID();
    const [newRecipient] = await db
      .insert(recipients)
      .values({ ...recipient, token })
      .returning();
    return newRecipient;
  }

  async getRecipient(id: string): Promise<Recipient | undefined> {
    const [recipient] = await db.select().from(recipients).where(eq(recipients.id, id));
    return recipient;
  }

  async getRecipientByToken(token: string): Promise<Recipient | undefined> {
    const [recipient] = await db.select().from(recipients).where(eq(recipients.token, token));
    return recipient;
  }

  async getRecipientsBySurvey(surveyId: string): Promise<Recipient[]> {
    return await db
      .select()
      .from(recipients)
      .where(eq(recipients.surveyId, surveyId))
      .orderBy(desc(recipients.createdAt));
  }

  async updateRecipient(id: string, updates: Partial<InsertRecipient>): Promise<Recipient> {
    const [updatedRecipient] = await db
      .update(recipients)
      .set(updates)
      .where(eq(recipients.id, id))
      .returning();
    return updatedRecipient;
  }
  
  // Response operations
  async createResponse(response: InsertResponse): Promise<Response> {
    const [newResponse] = await db.insert(responses).values(response).returning();
    return newResponse;
  }

  async getResponse(id: string): Promise<Response | undefined> {
    const [response] = await db.select().from(responses).where(eq(responses.id, id));
    return response;
  }

  async getResponsesBySurvey(surveyId: string): Promise<Response[]> {
    return await db
      .select()
      .from(responses)
      .where(eq(responses.surveyId, surveyId))
      .orderBy(desc(responses.createdAt));
  }

  async getResponseByRecipient(recipientId: string): Promise<Response | undefined> {
    const [response] = await db
      .select()
      .from(responses)
      .where(and(eq(responses.recipientId, recipientId), eq(responses.completed, true)))
      .orderBy(desc(responses.submittedAt));
    return response;
  }

  async updateResponse(id: string, updates: Partial<InsertResponse>): Promise<Response> {
    const [updatedResponse] = await db
      .update(responses)
      .set(updates)
      .where(eq(responses.id, id))
      .returning();
    return updatedResponse;
  }
  
  // Answer operations
  async createAnswer(answer: InsertAnswer): Promise<Answer> {
    const [newAnswer] = await db.insert(answers).values(answer).returning();
    return newAnswer;
  }

  async getAnswersByResponse(responseId: string): Promise<Answer[]> {
    return await db
      .select()
      .from(answers)
      .where(eq(answers.responseId, responseId));
  }

  async getAnswersWithQuestionsByResponse(responseId: string): Promise<(Answer & { question: Question })[]> {
    const result = await db
      .select({
        id: answers.id,
        responseId: answers.responseId,
        questionId: answers.questionId,
        loopIndex: answers.loopIndex,
        value: answers.value,
        createdAt: answers.createdAt,
        question: {
          id: questions.id,
          pageId: questions.pageId,
          type: questions.type,
          title: questions.title,
          description: questions.description,
          required: questions.required,
          options: questions.options,
          order: questions.order,
          createdAt: questions.createdAt,
        }
      })
      .from(answers)
      .innerJoin(questions, eq(answers.questionId, questions.id))
      .where(eq(answers.responseId, responseId))
      .orderBy(questions.order);
    
    return result.map(row => ({
      id: row.id,
      responseId: row.responseId,
      questionId: row.questionId,
      loopIndex: row.loopIndex,
      value: row.value,
      createdAt: row.createdAt,
      question: row.question
    }));
  }

  async updateAnswer(id: string, updates: Partial<InsertAnswer>): Promise<Answer> {
    const [updatedAnswer] = await db
      .update(answers)
      .set(updates)
      .where(eq(answers.id, id))
      .returning();
    return updatedAnswer;
  }
  
  // Analytics operations
  async createAnalyticsEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<AnalyticsEvent> {
    const [newEvent] = await db.insert(analyticsEvents).values(event).returning();
    return newEvent;
  }

  async getAnalyticsByResponse(responseId: string): Promise<AnalyticsEvent[]> {
    return await db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.responseId, responseId))
      .orderBy(analyticsEvents.timestamp);
  }
  
  // Enhanced dashboard analytics
  async getDashboardStats(creatorId: string): Promise<DashboardStats> {
    const [totalSurveysResult] = await db
      .select({ count: count() })
      .from(surveys)
      .where(eq(surveys.creatorId, creatorId));

    const [activeSurveysResult] = await db
      .select({ count: count() })
      .from(surveys)
      .where(and(eq(surveys.creatorId, creatorId), eq(surveys.status, 'open')));

    const [draftSurveysResult] = await db
      .select({ count: count() })
      .from(surveys)
      .where(and(eq(surveys.creatorId, creatorId), eq(surveys.status, 'draft')));

    const [closedSurveysResult] = await db
      .select({ count: count() })
      .from(surveys)
      .where(and(eq(surveys.creatorId, creatorId), eq(surveys.status, 'closed')));

    const [totalResponsesResult] = await db
      .select({ count: count() })
      .from(responses)
      .leftJoin(surveys, eq(responses.surveyId, surveys.id))
      .where(eq(surveys.creatorId, creatorId));

    const [completedResponsesResult] = await db
      .select({ count: count() })
      .from(responses)
      .leftJoin(surveys, eq(responses.surveyId, surveys.id))
      .where(and(eq(surveys.creatorId, creatorId), eq(responses.completed, true)));

    const totalSurveys = totalSurveysResult.count;
    const totalResponses = totalResponsesResult.count;
    const completedResponses = completedResponsesResult.count;
    const completionRate = totalResponses > 0 ? Math.round((completedResponses / totalResponses) * 100) : 0;
    const avgResponsesPerSurvey = totalSurveys > 0 ? Math.round((totalResponses / totalSurveys) * 10) / 10 : 0;

    // Get recent activity
    const recentActivity = await this.getRecentActivity(creatorId, 5);

    return {
      totalSurveys,
      activeSurveys: activeSurveysResult.count,
      draftSurveys: draftSurveysResult.count,
      closedSurveys: closedSurveysResult.count,
      totalResponses,
      completionRate,
      avgResponsesPerSurvey,
      recentActivity,
    };
  }

  async getSurveyAnalytics(creatorId: string): Promise<SurveyAnalytics[]> {
    const surveysData = await db
      .select({
        surveyId: surveys.id,
        title: surveys.title,
        status: surveys.status,
      })
      .from(surveys)
      .where(eq(surveys.creatorId, creatorId))
      .orderBy(desc(surveys.updatedAt));

    const analytics: SurveyAnalytics[] = [];

    for (const survey of surveysData) {
      const [responseCountResult] = await db
        .select({ count: count() })
        .from(responses)
        .where(eq(responses.surveyId, survey.surveyId));

      const [completedCountResult] = await db
        .select({ count: count() })
        .from(responses)
        .where(and(eq(responses.surveyId, survey.surveyId), eq(responses.completed, true)));

      const [lastResponseResult] = await db
        .select({ submittedAt: responses.submittedAt })
        .from(responses)
        .where(eq(responses.surveyId, survey.surveyId))
        .orderBy(desc(responses.submittedAt))
        .limit(1);

      const responseCount = responseCountResult.count;
      const completedCount = completedCountResult.count;
      const completionRate = responseCount > 0 ? Math.round((completedCount / responseCount) * 100) : 0;

      analytics.push({
        surveyId: survey.surveyId,
        title: survey.title,
        responseCount,
        completionRate,
        avgCompletionTime: 5, // Placeholder - would need more complex analytics
        lastResponseAt: lastResponseResult?.submittedAt || null,
        status: survey.status,
      });
    }

    return analytics;
  }

  async getResponseTrends(creatorId: string, days: number = 30): Promise<ResponseTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trendsData = await db
      .select({
        date: sql<string>`DATE(${responses.createdAt})`,
        total: count(),
        completed: sql<number>`SUM(CASE WHEN ${responses.completed} THEN 1 ELSE 0 END)`,
      })
      .from(responses)
      .leftJoin(surveys, eq(responses.surveyId, surveys.id))
      .where(and(
        eq(surveys.creatorId, creatorId),
        gte(responses.createdAt, startDate)
      ))
      .groupBy(sql`DATE(${responses.createdAt})`)
      .orderBy(sql`DATE(${responses.createdAt})`);

    return trendsData.map(row => ({
      date: row.date,
      count: row.total,
      completed: Number(row.completed),
    }));
  }

  async getRecentActivity(creatorId: string, limit: number = 10): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];

    // Recent survey creations/updates
    const recentSurveys = await db
      .select({
        id: surveys.id,
        title: surveys.title,
        status: surveys.status,
        createdAt: surveys.createdAt,
        updatedAt: surveys.updatedAt,
      })
      .from(surveys)
      .where(eq(surveys.creatorId, creatorId))
      .orderBy(desc(surveys.updatedAt))
      .limit(limit);

    for (const survey of recentSurveys) {
      const createdTime = survey.createdAt?.getTime() || 0;
      const updatedTime = survey.updatedAt?.getTime() || 0;
      
      activities.push({
        id: randomUUID(),
        type: createdTime === updatedTime ? 'survey_created' : 'survey_published',
        title: survey.title,
        description: createdTime === updatedTime 
          ? 'Survey was created' 
          : `Survey status changed to ${survey.status}`,
        timestamp: survey.updatedAt || survey.createdAt || new Date(),
        surveyId: survey.id,
      });
    }

    // Recent responses
    const recentResponses = await db
      .select({
        responseId: responses.id,
        surveyId: responses.surveyId,
        surveyTitle: surveys.title,
        submittedAt: responses.submittedAt,
        completed: responses.completed,
      })
      .from(responses)
      .leftJoin(surveys, eq(responses.surveyId, surveys.id))
      .where(eq(surveys.creatorId, creatorId))
      .orderBy(desc(responses.createdAt))
      .limit(limit);

    for (const response of recentResponses) {
      if (response.submittedAt) {
        activities.push({
          id: randomUUID(),
          type: 'response_received',
          title: response.surveyTitle || 'Unknown Survey',
          description: response.completed ? 'Response completed' : 'Response received',
          timestamp: response.submittedAt,
          surveyId: response.surveyId,
          responseId: response.responseId,
        });
      }
    }

    // Sort all activities by timestamp and return limited results
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Bulk operations
  async bulkUpdateSurveyStatus(surveyIds: string[], status: string, creatorId: string): Promise<BulkOperationResult> {
    try {
      // Verify all surveys belong to the creator
      const foundSurveys = await db
        .select({ id: surveys.id })
        .from(surveys)
        .where(and(
          inArray(surveys.id, surveyIds),
          eq(surveys.creatorId, creatorId)
        ));

      if (foundSurveys.length !== surveyIds.length) {
        return {
          success: false,
          updatedCount: 0,
          errors: ['Some surveys not found or access denied'],
        };
      }

      // Update survey statuses
      await db
        .update(surveys)
        .set({ 
          status: status as any,
          updatedAt: new Date(),
        })
        .where(and(
          inArray(surveys.id, surveyIds),
          eq(surveys.creatorId, creatorId)
        ));

      return {
        success: true,
        updatedCount: foundSurveys.length,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        updatedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  async bulkDeleteSurveys(surveyIds: string[], creatorId: string): Promise<BulkOperationResult> {
    try {
      // Verify all surveys belong to the creator
      const surveysToDelete = await db
        .select({ id: surveys.id })
        .from(surveys)
        .where(and(
          inArray(surveys.id, surveyIds),
          eq(surveys.creatorId, creatorId)
        ));

      if (surveysToDelete.length !== surveyIds.length) {
        return {
          success: false,
          updatedCount: 0,
          errors: ['Some surveys not found or access denied'],
        };
      }

      // Delete surveys (cascade deletes will handle related data)
      await db
        .delete(surveys)
        .where(and(
          inArray(surveys.id, surveyIds),
          eq(surveys.creatorId, creatorId)
        ));

      return {
        success: true,
        updatedCount: surveysToDelete.length,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        updatedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // Survey management
  async duplicateSurvey(surveyId: string, newTitle: string, creatorId: string): Promise<Survey> {
    const originalSurvey = await db
      .select()
      .from(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.creatorId, creatorId)))
      .limit(1);

    if (!originalSurvey.length) {
      throw new Error('Survey not found or access denied');
    }

    const original = originalSurvey[0];

    // Create new survey
    const [newSurvey] = await db
      .insert(surveys)
      .values({
        title: newTitle,
        description: original.description,
        creatorId,
        status: 'draft',
      })
      .returning();

    // Duplicate pages and questions
    const pages = await db
      .select()
      .from(surveyPages)
      .where(eq(surveyPages.surveyId, surveyId))
      .orderBy(surveyPages.order);

    for (const page of pages) {
      const [newPage] = await db
        .insert(surveyPages)
        .values({
          surveyId: newSurvey.id,
          title: page.title,
          order: page.order,
        })
        .returning();

      const pageQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.pageId, page.id))
        .orderBy(questions.order);

      for (const question of pageQuestions) {
        await db
          .insert(questions)
          .values({
            pageId: newPage.id,
            type: question.type,
            title: question.title,
            description: question.description,
            required: question.required,
            options: question.options,
            order: question.order,
          });
      }
    }

    return newSurvey;
  }

  async archiveSurvey(surveyId: string, creatorId: string): Promise<Survey> {
    const [archivedSurvey] = await db
      .update(surveys)
      .set({ 
        status: 'closed',
        updatedAt: new Date(),
      })
      .where(and(eq(surveys.id, surveyId), eq(surveys.creatorId, creatorId)))
      .returning();

    if (!archivedSurvey) {
      throw new Error('Survey not found or access denied');
    }

    return archivedSurvey;
  }

  // File operations
  async createFile(fileData: {
    answerId: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
  }): Promise<FileMetadata> {
    const [newFile] = await db.insert(files).values(fileData).returning();
    return {
      id: newFile.id,
      filename: newFile.filename,
      originalName: newFile.originalName,
      mimeType: newFile.mimeType,
      size: newFile.size,
      uploadedAt: newFile.uploadedAt!
    };
  }

  async getFile(id: string): Promise<FileMetadata | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    if (!file) return undefined;
    
    return {
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      uploadedAt: file.uploadedAt!
    };
  }

  async getFilesByAnswer(answerId: string): Promise<FileMetadata[]> {
    const fileList = await db.select().from(files).where(eq(files.answerId, answerId));
    return fileList.map(file => ({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      uploadedAt: file.uploadedAt!
    }));
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  async deleteFilesByAnswer(answerId: string): Promise<void> {
    await db.delete(files).where(eq(files.answerId, answerId));
  }
}

export const storage = new DatabaseStorage();
