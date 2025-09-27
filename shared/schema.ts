import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  uuid,
  boolean,
  integer,
  pgEnum
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'creator']);

// Survey status enum
export const surveyStatusEnum = pgEnum('survey_status', ['draft', 'open', 'closed']);

// Question type enum
export const questionTypeEnum = pgEnum('question_type', [
  'short_text', 
  'long_text', 
  'multiple_choice', 
  'radio', 
  'yes_no', 
  'date_time', 
  'file_upload',
  'loop_group'
]);

// Users table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default('creator').notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Surveys table
export const surveys = pgTable("surveys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  creatorId: varchar("creator_id").references(() => users.id).notNull(),
  status: surveyStatusEnum("status").default('draft').notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Survey pages table
export const surveyPages = pgTable("survey_pages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: uuid("survey_id").references(() => surveys.id, { onDelete: 'cascade' }).notNull(),
  title: varchar("title").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Questions table
export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  pageId: uuid("page_id").references(() => surveyPages.id, { onDelete: 'cascade' }).notNull(),
  type: questionTypeEnum("type").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  required: boolean("required").default(false),
  options: jsonb("options"), // For multiple choice, radio options
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Loop group subquestions table
export const loopGroupSubquestions = pgTable("loop_group_subquestions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  loopQuestionId: uuid("loop_question_id").references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  type: questionTypeEnum("type").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  required: boolean("required").default(false),
  options: jsonb("options"),
  order: integer("order").notNull(),
});

// Conditional rules table
export const conditionalRules = pgTable("conditional_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: uuid("survey_id").references(() => surveys.id, { onDelete: 'cascade' }).notNull(),
  conditionQuestionId: uuid("condition_question_id").references(() => questions.id).notNull(),
  conditionValue: varchar("condition_value").notNull(),
  targetQuestionId: uuid("target_question_id").references(() => questions.id),
  targetPageId: uuid("target_page_id").references(() => surveyPages.id),
  action: varchar("action").notNull(), // 'show' or 'hide'
});

// Recipients table
export const recipients = pgTable("recipients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: uuid("survey_id").references(() => surveys.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  token: varchar("token").unique().notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Responses table
export const responses = pgTable("responses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: uuid("survey_id").references(() => surveys.id, { onDelete: 'cascade' }).notNull(),
  recipientId: uuid("recipient_id").references(() => recipients.id).notNull(),
  completed: boolean("completed").default(false),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Answers table
export const answers = pgTable("answers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  responseId: uuid("response_id").references(() => responses.id, { onDelete: 'cascade' }).notNull(),
  questionId: uuid("question_id").references(() => questions.id).notNull(),
  loopIndex: integer("loop_index"), // For loop group answers
  value: jsonb("value").notNull(), // Stores answer data as JSON
  createdAt: timestamp("created_at").defaultNow(),
});

// Files table
export const files = pgTable("files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  answerId: uuid("answer_id").references(() => answers.id, { onDelete: 'cascade' }).notNull(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  mimeType: varchar("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Analytics events table
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  responseId: uuid("response_id").references(() => responses.id, { onDelete: 'cascade' }).notNull(),
  event: varchar("event").notNull(), // 'page_view', 'question_answer', 'survey_complete'
  data: jsonb("data"), // Event-specific data
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  surveys: many(surveys),
}));

export const surveysRelations = relations(surveys, ({ one, many }) => ({
  creator: one(users, {
    fields: [surveys.creatorId],
    references: [users.id],
  }),
  pages: many(surveyPages),
  recipients: many(recipients),
  responses: many(responses),
  conditionalRules: many(conditionalRules),
}));

export const surveyPagesRelations = relations(surveyPages, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyPages.surveyId],
    references: [surveys.id],
  }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  page: one(surveyPages, {
    fields: [questions.pageId],
    references: [surveyPages.id],
  }),
  subquestions: many(loopGroupSubquestions),
  answers: many(answers),
}));

export const recipientsRelations = relations(recipients, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [recipients.surveyId],
    references: [surveys.id],
  }),
  responses: many(responses),
}));

export const responsesRelations = relations(responses, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [responses.surveyId],
    references: [surveys.id],
  }),
  recipient: one(recipients, {
    fields: [responses.recipientId],
    references: [recipients.id],
  }),
  answers: many(answers),
  analyticsEvents: many(analyticsEvents),
}));

export const answersRelations = relations(answers, ({ one, many }) => ({
  response: one(responses, {
    fields: [answers.responseId],
    references: [responses.id],
  }),
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
  files: many(files),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSurveySchema = createInsertSchema(surveys).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSurveyPageSchema = createInsertSchema(surveyPages).omit({ id: true, createdAt: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true, createdAt: true });
export const insertRecipientSchema = createInsertSchema(recipients).omit({ id: true, createdAt: true, token: true });
export const insertResponseSchema = createInsertSchema(responses).omit({ id: true, createdAt: true });
export const insertAnswerSchema = createInsertSchema(answers).omit({ id: true, createdAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = typeof insertSurveySchema._type;
export type SurveyPage = typeof surveyPages.$inferSelect;
export type InsertSurveyPage = typeof insertSurveyPageSchema._type;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof insertQuestionSchema._type;
export type Recipient = typeof recipients.$inferSelect;
export type InsertRecipient = typeof insertRecipientSchema._type;
export type Response = typeof responses.$inferSelect;
export type InsertResponse = typeof insertResponseSchema._type;
export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = typeof insertAnswerSchema._type;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// Additional API response types
export interface DashboardStats {
  totalSurveys: number;
  activeSurveys: number;
  draftSurveys: number;
  closedSurveys: number;
  totalResponses: number;
  completionRate: number;
  avgResponsesPerSurvey: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'survey_created' | 'survey_published' | 'response_received' | 'survey_closed';
  title: string;
  description: string;
  timestamp: Date;
  surveyId?: string;
  responseId?: string;
}

export interface SurveyAnalytics {
  surveyId: string;
  title: string;
  responseCount: number;
  completionRate: number;
  avgCompletionTime: number; // in minutes
  lastResponseAt: Date | null;
  status: string;
}

export interface ResponseTrend {
  date: string;
  count: number;
  completed: number;
}

export interface BulkOperationRequest {
  surveyIds: string[];
  operation: 'close' | 'open' | 'delete' | 'archive';
}

export interface BulkOperationResult {
  success: boolean;
  updatedCount: number;
  errors: string[];
}

export interface SurveyDuplication {
  originalId: string;
  title: string;
  includeResponses?: boolean;
}
