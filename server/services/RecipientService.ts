import {
  surveyRepository,
  recipientRepository
} from "../repositories";
import type {
  Recipient,
  InsertRecipient,
  GlobalRecipient,
  InsertGlobalRecipient,
  User
} from "@shared/schema";
import { sendSurveyInvitation } from "./sendgrid";
import { storage } from "../storage";

/**
 * Service layer for recipient-related business logic
 * Handles recipient management, invitations, and global recipient lists
 */
export class RecipientService {
  /**
   * Add a recipient to a survey
   */
  async addRecipientToSurvey(
    surveyId: string,
    userId: string,
    recipientData: Omit<InsertRecipient, 'surveyId'>
  ): Promise<Recipient> {
    // Verify ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    // Create recipient
    return await recipientRepository.create({
      ...recipientData,
      surveyId
    });
  }

  /**
   * Get all recipients for a survey
   */
  async getRecipientsBySurvey(surveyId: string, userId: string): Promise<Recipient[]> {
    // Verify ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    return await recipientRepository.findBySurvey(surveyId);
  }

  /**
   * Send invitations to recipients
   */
  async sendInvitations(
    surveyId: string,
    userId: string,
    recipientIds: string[]
  ): Promise<{
    success: boolean;
    message: string;
    results: Array<{
      recipientId: string;
      email: string;
      status: 'sent' | 'failed';
      message: string;
    }>;
    stats: {
      total: number;
      sent: number;
      failed: number;
    };
  }> {
    // Verify survey ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    if (!recipientIds || recipientIds.length === 0) {
      throw new Error("Recipient IDs are required");
    }

    // Get recipients
    const allRecipients = await recipientRepository.findBySurvey(surveyId);
    const recipientsToInvite = allRecipients.filter(recipient =>
      recipientIds.includes(recipient.id)
    );

    if (recipientsToInvite.length === 0) {
      throw new Error("No valid recipients found");
    }

    // Get creator info
    const user = await storage.getUser(userId);
    const creatorName = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@pollvault.com';

    // Send invitations
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const recipient of recipientsToInvite) {
      try {
        const surveyUrl = `${process.env.CLIENT_URL || 'http://localhost:5000'}/survey/${recipient.token}`;

        const emailResult = await sendSurveyInvitation(
          {
            recipientName: recipient.name,
            recipientEmail: recipient.email,
            surveyTitle: survey.title,
            surveyUrl: surveyUrl,
            creatorName: creatorName
          },
          fromEmail
        );

        if (emailResult.success) {
          await recipientRepository.update(recipient.id, { sentAt: new Date() });
          successCount++;
          results.push({
            recipientId: recipient.id,
            email: recipient.email,
            status: 'sent' as const,
            message: 'Invitation sent successfully'
          });
        } else {
          errorCount++;
          results.push({
            recipientId: recipient.id,
            email: recipient.email,
            status: 'failed' as const,
            message: emailResult.error || 'Failed to send invitation'
          });
        }
      } catch (error: any) {
        console.error(`Error sending invitation to ${recipient.email}:`, error);
        errorCount++;
        results.push({
          recipientId: recipient.id,
          email: recipient.email,
          status: 'failed' as const,
          message: error.message || 'Error sending invitation'
        });
      }
    }

    const allFailed = errorCount > 0 && successCount === 0;
    const partialFailure = errorCount > 0 && successCount > 0;

    return {
      success: !allFailed,
      message: allFailed
        ? `Failed to send ${errorCount} invitation(s)`
        : partialFailure
        ? `${successCount} invitation(s) sent successfully, ${errorCount} failed`
        : `${successCount} invitation(s) sent successfully`,
      results,
      stats: {
        total: recipientsToInvite.length,
        sent: successCount,
        failed: errorCount
      }
    };
  }

  /**
   * Bulk add global recipients to a survey
   */
  async bulkAddGlobalRecipients(
    surveyId: string,
    userId: string,
    globalRecipientIds: string[]
  ): Promise<{ recipients: Recipient[]; addedCount: number; message: string }> {
    // Verify ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    if (!globalRecipientIds || globalRecipientIds.length === 0) {
      throw new Error("Global recipient IDs are required");
    }

    // Bulk add recipients
    const newRecipients = await recipientRepository.bulkAddGlobalToSurvey(
      surveyId,
      globalRecipientIds,
      userId
    );

    return {
      recipients: newRecipients,
      addedCount: newRecipients.length,
      message: `Successfully added ${newRecipients.length} recipients to survey`
    };
  }

  // ============================================================================
  // Global Recipients
  // ============================================================================

  /**
   * Create a global recipient
   */
  async createGlobalRecipient(
    userId: string,
    data: Omit<InsertGlobalRecipient, 'creatorId'>
  ): Promise<GlobalRecipient> {
    // Check for duplicates
    const existingRecipient = await recipientRepository.findGlobalByCreatorAndEmail(
      userId,
      data.email
    );

    if (existingRecipient) {
      throw new Error("Email already exists in your global recipient list");
    }

    return await recipientRepository.createGlobal({
      ...data,
      creatorId: userId
    });
  }

  /**
   * Get all global recipients for a creator
   */
  async getGlobalRecipients(userId: string): Promise<GlobalRecipient[]> {
    return await recipientRepository.findGlobalByCreator(userId);
  }

  /**
   * Get a single global recipient with ownership check
   */
  async getGlobalRecipient(recipientId: string, userId: string): Promise<GlobalRecipient> {
    const globalRecipient = await recipientRepository.findGlobalById(recipientId);

    if (!globalRecipient) {
      throw new Error("Global recipient not found");
    }

    if (globalRecipient.creatorId !== userId) {
      throw new Error("Access denied - you do not own this global recipient");
    }

    return globalRecipient;
  }

  /**
   * Update a global recipient
   */
  async updateGlobalRecipient(
    recipientId: string,
    userId: string,
    updates: Partial<InsertGlobalRecipient>
  ): Promise<GlobalRecipient> {
    // Verify ownership
    const globalRecipient = await this.getGlobalRecipient(recipientId, userId);

    // Check for email conflicts if email is being updated
    if (updates.email && updates.email !== globalRecipient.email) {
      const existingRecipient = await recipientRepository.findGlobalByCreatorAndEmail(
        userId,
        updates.email
      );

      if (existingRecipient && existingRecipient.id !== recipientId) {
        throw new Error("Email already exists in your global recipient list");
      }
    }

    return await recipientRepository.updateGlobal(recipientId, updates);
  }

  /**
   * Delete a global recipient
   */
  async deleteGlobalRecipient(recipientId: string, userId: string): Promise<void> {
    // Verify ownership
    await this.getGlobalRecipient(recipientId, userId);

    await recipientRepository.deleteGlobal(recipientId);
  }

  /**
   * Bulk delete global recipients
   */
  async bulkDeleteGlobalRecipients(
    recipientIds: string[],
    userId: string
  ) {
    if (!recipientIds || recipientIds.length === 0) {
      throw new Error("Recipient IDs are required");
    }

    return await recipientRepository.bulkDeleteGlobal(recipientIds, userId);
  }
}

// Export singleton instance
export const recipientService = new RecipientService();
