import {
  users,
  surveys,
  surveyPages,
  questions,
  recipients,
  responses,
  answers,
  analyticsEvents,
  type User,
  type UpsertUser,
  type Survey,
  type InsertSurvey,
  type SurveyPage,
  type InsertSurveyPage,
  type Question,
  type InsertQuestion,
  type Recipient,
  type InsertRecipient,
  type Response,
  type InsertResponse,
  type Answer,
  type InsertAnswer,
  type AnalyticsEvent,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count } from "drizzle-orm";
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
  getSurveyPages(surveyId: string): Promise<SurveyPage[]>;
  updateSurveyPage(id: string, updates: Partial<InsertSurveyPage>): Promise<SurveyPage>;
  deleteSurveyPage(id: string): Promise<void>;
  
  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestionsByPage(pageId: string): Promise<Question[]>;
  updateQuestion(id: string, updates: Partial<InsertQuestion>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;
  
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
  updateResponse(id: string, updates: Partial<InsertResponse>): Promise<Response>;
  
  // Answer operations
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  getAnswersByResponse(responseId: string): Promise<Answer[]>;
  updateAnswer(id: string, updates: Partial<InsertAnswer>): Promise<Answer>;
  
  // Analytics operations
  createAnalyticsEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<AnalyticsEvent>;
  getAnalyticsByResponse(responseId: string): Promise<AnalyticsEvent[]>;
  
  // Dashboard stats
  getDashboardStats(creatorId: string): Promise<{
    totalSurveys: number;
    activeSurveys: number;
    totalResponses: number;
    completionRate: number;
  }>;
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

  async deleteQuestion(id: string): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
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
  
  // Dashboard stats
  async getDashboardStats(creatorId: string): Promise<{
    totalSurveys: number;
    activeSurveys: number;
    totalResponses: number;
    completionRate: number;
  }> {
    const [totalSurveysResult] = await db
      .select({ count: count() })
      .from(surveys)
      .where(eq(surveys.creatorId, creatorId));

    const [activeSurveysResult] = await db
      .select({ count: count() })
      .from(surveys)
      .where(and(eq(surveys.creatorId, creatorId), eq(surveys.status, 'open')));

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

    const totalResponses = totalResponsesResult.count;
    const completedResponses = completedResponsesResult.count;
    const completionRate = totalResponses > 0 ? Math.round((completedResponses / totalResponses) * 100) : 0;

    return {
      totalSurveys: totalSurveysResult.count,
      activeSurveys: activeSurveysResult.count,
      totalResponses,
      completionRate,
    };
  }
}

export const storage = new DatabaseStorage();
