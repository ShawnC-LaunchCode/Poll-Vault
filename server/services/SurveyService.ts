import {
  surveyRepository,
  pageRepository,
  questionRepository,
  type DbTransaction
} from "../repositories";
import type {
  Survey,
  InsertSurvey,
  AnonymousSurveyConfig
} from "@shared/schema";
import { validateSurveyForPublish, canChangeStatus } from "./surveyValidation";

/**
 * Service layer for survey-related business logic
 * Orchestrates repository calls, handles authorization, and enforces business rules
 */
export class SurveyService {
  /**
   * Verify user owns the survey
   */
  async verifyOwnership(surveyId: string, userId: string): Promise<Survey> {
    const survey = await surveyRepository.findById(surveyId);

    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    return survey;
  }

  /**
   * Create a new survey with a default first page
   */
  async createSurvey(data: InsertSurvey, creatorId: string): Promise<Survey> {
    return await surveyRepository.transaction(async (tx) => {
      // Create survey
      const survey = await surveyRepository.create(
        {
          ...data,
          creatorId,
          status: 'draft'
        },
        tx
      );

      // Create default first page
      await pageRepository.create(
        {
          surveyId: survey.id,
          title: 'Page 1',
          order: 1
        },
        tx
      );

      return survey;
    });
  }

  /**
   * Get survey by ID (no ownership check)
   */
  async getSurvey(surveyId: string): Promise<Survey | undefined> {
    return await surveyRepository.findById(surveyId);
  }

  /**
   * Get survey by ID with ownership check
   */
  async getSurveyForUser(surveyId: string, userId: string): Promise<Survey> {
    return await this.verifyOwnership(surveyId, userId);
  }

  /**
   * Get all surveys for a creator
   */
  async getSurveysByCreator(creatorId: string): Promise<Survey[]> {
    return await surveyRepository.findByCreator(creatorId);
  }

  /**
   * Update survey with ownership check
   */
  async updateSurvey(
    surveyId: string,
    userId: string,
    updates: Partial<InsertSurvey>
  ): Promise<Survey> {
    // Verify ownership
    await this.verifyOwnership(surveyId, userId);

    // Update survey
    return await surveyRepository.update(surveyId, updates);
  }

  /**
   * Delete survey with ownership check
   */
  async deleteSurvey(surveyId: string, userId: string): Promise<void> {
    // Verify ownership
    await this.verifyOwnership(surveyId, userId);

    // Delete survey (cascade will handle related data)
    await surveyRepository.delete(surveyId);
  }

  /**
   * Validate survey for publishing
   */
  async validateForPublish(surveyId: string, userId: string) {
    // Verify ownership
    await this.verifyOwnership(surveyId, userId);

    // Run validation
    return await validateSurveyForPublish(surveyId);
  }

  /**
   * Change survey status with validation
   */
  async changeStatus(
    surveyId: string,
    userId: string,
    newStatus: string
  ): Promise<{ survey: Survey; message: string }> {
    // Verify ownership
    const survey = await this.verifyOwnership(surveyId, userId);

    // Validate status value
    if (!['draft', 'open', 'closed'].includes(newStatus)) {
      throw new Error("Invalid status. Must be 'draft', 'open', or 'closed'");
    }

    // Check if status change is allowed
    const statusCheck = await canChangeStatus(surveyId, survey.status, newStatus);
    if (!statusCheck.allowed) {
      throw new Error(statusCheck.reason || "Status change not allowed");
    }

    // Update status
    const updatedSurvey = await surveyRepository.update(surveyId, { status: newStatus as any });

    return {
      survey: updatedSurvey,
      message: statusCheck.reason || "Status updated successfully"
    };
  }

  /**
   * Enable anonymous access for a survey
   */
  async enableAnonymousAccess(
    surveyId: string,
    userId: string,
    config: {
      accessType: string;
      anonymousConfig?: AnonymousSurveyConfig;
    }
  ): Promise<Survey> {
    // Verify ownership
    await this.verifyOwnership(surveyId, userId);

    // Enable anonymous access
    return await surveyRepository.enableAnonymousAccess(surveyId, config);
  }

  /**
   * Disable anonymous access for a survey
   */
  async disableAnonymousAccess(surveyId: string, userId: string): Promise<Survey> {
    // Verify ownership
    await this.verifyOwnership(surveyId, userId);

    // Disable anonymous access
    return await surveyRepository.disableAnonymousAccess(surveyId);
  }

  /**
   * Duplicate a survey
   */
  async duplicateSurvey(
    surveyId: string,
    userId: string,
    newTitle: string
  ): Promise<Survey> {
    // Verify ownership of original survey
    await this.verifyOwnership(surveyId, userId);

    // Duplicate survey
    return await surveyRepository.duplicate(surveyId, newTitle, userId);
  }

  /**
   * Archive a survey (set status to 'closed')
   */
  async archiveSurvey(surveyId: string, userId: string): Promise<Survey> {
    // Verify ownership
    await this.verifyOwnership(surveyId, userId);

    // Archive survey
    return await surveyRepository.archive(surveyId, userId);
  }

  /**
   * Bulk update survey statuses
   */
  async bulkUpdateStatus(
    surveyIds: string[],
    status: string,
    userId: string
  ) {
    return await surveyRepository.bulkUpdateStatus(surveyIds, status, userId);
  }

  /**
   * Bulk delete surveys
   */
  async bulkDeleteSurveys(
    surveyIds: string[],
    userId: string
  ) {
    return await surveyRepository.bulkDelete(surveyIds, userId);
  }

  /**
   * Get survey by public link (for anonymous access)
   */
  async getSurveyByPublicLink(publicLink: string): Promise<Survey | undefined> {
    return await surveyRepository.findByPublicLink(publicLink);
  }
}

// Export singleton instance
export const surveyService = new SurveyService();
