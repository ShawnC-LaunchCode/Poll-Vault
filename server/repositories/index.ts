/**
 * Repository Index
 * Central export point for all repository classes
 *
 * Repositories provide a clean abstraction layer over database operations,
 * encapsulating all data access logic and making it easier to test and maintain.
 */

// Export base repository and transaction type
export { BaseRepository, type DbTransaction } from "./BaseRepository";

// Export domain repositories
export { UserRepository, userRepository } from "./UserRepository";
export { SurveyRepository, surveyRepository } from "./SurveyRepository";
export { PageRepository, pageRepository } from "./PageRepository";
export { QuestionRepository, questionRepository } from "./QuestionRepository";
export { RecipientRepository, recipientRepository } from "./RecipientRepository";
export { ResponseRepository, responseRepository } from "./ResponseRepository";
export { AnalyticsRepository, analyticsRepository } from "./AnalyticsRepository";
export { FileRepository, fileRepository } from "./FileRepository";
export { SystemStatsRepository, systemStatsRepository } from "./SystemStatsRepository";

// Export type for Insert operations
export type { InsertAnalyticsEvent } from "./AnalyticsRepository";
