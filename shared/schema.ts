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
import { z } from "zod";

// Session storage table for Google Auth
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

// Condition operator enum for conditional logic
export const conditionOperatorEnum = pgEnum('condition_operator', [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'greater_than',
  'less_than',
  'between',
  'is_empty',
  'is_not_empty'
]);

// Conditional action enum
export const conditionalActionEnum = pgEnum('conditional_action', [
  'show',
  'hide',
  'require',
  'make_optional'
]);

// Users table for Google Auth
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

// Anonymous access type enum
export const anonymousAccessTypeEnum = pgEnum('anonymous_access_type', ['disabled', 'unlimited', 'one_per_ip', 'one_per_session']);

// Surveys table
export const surveys = pgTable("surveys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  creatorId: varchar("creator_id").references(() => users.id).notNull(),
  status: surveyStatusEnum("status").default('draft').notNull(),
  // Anonymous survey configuration
  allowAnonymous: boolean("allow_anonymous").default(false),
  anonymousAccessType: anonymousAccessTypeEnum("anonymous_access_type").default('unlimited'),
  publicLink: varchar("public_link").unique(), // Generated public UUID for anonymous access
  anonymousConfig: jsonb("anonymous_config"), // Additional anonymous survey settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Unique index on publicLink for database-level UUID collision prevention
  index("surveys_public_link_unique_idx").on(table.publicLink),
]);

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
  loopConfig: jsonb("loop_config"), // For loop groups: {minIterations, maxIterations, addButtonText, removeButtonText}
  conditionalLogic: jsonb("conditional_logic"), // For conditional visibility and requirements
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Conditional rules table
export const conditionalRules = pgTable("conditional_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: uuid("survey_id").references(() => surveys.id, { onDelete: 'cascade' }).notNull(),
  conditionQuestionId: uuid("condition_question_id").references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  operator: conditionOperatorEnum("operator").notNull(),
  conditionValue: jsonb("condition_value").notNull(), // Support complex values for between, contains, etc.
  targetQuestionId: uuid("target_question_id").references(() => questions.id, { onDelete: 'cascade' }),
  targetPageId: uuid("target_page_id").references(() => surveyPages.id, { onDelete: 'cascade' }),
  action: conditionalActionEnum("action").notNull(),
  logicalOperator: varchar("logical_operator").default("AND"), // For multiple conditions: AND, OR
  order: integer("order").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
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

// Global recipients table (creator-owned, not tied to specific surveys)
export const globalRecipients = pgTable("global_recipients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  tags: text("tags").array(), // Optional tags for categorization/grouping
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Indices for performance
  index("global_recipients_creator_idx").on(table.creatorId),
  index("global_recipients_email_idx").on(table.email),
  index("global_recipients_creator_email_idx").on(table.creatorId, table.email),
]);

// Responses table
export const responses = pgTable("responses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: uuid("survey_id").references(() => surveys.id, { onDelete: 'cascade' }).notNull(),
  recipientId: uuid("recipient_id").references(() => recipients.id), // Made optional for anonymous responses
  completed: boolean("completed").default(false),
  submittedAt: timestamp("submitted_at"),
  // Anonymous response metadata
  isAnonymous: boolean("is_anonymous").default(false),
  ipAddress: varchar("ip_address"), // For anonymous response tracking and limiting
  userAgent: text("user_agent"), // For analytics
  sessionId: varchar("session_id"), // For one_per_session limiting
  anonymousMetadata: jsonb("anonymous_metadata"), // Additional anonymous response data
  createdAt: timestamp("created_at").defaultNow(),
});

// Answers table
export const answers = pgTable("answers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  responseId: uuid("response_id").references(() => responses.id, { onDelete: 'cascade' }).notNull(),
  questionId: uuid("question_id").references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  subquestionId: uuid("subquestion_id").references(() => loopGroupSubquestions.id, { onDelete: 'cascade' }), // For loop group subquestion answers
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
  surveyId: uuid("survey_id").references(() => surveys.id, { onDelete: 'cascade' }).notNull(),
  pageId: uuid("page_id").references(() => surveyPages.id, { onDelete: 'cascade' }),
  questionId: uuid("question_id").references(() => questions.id, { onDelete: 'cascade' }),
  event: varchar("event").notNull(), // 'page_view', 'page_leave', 'question_focus', 'question_answer', 'question_skip', 'survey_start', 'survey_complete', 'survey_abandon'
  data: jsonb("data"), // Event-specific data including time tracking
  duration: integer("duration"), // Time spent in milliseconds
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  // Performance indices for analytics queries
  index("analytics_survey_event_idx").on(table.surveyId, table.event),
  index("analytics_response_event_idx").on(table.responseId, table.event),
  index("analytics_question_event_idx").on(table.questionId, table.event),
  index("analytics_page_event_idx").on(table.pageId, table.event),
  index("analytics_timestamp_idx").on(table.timestamp),
  index("analytics_duration_idx").on(table.duration),
  // Composite indices for common query patterns
  index("analytics_survey_question_event_idx").on(table.surveyId, table.questionId, table.event),
  index("analytics_survey_page_event_idx").on(table.surveyId, table.pageId, table.event),
]);

// Anonymous response tracking table for IP/session limiting
export const anonymousResponseTracking = pgTable("anonymous_response_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: uuid("survey_id").references(() => surveys.id, { onDelete: 'cascade' }).notNull(),
  ipAddress: varchar("ip_address").notNull(),
  sessionId: varchar("session_id"),
  responseId: uuid("response_id").references(() => responses.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Indices for anonymous response limiting
  index("anonymous_tracking_survey_ip_idx").on(table.surveyId, table.ipAddress),
  index("anonymous_tracking_survey_session_idx").on(table.surveyId, table.sessionId),
]);

// System statistics table for tracking historical totals
export const systemStats = pgTable("system_stats", {
  id: integer("id").primaryKey().default(1), // Single row table
  totalSurveysCreated: integer("total_surveys_created").default(0).notNull(),
  totalSurveysDeleted: integer("total_surveys_deleted").default(0).notNull(),
  totalResponsesCollected: integer("total_responses_collected").default(0).notNull(),
  totalResponsesDeleted: integer("total_responses_deleted").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  surveys: many(surveys),
  globalRecipients: many(globalRecipients),
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

export const loopGroupSubquestionsRelations = relations(loopGroupSubquestions, ({ one }) => ({
  loopQuestion: one(questions, {
    fields: [loopGroupSubquestions.loopQuestionId],
    references: [questions.id],
  }),
}));

export const recipientsRelations = relations(recipients, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [recipients.surveyId],
    references: [surveys.id],
  }),
  responses: many(responses),
}));

export const globalRecipientsRelations = relations(globalRecipients, ({ one }) => ({
  creator: one(users, {
    fields: [globalRecipients.creatorId],
    references: [users.id],
  }),
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
  anonymousTracking: many(anonymousResponseTracking),
}));

export const anonymousResponseTrackingRelations = relations(anonymousResponseTracking, ({ one }) => ({
  survey: one(surveys, {
    fields: [anonymousResponseTracking.surveyId],
    references: [surveys.id],
  }),
  response: one(responses, {
    fields: [anonymousResponseTracking.responseId],
    references: [responses.id],
  }),
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
  subquestion: one(loopGroupSubquestions, {
    fields: [answers.subquestionId],
    references: [loopGroupSubquestions.id],
  }),
  files: many(files),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSurveySchema = createInsertSchema(surveys).omit({ id: true, createdAt: true, updatedAt: true, publicLink: true });
export const insertSurveyPageSchema = createInsertSchema(surveyPages).omit({ id: true, createdAt: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true, createdAt: true });
export const insertLoopGroupSubquestionSchema = createInsertSchema(loopGroupSubquestions).omit({ id: true, createdAt: true });
export const insertConditionalRuleSchema = createInsertSchema(conditionalRules).omit({ id: true, createdAt: true });
export const insertRecipientSchema = createInsertSchema(recipients).omit({ id: true, createdAt: true, token: true });
export const insertGlobalRecipientSchema = createInsertSchema(globalRecipients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertResponseSchema = createInsertSchema(responses).omit({ id: true, createdAt: true });
export const insertAnswerSchema = createInsertSchema(answers).omit({ id: true, createdAt: true });
export const insertAnonymousResponseTrackingSchema = createInsertSchema(anonymousResponseTracking).omit({ id: true, createdAt: true });
export const insertFileSchema = createInsertSchema(files).omit({ id: true, uploadedAt: true });

// Analytics event validation schema with strict validation
export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({ 
  id: true, 
  timestamp: true 
}).extend({
  event: z.enum(['page_view', 'page_leave', 'question_focus', 'question_blur', 'question_answer', 'question_skip', 'survey_start', 'survey_complete', 'survey_abandon']),
  responseId: z.string().uuid("Invalid response ID format"),
  surveyId: z.string().uuid("Invalid survey ID format"),
  pageId: z.string().uuid("Invalid page ID format").optional().nullable(),
  questionId: z.string().uuid("Invalid question ID format").optional(),
  duration: z.number().int().min(0, "Duration must be non-negative").optional(),
  data: z.record(z.any()).optional()
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = typeof insertSurveySchema._type;
export type SurveyPage = typeof surveyPages.$inferSelect;
export type InsertSurveyPage = typeof insertSurveyPageSchema._type;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof insertQuestionSchema._type;
export type LoopGroupSubquestion = typeof loopGroupSubquestions.$inferSelect;
export type InsertLoopGroupSubquestion = typeof insertLoopGroupSubquestionSchema._type;
export type ConditionalRule = typeof conditionalRules.$inferSelect;
export type InsertConditionalRule = typeof insertConditionalRuleSchema._type;
export type Recipient = typeof recipients.$inferSelect;
export type InsertRecipient = typeof insertRecipientSchema._type;
export type GlobalRecipient = typeof globalRecipients.$inferSelect;
export type InsertGlobalRecipient = typeof insertGlobalRecipientSchema._type;
export type Response = typeof responses.$inferSelect;
export type InsertResponse = typeof insertResponseSchema._type;
export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = typeof insertAnswerSchema._type;
export type File = typeof files.$inferSelect;
export type InsertFile = typeof insertFileSchema._type;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type AnonymousResponseTracking = typeof anonymousResponseTracking.$inferSelect;
export type InsertAnonymousResponseTracking = typeof insertAnonymousResponseTrackingSchema._type;
export type SystemStats = typeof systemStats.$inferSelect;

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
  medianCompletionTime: number; // in minutes
  totalTimeSpent: number; // in minutes
  dropOffRate: number; // percentage
  mostAnsweredQuestionId?: string;
  leastAnsweredQuestionId?: string;
  lastResponseAt: Date | null;
  status: string;
}

export interface ResponseTrend {
  date: string;
  count: number;
  completed: number;
  avgCompletionTime: number; // in minutes
  totalTimeSpent: number; // in minutes
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

// Loop group configuration types
export interface LoopGroupConfig {
  minIterations: number;
  maxIterations: number;
  addButtonText?: string;
  removeButtonText?: string;
  allowReorder?: boolean;
}

// Extended question type with subquestions for frontend usage
export interface QuestionWithSubquestions extends Question {
  subquestions?: LoopGroupSubquestion[];
}

// Loop instance data for responses
export interface LoopInstanceData {
  instanceIndex: number;
  answers: Record<string, any>;
}

// Conditional logic configuration types
export interface ConditionalLogicConfig {
  enabled: boolean;
  conditions: ConditionalCondition[];
  action: 'show' | 'hide' | 'require' | 'make_optional';
  logicalOperator?: 'AND' | 'OR'; // For multiple conditions
}

export interface ConditionalCondition {
  questionId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'is_empty' | 'is_not_empty';
  value: any; // Can be string, number, array, etc.
  secondValue?: any; // For 'between' operator
}

// Extended question type with conditional rules for frontend usage
export interface QuestionWithConditionalLogic extends Question {
  conditionalRules?: ConditionalRule[];
}

// File upload configuration types
export interface FileUploadConfig {
  acceptedTypes: string[]; // e.g., ['image/*', '.pdf', '.doc', '.docx']
  maxFileSize: number; // in bytes
  maxFiles: number; // maximum number of files
  required: boolean;
  allowMultiple: boolean;
}

// Enhanced analytics types
export interface QuestionAnalytics {
  questionId: string;
  questionTitle: string;
  questionType: string;
  pageId: string;
  totalResponses: number; // total survey responses
  totalViews: number;
  totalAnswers: number;
  totalSkips: number;
  answerRate: number; // percentage
  avgTimeSpent: number; // in seconds
  medianTimeSpent: number; // in seconds
  dropOffCount: number; // how many people left at this question
}

export interface PageAnalytics {
  pageId: string;
  pageTitle: string;
  pageOrder: number;
  totalViews: number;
  totalCompletions: number;
  completionRate: number; // percentage
  avgTimeSpent: number; // in seconds
  medianTimeSpent: number; // in seconds
  dropOffCount: number;
  questions: QuestionAnalytics[];
}

export interface CompletionFunnelData {
  pageId: string;
  pageTitle: string;
  pageOrder: number;
  entrances: number;
  exits: number;
  completions: number;
  dropOffRate: number;
}

export interface TimeSpentData {
  surveyId: string;
  responseId: string;
  totalTime: number; // in milliseconds
  pageTimeSpent: { pageId: string; duration: number }[];
  questionTimeSpent: { questionId: string; duration: number }[];
}

export interface EngagementMetrics {
  surveyId: string;
  avgSessionDuration: number; // in minutes
  bounceRate: number; // percentage who left without answering any questions
  engagementScore: number; // calculated based on time spent vs expected time
  peakEngagementHour: number; // hour of day with most engagement
  completionTrends: { hour: number; completions: number }[];
}

// Question aggregates types
export interface YesNoAggregation {
  yes: number;
  no: number;
}

export interface ChoiceAggregation {
  option: string;
  count: number;
  percent: number;
}

export interface TextAggregation {
  topKeywords: Array<{ word: string; count: number }>;
  totalWords: number;
}

export interface QuestionAggregate {
  questionId: string;
  questionTitle: string;
  questionType: string;
  totalAnswers: number;
  aggregation: YesNoAggregation | ChoiceAggregation[] | TextAggregation;
}

export interface QuestionAggregatesResponse {
  surveyId: string;
  questions: QuestionAggregate[];
}

// File metadata type
export interface FileMetadata {
  id: string;
  answerId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

// File upload response type
export interface FileUploadResponse {
  success: boolean;
  files: FileMetadata[];
  errors?: string[];
}

// Condition evaluation result
export interface ConditionalEvaluationResult {
  questionId: string;
  visible: boolean;
  required: boolean;
  reason?: string; // For debugging
}

// Anonymous survey configuration types
export interface AnonymousSurveyConfig {
  maxResponsesPerIP?: number; // For custom limiting
  cooldownPeriodHours?: number; // Time between responses from same IP
  collectUserAgent?: boolean;
  collectTimestamp?: boolean;
  requireCaptcha?: boolean; // Future extension
  customMessage?: string; // Message shown to anonymous users
}

// Anonymous response metadata
export interface AnonymousResponseMetadata {
  browserInfo?: {
    userAgent: string;
    language: string;
    timezone: string;
  };
  deviceInfo?: {
    isMobile: boolean;
    screenResolution: string;
  };
  accessInfo?: {
    referrer?: string;
    entryTime: number;
  };
}
