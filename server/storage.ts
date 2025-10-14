import {
  users,
  surveys,
  surveyPages,
  questions,
  loopGroupSubquestions,
  conditionalRules,
  recipients,
  globalRecipients,
  responses,
  answers,
  analyticsEvents,
  files,
  anonymousResponseTracking,
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
  type GlobalRecipient,
  type InsertGlobalRecipient,
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
  type QuestionAnalytics,
  type PageAnalytics,
  type CompletionFunnelData,
  type TimeSpentData,
  type EngagementMetrics,
  type AnonymousResponseTracking,
  type InsertAnonymousResponseTracking,
  type AnonymousSurveyConfig,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sql, gte, inArray, type ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { randomUUID } from "crypto";

// Type alias for database transactions
type DbTransaction = PgTransaction<NodePgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>;

export interface IStorage {
  // Health check operations
  ping(): Promise<boolean>;
  
  // User operations (required for Google Auth)
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
  bulkReorderPages(surveyId: string, pageOrders: Array<{ id: string; order: number }>): Promise<SurveyPage[]>;
  
  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestion(id: string): Promise<Question | undefined>;
  getQuestionsByPage(pageId: string): Promise<Question[]>;
  getQuestionsWithSubquestionsByPage(pageId: string): Promise<QuestionWithSubquestions[]>;
  updateQuestion(id: string, updates: Partial<InsertQuestion>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;
  bulkReorderQuestions(surveyId: string, questionOrders: Array<{ id: string; pageId: string; order: number }>): Promise<Question[]>;
  
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
  
  // Global recipient operations
  createGlobalRecipient(globalRecipient: InsertGlobalRecipient): Promise<GlobalRecipient>;
  getGlobalRecipient(id: string): Promise<GlobalRecipient | undefined>;
  getGlobalRecipientsByCreator(creatorId: string): Promise<GlobalRecipient[]>;
  updateGlobalRecipient(id: string, updates: Partial<InsertGlobalRecipient>): Promise<GlobalRecipient>;
  deleteGlobalRecipient(id: string): Promise<void>;
  getGlobalRecipientByCreatorAndEmail(creatorId: string, email: string): Promise<GlobalRecipient | undefined>;
  bulkDeleteGlobalRecipients(ids: string[], creatorId: string): Promise<BulkOperationResult>;
  bulkAddGlobalRecipientsToSurvey(surveyId: string, globalRecipientIds: string[], creatorId: string): Promise<Recipient[]>;
  checkRecipientDuplicatesInSurvey(surveyId: string, emails: string[]): Promise<string[]>;
  
  // Response operations
  createResponse(response: InsertResponse): Promise<Response>;
  getResponse(id: string): Promise<Response | undefined>;
  getResponsesBySurvey(surveyId: string): Promise<Response[]>;
  getResponseByRecipient(recipientId: string): Promise<Response | undefined>;
  updateResponse(id: string, updates: Partial<InsertResponse>): Promise<Response>;
  
  // Answer operations
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  getAnswer(id: string): Promise<Answer | undefined>;
  getAnswersByResponse(responseId: string): Promise<Answer[]>;
  getAnswersWithQuestionsByResponse(responseId: string): Promise<(Answer & { question: Question })[]>;
  updateAnswer(id: string, updates: Partial<InsertAnswer>): Promise<Answer>;
  
  // Analytics operations
  createAnalyticsEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<AnalyticsEvent>;
  getAnalyticsByResponse(responseId: string): Promise<AnalyticsEvent[]>;
  getAnalyticsBySurvey(surveyId: string): Promise<AnalyticsEvent[]>;
  
  // Advanced analytics
  getQuestionAnalytics(surveyId: string): Promise<QuestionAnalytics[]>;
  getPageAnalytics(surveyId: string): Promise<PageAnalytics[]>;
  getCompletionFunnelData(surveyId: string): Promise<CompletionFunnelData[]>;
  getTimeSpentData(surveyId: string): Promise<TimeSpentData[]>;
  getEngagementMetrics(surveyId: string): Promise<EngagementMetrics>;
  
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
  
  // Anonymous survey operations
  getSurveyByPublicLink(publicLink: string): Promise<Survey | undefined>;
  generatePublicLink(surveyId: string): Promise<string>;
  enableAnonymousAccess(surveyId: string, config: { accessType: string; anonymousConfig?: AnonymousSurveyConfig }): Promise<Survey>;
  disableAnonymousAccess(surveyId: string): Promise<Survey>;
  
  // Anonymous response operations
  createAnonymousResponse(data: {
    surveyId: string;
    ipAddress: string;
    userAgent?: string;
    sessionId?: string;
    anonymousMetadata?: any;
  }): Promise<Response>;
  checkAnonymousResponseLimit(surveyId: string, ipAddress: string, sessionId?: string): Promise<boolean>;
  createAnonymousResponseTracking(tracking: InsertAnonymousResponseTracking): Promise<AnonymousResponseTracking>;
  getAnonymousResponsesBySurvey(surveyId: string): Promise<Response[]>;
  getAnonymousResponseCount(surveyId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // Health check operations
  async ping(): Promise<boolean> {
    try {
      // Simple database connectivity test using SELECT 1
      await db.execute(sql`SELECT 1`);
      return true;
    } catch (error) {
      console.error('Database ping failed:', error);
      return false;
    }
  }

  // User operations (required for Google Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // First, try to find existing user by email
      if (userData.email) {
        const existingUser = await db.select().from(users).where(eq(users.email, userData.email));
        
        if (existingUser.length > 0) {
          // Update existing user with new data
          const [updatedUser] = await db
            .update(users)
            .set({
              ...userData,
              updatedAt: new Date(),
            })
            .where(eq(users.email, userData.email))
            .returning();
          return updatedUser;
        }
      }

      // If no existing user found, insert new user
      // Handle conflict on ID in case it's provided and already exists
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
    } catch (error) {
      // If we still get a constraint violation, it could be due to race conditions
      // Try to find the existing user again and update
      if (error instanceof Error && error.message.includes('duplicate key') && userData.email) {
        const existingUser = await db.select().from(users).where(eq(users.email, userData.email));
        
        if (existingUser.length > 0) {
          const [updatedUser] = await db
            .update(users)
            .set({
              ...userData,
              updatedAt: new Date(),
            })
            .where(eq(users.email, userData.email))
            .returning();
          return updatedUser;
        }
      }
      
      // If we can't handle the error, re-throw it
      throw error;
    }
  }
  
  // Survey operations
  async createSurvey(survey: InsertSurvey): Promise<Survey> {
    console.log('Creating survey in database:', { 
      title: survey.title, 
      creatorId: survey.creatorId,
      description: survey.description?.substring(0, 100) 
    });
    
    return await db.transaction(async (tx: DbTransaction) => {
      try {
        const [newSurvey] = await tx.insert(surveys).values(survey).returning();
        
        console.log('Survey created in database successfully:', { 
          id: newSurvey.id, 
          title: newSurvey.title,
          status: newSurvey.status 
        });
        
        // Verify the survey was actually saved within the transaction
        const [verification] = await tx.select().from(surveys).where(eq(surveys.id, newSurvey.id));
        if (!verification) {
          console.error('CRITICAL: Survey not found immediately after creation within transaction!', newSurvey.id);
          throw new Error('Survey creation failed - survey not persisted to database');
        }
        
        console.log('Survey creation verified successfully within transaction');
        return newSurvey;
      } catch (error) {
        console.error('Database error creating survey:', error);
        throw error;
      }
    });
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

  async bulkReorderPages(surveyId: string, pageOrders: Array<{ id: string; order: number }>): Promise<SurveyPage[]> {
    return await db.transaction(async (tx: DbTransaction) => {
      const reorderedPages: SurveyPage[] = [];

      for (const { id, order } of pageOrders) {
        const [updatedPage] = await tx
          .update(surveyPages)
          .set({ order })
          .where(and(eq(surveyPages.id, id), eq(surveyPages.surveyId, surveyId)))
          .returning();

        if (updatedPage) {
          reorderedPages.push(updatedPage);
        }
      }

      return reorderedPages;
    });
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

  async bulkReorderQuestions(surveyId: string, questionOrders: Array<{ id: string; pageId: string; order: number }>): Promise<Question[]> {
    return await db.transaction(async (tx: DbTransaction) => {
      const reorderedQuestions: Question[] = [];

      for (const { id, pageId, order } of questionOrders) {
        // Verify the question belongs to a page in this survey
        const [page] = await tx
          .select()
          .from(surveyPages)
          .where(and(eq(surveyPages.id, pageId), eq(surveyPages.surveyId, surveyId)));

        if (!page) {
          throw new Error(`Page ${pageId} does not belong to survey ${surveyId}`);
        }

        const [updatedQuestion] = await tx
          .update(questions)
          .set({ pageId, order })
          .where(eq(questions.id, id))
          .returning();

        if (updatedQuestion) {
          reorderedQuestions.push(updatedQuestion);
        }
      }

      return reorderedQuestions;
    });
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
  
  // Global recipient operations
  async createGlobalRecipient(globalRecipient: InsertGlobalRecipient): Promise<GlobalRecipient> {
    const [newGlobalRecipient] = await db
      .insert(globalRecipients)
      .values({ ...globalRecipient, updatedAt: new Date() })
      .returning();
    return newGlobalRecipient;
  }

  async getGlobalRecipient(id: string): Promise<GlobalRecipient | undefined> {
    const [globalRecipient] = await db.select().from(globalRecipients).where(eq(globalRecipients.id, id));
    return globalRecipient;
  }

  async getGlobalRecipientsByCreator(creatorId: string): Promise<GlobalRecipient[]> {
    return await db
      .select()
      .from(globalRecipients)
      .where(eq(globalRecipients.creatorId, creatorId))
      .orderBy(desc(globalRecipients.createdAt));
  }

  async updateGlobalRecipient(id: string, updates: Partial<InsertGlobalRecipient>): Promise<GlobalRecipient> {
    const [updatedGlobalRecipient] = await db
      .update(globalRecipients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(globalRecipients.id, id))
      .returning();
    return updatedGlobalRecipient;
  }

  async deleteGlobalRecipient(id: string): Promise<void> {
    await db
      .delete(globalRecipients)
      .where(eq(globalRecipients.id, id));
  }

  async getGlobalRecipientByCreatorAndEmail(creatorId: string, email: string): Promise<GlobalRecipient | undefined> {
    const [globalRecipient] = await db
      .select()
      .from(globalRecipients)
      .where(and(eq(globalRecipients.creatorId, creatorId), eq(globalRecipients.email, email)));
    return globalRecipient;
  }

  async bulkDeleteGlobalRecipients(ids: string[], creatorId: string): Promise<BulkOperationResult> {
    try {
      // Verify ownership of all recipients before deletion
      const recipientsToDelete = await db
        .select()
        .from(globalRecipients)
        .where(and(inArray(globalRecipients.id, ids), eq(globalRecipients.creatorId, creatorId)));

      if (recipientsToDelete.length !== ids.length) {
        return {
          success: false,
          updatedCount: 0,
          errors: ["Some recipients not found or access denied"]
        };
      }

      await db
        .delete(globalRecipients)
        .where(and(inArray(globalRecipients.id, ids), eq(globalRecipients.creatorId, creatorId)));

      return {
        success: true,
        updatedCount: ids.length,
        errors: []
      };
    } catch (error) {
      console.error("Error in bulk delete global recipients:", error);
      return {
        success: false,
        updatedCount: 0,
        errors: ["Failed to bulk delete global recipients"]
      };
    }
  }

  async bulkAddGlobalRecipientsToSurvey(surveyId: string, globalRecipientIds: string[], creatorId: string): Promise<Recipient[]> {
    // Get the global recipients and verify ownership
    const globalRecipientsToAdd = await db
      .select()
      .from(globalRecipients)
      .where(and(inArray(globalRecipients.id, globalRecipientIds), eq(globalRecipients.creatorId, creatorId)));

    if (globalRecipientsToAdd.length === 0) {
      throw new Error("No valid global recipients found");
    }

    // Check for duplicates in the survey
    const existingRecipients = await db
      .select()
      .from(recipients)
      .where(eq(recipients.surveyId, surveyId));

    const existingEmails = new Set(existingRecipients.map((r: typeof recipients.$inferSelect) => r.email.toLowerCase()));
    const recipientsToAdd = globalRecipientsToAdd.filter((gr: typeof globalRecipients.$inferSelect) =>
      !existingEmails.has(gr.email.toLowerCase())
    );

    if (recipientsToAdd.length === 0) {
      throw new Error("All selected recipients are already in this survey");
    }

    // Create survey recipients from global recipients
    const newRecipients: Recipient[] = [];
    for (const globalRecipient of recipientsToAdd) {
      const token = randomUUID();
      const recipientData = {
        surveyId,
        name: globalRecipient.name,
        email: globalRecipient.email,
        token
      };
      
      const [newRecipient] = await db
        .insert(recipients)
        .values(recipientData)
        .returning();
      
      newRecipients.push(newRecipient);
    }

    return newRecipients;
  }

  async checkRecipientDuplicatesInSurvey(surveyId: string, emails: string[]): Promise<string[]> {
    const existingRecipients = await db
      .select()
      .from(recipients)
      .where(eq(recipients.surveyId, surveyId));

    const existingEmails = new Set(existingRecipients.map((r: typeof recipients.$inferSelect) => r.email.toLowerCase()));
    return emails.filter((email: string) => existingEmails.has(email.toLowerCase()));
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

  async getAnswer(id: string): Promise<Answer | undefined> {
    const [answer] = await db
      .select()
      .from(answers)
      .where(eq(answers.id, id));
    return answer;
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
        subquestionId: answers.subquestionId,
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
          loopConfig: questions.loopConfig,
          conditionalLogic: questions.conditionalLogic,
          order: questions.order,
          createdAt: questions.createdAt,
        }
      })
      .from(answers)
      .innerJoin(questions, eq(answers.questionId, questions.id))
      .where(eq(answers.responseId, responseId))
      .orderBy(questions.order);
    
    return result.map((row: any) => ({
      id: row.id,
      responseId: row.responseId,
      questionId: row.questionId,
      subquestionId: row.subquestionId,
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

  async getAnalyticsBySurvey(surveyId: string): Promise<AnalyticsEvent[]> {
    return await db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.surveyId, surveyId))
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

      // Calculate actual completion time data
      const timeSpentData = await this.getTimeSpentData(survey.surveyId);
      const completedTimeData = timeSpentData.filter(data => {
        // Check if response was completed by looking for survey_complete events
        return data.totalTime > 0;
      });
      
      const avgCompletionTime = completedTimeData.length > 0
        ? completedTimeData.reduce((sum, data) => sum + data.totalTime, 0) / completedTimeData.length / 60000 // Convert to minutes
        : 0;
        
      const sortedCompletionTimes = completedTimeData.map(data => data.totalTime).sort((a, b) => a - b);
      const medianCompletionTime = sortedCompletionTimes.length > 0
        ? sortedCompletionTimes[Math.floor(sortedCompletionTimes.length / 2)] / 60000
        : 0;
        
      const totalTimeSpent = completedTimeData.reduce((sum, data) => sum + data.totalTime, 0) / 60000;
      
      // Calculate drop-off rate
      const [totalStartedResult] = await db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.surveyId, survey.surveyId),
            eq(analyticsEvents.event, 'survey_start')
          )
        );
        
      const dropOffRate = totalStartedResult.count > 0
        ? Math.round(((totalStartedResult.count - completedCount) / totalStartedResult.count) * 100)
        : 0;
        
      // Find most and least answered questions
      const questionAnalytics = await this.getQuestionAnalytics(survey.surveyId);
      const mostAnswered = questionAnalytics.reduce((max, q) => q.totalAnswers > max.totalAnswers ? q : max, questionAnalytics[0] || { totalAnswers: 0, questionId: undefined });
      const leastAnswered = questionAnalytics.reduce((min, q) => q.totalAnswers < min.totalAnswers ? q : min, questionAnalytics[0] || { totalAnswers: Infinity, questionId: undefined });

      analytics.push({
        surveyId: survey.surveyId,
        title: survey.title,
        responseCount,
        completionRate,
        avgCompletionTime,
        medianCompletionTime,
        totalTimeSpent,
        dropOffRate,
        mostAnsweredQuestionId: mostAnswered?.questionId,
        leastAnsweredQuestionId: leastAnswered?.questionId,
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

    // Get time data for each day
    const trendsWithTime: ResponseTrend[] = [];
    
    for (const row of trendsData) {
      // Get time data for responses created on this date
      const dayTimeData = await db
        .select({
          duration: analyticsEvents.duration,
          responseId: analyticsEvents.responseId,
        })
        .from(analyticsEvents)
        .innerJoin(responses, eq(analyticsEvents.responseId, responses.id))
        .innerJoin(surveys, eq(responses.surveyId, surveys.id))
        .where(
          and(
            eq(surveys.creatorId, creatorId),
            sql`DATE(${responses.createdAt}) = ${row.date}`,
            sql`duration IS NOT NULL`,
            eq(analyticsEvents.event, 'survey_complete')
          )
        );
        
      const avgCompletionTime = dayTimeData.length > 0
        ? dayTimeData.reduce((sum: number, event: any) => sum + (event.duration || 0), 0) / dayTimeData.length / 60000
        : 0;

      const totalTimeSpent = dayTimeData.reduce((sum: number, event: any) => sum + (event.duration || 0), 0) / 60000;
      
      trendsWithTime.push({
        date: row.date,
        count: row.total,
        completed: Number(row.completed),
        avgCompletionTime,
        totalTimeSpent,
      });
    }
    
    return trendsWithTime;
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

  // Advanced analytics methods
  async getQuestionAnalytics(surveyId: string): Promise<QuestionAnalytics[]> {
    // Get all questions for this survey
    const surveyQuestions = await db
      .select({
        questionId: questions.id,
        questionTitle: questions.title,
        questionType: questions.type,
        pageId: questions.pageId,
      })
      .from(questions)
      .innerJoin(surveyPages, eq(questions.pageId, surveyPages.id))
      .where(eq(surveyPages.surveyId, surveyId));

    const analytics: QuestionAnalytics[] = [];

    for (const question of surveyQuestions) {
      // Count views (question_focus events)
      const [viewsResult] = await db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.surveyId, surveyId),
            eq(analyticsEvents.questionId, question.questionId),
            eq(analyticsEvents.event, 'question_focus')
          )
        );

      // Count answers
      const [answersResult] = await db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.surveyId, surveyId),
            eq(analyticsEvents.questionId, question.questionId),
            eq(analyticsEvents.event, 'question_answer')
          )
        );

      // Count skips
      const [skipsResult] = await db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.surveyId, surveyId),
            eq(analyticsEvents.questionId, question.questionId),
            eq(analyticsEvents.event, 'question_skip')
          )
        );

      // Calculate average time spent
      const timeEvents = await db
        .select({ duration: analyticsEvents.duration })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.surveyId, surveyId),
            eq(analyticsEvents.questionId, question.questionId),
            sql`duration IS NOT NULL`
          )
        );

      const totalViews = viewsResult.count;
      const totalAnswers = answersResult.count;
      const totalSkips = skipsResult.count;
      const avgTimeSpent = timeEvents.length > 0
        ? timeEvents.reduce((sum: number, event: any) => sum + (event.duration || 0), 0) / timeEvents.length / 1000
        : 0;

      const sortedTimes = timeEvents.map((e: any) => e.duration || 0).sort((a: number, b: number) => a - b);
      const medianTimeSpent = sortedTimes.length > 0
        ? sortedTimes[Math.floor(sortedTimes.length / 2)] / 1000
        : 0;

      analytics.push({
        questionId: question.questionId,
        questionTitle: question.questionTitle,
        questionType: question.questionType,
        pageId: question.pageId,
        totalViews,
        totalAnswers,
        totalSkips,
        answerRate: totalViews > 0 ? Math.round((totalAnswers / totalViews) * 100) : 0,
        avgTimeSpent,
        medianTimeSpent,
        dropOffCount: totalViews - totalAnswers - totalSkips,
      });
    }

    return analytics;
  }

  async getPageAnalytics(surveyId: string): Promise<PageAnalytics[]> {
    // Get all pages for this survey
    const pages = await db
      .select({
        pageId: surveyPages.id,
        pageTitle: surveyPages.title,
        pageOrder: surveyPages.order,
      })
      .from(surveyPages)
      .where(eq(surveyPages.surveyId, surveyId))
      .orderBy(surveyPages.order);

    const analytics: PageAnalytics[] = [];

    for (const page of pages) {
      // Count page views
      const [viewsResult] = await db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.surveyId, surveyId),
            eq(analyticsEvents.pageId, page.pageId),
            eq(analyticsEvents.event, 'page_view')
          )
        );

      // Count page completions (page_leave events)
      const [completionsResult] = await db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.surveyId, surveyId),
            eq(analyticsEvents.pageId, page.pageId),
            eq(analyticsEvents.event, 'page_leave')
          )
        );

      // Calculate average time spent on page
      const pageTimeEvents = await db
        .select({ duration: analyticsEvents.duration })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.surveyId, surveyId),
            eq(analyticsEvents.pageId, page.pageId),
            eq(analyticsEvents.event, 'page_leave'),
            sql`duration IS NOT NULL`
          )
        );

      const totalViews = viewsResult.count;
      const totalCompletions = completionsResult.count;
      const avgTimeSpent = pageTimeEvents.length > 0
        ? pageTimeEvents.reduce((sum: number, event: any) => sum + (event.duration || 0), 0) / pageTimeEvents.length / 1000
        : 0;

      const sortedTimes = pageTimeEvents.map((e: any) => e.duration || 0).sort((a: number, b: number) => a - b);
      const medianTimeSpent = sortedTimes.length > 0
        ? sortedTimes[Math.floor(sortedTimes.length / 2)] / 1000
        : 0;

      // Get question analytics for this page
      const questionAnalytics = await this.getQuestionAnalytics(surveyId);
      const pageQuestions = questionAnalytics.filter(q => q.pageId === page.pageId);

      analytics.push({
        pageId: page.pageId,
        pageTitle: page.pageTitle,
        pageOrder: page.pageOrder,
        totalViews,
        totalCompletions,
        completionRate: totalViews > 0 ? Math.round((totalCompletions / totalViews) * 100) : 0,
        avgTimeSpent,
        medianTimeSpent,
        dropOffCount: totalViews - totalCompletions,
        questions: pageQuestions,
      });
    }

    return analytics;
  }

  async getCompletionFunnelData(surveyId: string): Promise<CompletionFunnelData[]> {
    const pageAnalytics = await this.getPageAnalytics(surveyId);
    
    return pageAnalytics.map(page => ({
      pageId: page.pageId,
      pageTitle: page.pageTitle,
      pageOrder: page.pageOrder,
      entrances: page.totalViews,
      exits: page.dropOffCount,
      completions: page.totalCompletions,
      dropOffRate: page.totalViews > 0 ? Math.round((page.dropOffCount / page.totalViews) * 100) : 0,
    }));
  }

  async getTimeSpentData(surveyId: string): Promise<TimeSpentData[]> {
    // Get all responses for this survey
    const surveyResponses = await db
      .select({ responseId: responses.id })
      .from(responses)
      .where(eq(responses.surveyId, surveyId));

    const timeSpentData: TimeSpentData[] = [];

    for (const response of surveyResponses) {
      // Get all time-based events for this response
      const events = await db
        .select({
          pageId: analyticsEvents.pageId,
          questionId: analyticsEvents.questionId,
          duration: analyticsEvents.duration,
          event: analyticsEvents.event,
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.responseId, response.responseId),
            sql`duration IS NOT NULL`
          )
        );

      const totalTime = events.reduce((sum: number, event: any) => sum + (event.duration || 0), 0);

      const pageTimeSpent = events
        .filter((e: any) => e.pageId && e.event === 'page_leave')
        .map((e: any) => ({ pageId: e.pageId!, duration: e.duration || 0 }));

      const questionTimeSpent = events
        .filter((e: any) => e.questionId && (e.event === 'question_answer' || e.event === 'question_skip'))
        .map((e: any) => ({ questionId: e.questionId!, duration: e.duration || 0 }));

      timeSpentData.push({
        surveyId,
        responseId: response.responseId,
        totalTime,
        pageTimeSpent,
        questionTimeSpent,
      });
    }

    return timeSpentData;
  }

  async getEngagementMetrics(surveyId: string): Promise<EngagementMetrics> {
    const timeSpentData = await this.getTimeSpentData(surveyId);
    
    // Calculate average session duration
    const avgSessionDuration = timeSpentData.length > 0
      ? timeSpentData.reduce((sum, data) => sum + data.totalTime, 0) / timeSpentData.length / 60000 // Convert to minutes
      : 0;

    // Calculate bounce rate (responses with no answers)
    const [totalResponsesResult] = await db
      .select({ count: count() })
      .from(responses)
      .where(eq(responses.surveyId, surveyId));

    const uniqueAnsweredResponses = await db
      .select({ responseId: analyticsEvents.responseId })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.surveyId, surveyId),
          eq(analyticsEvents.event, 'question_answer')
        )
      )
      .groupBy(analyticsEvents.responseId);

    const bounceRate = totalResponsesResult.count > 0
      ? Math.round(((totalResponsesResult.count - uniqueAnsweredResponses.length) / totalResponsesResult.count) * 100)
      : 0;

    // Calculate engagement score (simplified)
    const engagementScore = Math.max(0, Math.min(100, Math.round(100 - bounceRate + (avgSessionDuration * 10))));

    // Get completion trends by hour
    const completionTrends = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM timestamp)`,
        completions: count(),
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.surveyId, surveyId),
          eq(analyticsEvents.event, 'survey_complete')
        )
      )
      .groupBy(sql`EXTRACT(HOUR FROM timestamp)`);

    const peakEngagementHour = completionTrends.length > 0
      ? completionTrends.reduce((max: any, current: any) => current.completions > max.completions ? current : max).hour
      : 12; // Default to noon

    return {
      surveyId,
      avgSessionDuration,
      bounceRate,
      engagementScore,
      peakEngagementHour,
      completionTrends: completionTrends.map((trend: any) => ({ hour: trend.hour, completions: trend.completions })),
    };
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
      answerId: newFile.answerId,
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
      answerId: file.answerId,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      uploadedAt: file.uploadedAt!
    };
  }

  async getFilesByAnswer(answerId: string): Promise<FileMetadata[]> {
    const fileList = await db.select().from(files).where(eq(files.answerId, answerId));
    return fileList.map((file: any) => ({
      id: file.id,
      answerId: file.answerId,
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

  // Anonymous survey operations
  async getSurveyByPublicLink(publicLink: string): Promise<Survey | undefined> {
    console.log('Looking up survey by public link in database:', publicLink);
    
    try {
      const [survey] = await db.select().from(surveys).where(eq(surveys.publicLink, publicLink));
      
      if (survey) {
        console.log('Found survey by public link:', {
          id: survey.id,
          title: survey.title,
          publicLink: survey.publicLink,
          allowAnonymous: survey.allowAnonymous,
          status: survey.status
        });
      } else {
        console.log('No survey found for public link:', publicLink);
        
        // Debug: Let's see what surveys exist with public links
        const allSurveysWithPublicLinks = await db
          .select({ id: surveys.id, title: surveys.title, publicLink: surveys.publicLink })
          .from(surveys)
          .where(sql`${surveys.publicLink} IS NOT NULL`);
        
        console.log('All surveys with public links:', allSurveysWithPublicLinks);
      }
      
      return survey;
    } catch (error) {
      console.error('Database error looking up survey by public link:', error);
      throw error;
    }
  }

  async generatePublicLink(surveyId: string): Promise<string> {
    const publicLink = randomUUID();
    await db
      .update(surveys)
      .set({ 
        publicLink,
        updatedAt: new Date()
      })
      .where(eq(surveys.id, surveyId));
    return publicLink;
  }

  async enableAnonymousAccess(surveyId: string, config: { accessType: string; anonymousConfig?: AnonymousSurveyConfig }): Promise<Survey> {
    console.log('Enabling anonymous access in database for survey:', surveyId);

    return await db.transaction(async (tx: DbTransaction) => {
      // First verify the survey exists within transaction
      const [existingSurvey] = await tx.select().from(surveys).where(eq(surveys.id, surveyId));
      if (!existingSurvey) {
        console.error('Survey not found when enabling anonymous access:', surveyId);
        throw new Error('Survey not found - cannot enable anonymous access');
      }
      
      console.log('Survey exists, proceeding with anonymous access enablement:', {
        id: existingSurvey.id,
        title: existingSurvey.title,
        currentStatus: existingSurvey.status,
        hasExistingPublicLink: !!existingSurvey.publicLink,
        allowAnonymous: existingSurvey.allowAnonymous
      });

      // Check if anonymous access is already enabled with a public link (idempotent behavior)
      if (existingSurvey.allowAnonymous && existingSurvey.publicLink) {
        console.log('Anonymous access already enabled, updating configuration only:', {
          existingPublicLink: existingSurvey.publicLink,
          currentAccessType: existingSurvey.anonymousAccessType,
          newAccessType: config.accessType
        });
        
        // Update only the configuration without regenerating the public link
        const [updatedSurvey] = await tx
          .update(surveys)
          .set({
            anonymousAccessType: config.accessType as any,
            anonymousConfig: config.anonymousConfig ? JSON.stringify(config.anonymousConfig) : null,
            updatedAt: new Date()
          })
          .where(eq(surveys.id, surveyId))
          .returning();
        
        if (!updatedSurvey) {
          console.error('No survey returned after configuration update');
          throw new Error('Survey configuration update failed');
        }
        
        console.log('Anonymous access configuration updated (idempotent):', {
          id: updatedSurvey.id,
          publicLink: updatedSurvey.publicLink, // Unchanged
          anonymousAccessType: updatedSurvey.anonymousAccessType,
          status: updatedSurvey.status
        });
        
        return updatedSurvey;
      }

      // Auto-publish draft surveys when enabling anonymous access (only from draft → open)
      const shouldPublish = existingSurvey.status === 'draft';
      if (shouldPublish) {
        console.log('Auto-publishing draft survey for anonymous access');
      }
      
      // Generate new public link only if one doesn't exist
      const publicLink = existingSurvey.publicLink || randomUUID();
      console.log('Using public link:', { 
        isNew: !existingSurvey.publicLink,
        publicLink: publicLink
      });
      
      try {
        const [updatedSurvey] = await tx
          .update(surveys)
          .set({
            allowAnonymous: true,
            anonymousAccessType: config.accessType as any,
            publicLink,
            status: shouldPublish ? 'open' : existingSurvey.status, // Auto-publish drafts only
            anonymousConfig: config.anonymousConfig ? JSON.stringify(config.anonymousConfig) : null,
            updatedAt: new Date()
          })
          .where(eq(surveys.id, surveyId))
          .returning();
        
        if (!updatedSurvey) {
          console.error('No survey returned after update operation');
          throw new Error('Survey update failed - no result returned');
        }
        
        console.log('Survey updated with anonymous access:', {
          id: updatedSurvey.id,
          publicLink: updatedSurvey.publicLink,
          allowAnonymous: updatedSurvey.allowAnonymous,
          anonymousAccessType: updatedSurvey.anonymousAccessType,
          status: updatedSurvey.status,
          autoPublished: shouldPublish,
          wasIdempotent: !!existingSurvey.publicLink
        });
        
        // Verify the survey can be found by public link within the transaction
        const [verification] = await tx.select().from(surveys).where(eq(surveys.publicLink, updatedSurvey.publicLink || ''));
        if (!verification) {
          console.error('CRITICAL: Survey not found by public link immediately after creation!', updatedSurvey.publicLink);
          throw new Error('Anonymous access enablement failed - survey not findable by public link');
        }
        
        console.log('Anonymous access enablement verified successfully within transaction');
        return updatedSurvey;
      } catch (error) {
        console.error('Database error enabling anonymous access:', error);
        throw error;
      }
    });
  }

  async disableAnonymousAccess(surveyId: string): Promise<Survey> {
    const [updatedSurvey] = await db
      .update(surveys)
      .set({
        allowAnonymous: false,
        anonymousAccessType: 'disabled',
        publicLink: null,
        anonymousConfig: null,
        updatedAt: new Date()
      })
      .where(eq(surveys.id, surveyId))
      .returning();
    
    if (!updatedSurvey) {
      throw new Error('Survey not found');
    }
    
    return updatedSurvey;
  }

  async createAnonymousResponse(data: {
    surveyId: string;
    ipAddress: string;
    userAgent?: string;
    sessionId?: string;
    anonymousMetadata?: any;
  }): Promise<Response> {
    const [newResponse] = await db.insert(responses).values({
      surveyId: data.surveyId,
      recipientId: null, // No recipient for anonymous responses
      isAnonymous: true,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      sessionId: data.sessionId,
      anonymousMetadata: data.anonymousMetadata ? JSON.stringify(data.anonymousMetadata) : null,
      completed: false
    }).returning();
    
    return newResponse;
  }

  async checkAnonymousResponseLimit(surveyId: string, ipAddress: string, sessionId?: string): Promise<boolean> {
    // Get survey configuration first
    const survey = await this.getSurvey(surveyId);
    if (!survey || !survey.allowAnonymous) {
      return false; // Survey doesn't allow anonymous responses
    }

    const accessType = survey.anonymousAccessType;
    
    switch (accessType) {
      case 'unlimited':
        return true; // No limits
      
      case 'one_per_ip':
        // Check if this IP has already responded
        const existingIPResponse = await db
          .select()
          .from(anonymousResponseTracking)
          .where(
            and(
              eq(anonymousResponseTracking.surveyId, surveyId),
              eq(anonymousResponseTracking.ipAddress, ipAddress)
            )
          )
          .limit(1);
        return existingIPResponse.length === 0;
      
      case 'one_per_session':
        if (!sessionId) return false;
        // Check if this session has already responded
        const existingSessionResponse = await db
          .select()
          .from(anonymousResponseTracking)
          .where(
            and(
              eq(anonymousResponseTracking.surveyId, surveyId),
              eq(anonymousResponseTracking.sessionId, sessionId)
            )
          )
          .limit(1);
        return existingSessionResponse.length === 0;
      
      default:
        return false; // Unknown access type, deny access
    }
  }

  async createAnonymousResponseTracking(tracking: InsertAnonymousResponseTracking): Promise<AnonymousResponseTracking> {
    const [newTracking] = await db.insert(anonymousResponseTracking).values(tracking).returning();
    return newTracking;
  }

  async getAnonymousResponsesBySurvey(surveyId: string): Promise<Response[]> {
    return await db
      .select()
      .from(responses)
      .where(
        and(
          eq(responses.surveyId, surveyId),
          eq(responses.isAnonymous, true)
        )
      )
      .orderBy(desc(responses.createdAt));
  }

  async getAnonymousResponseCount(surveyId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(responses)
      .where(
        and(
          eq(responses.surveyId, surveyId),
          eq(responses.isAnonymous, true)
        )
      );
    return result.count || 0;
  }
}

export const storage = new DatabaseStorage();
