import { BaseRepository, type DbTransaction } from "./BaseRepository";
import {
  recipients,
  globalRecipients,
  type Recipient,
  type InsertRecipient,
  type GlobalRecipient,
  type InsertGlobalRecipient,
  type BulkOperationResult,
} from "@shared/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * Repository for recipient-related database operations
 * Handles both survey recipients and global recipient contacts
 */
export class RecipientRepository extends BaseRepository<typeof recipients, Recipient, InsertRecipient> {
  constructor() {
    super(recipients);
  }

  // ==================== Survey Recipients ====================

  /**
   * Create recipient with generated token
   */
  async create(recipient: InsertRecipient, tx?: DbTransaction): Promise<Recipient> {
    const token = randomUUID();
    const database = this.getDb(tx);
    const [newRecipient] = await database
      .insert(recipients)
      .values({ ...recipient, token } as any)
      .returning();
    return newRecipient;
  }

  /**
   * Find recipient by token
   */
  async findByToken(token: string, tx?: DbTransaction): Promise<Recipient | undefined> {
    const database = this.getDb(tx);
    const [recipient] = await database
      .select()
      .from(recipients)
      .where(eq(recipients.token, token));
    return recipient;
  }

  /**
   * Find recipients by survey ID (ordered by created date)
   */
  async findBySurvey(surveyId: string, tx?: DbTransaction): Promise<Recipient[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(recipients)
      .where(eq(recipients.surveyId, surveyId))
      .orderBy(desc(recipients.createdAt));
  }

  /**
   * Check for duplicate emails in a survey
   */
  async checkDuplicates(surveyId: string, emails: string[], tx?: DbTransaction): Promise<string[]> {
    const database = this.getDb(tx);
    const existingRecipients = await database
      .select()
      .from(recipients)
      .where(eq(recipients.surveyId, surveyId));

    const existingEmails = new Set(
      existingRecipients.map((r: typeof recipients.$inferSelect) => r.email.toLowerCase())
    );
    return emails.filter((email: string) => existingEmails.has(email.toLowerCase()));
  }

  // ==================== Global Recipients ====================

  /**
   * Create global recipient
   */
  async createGlobal(
    globalRecipient: InsertGlobalRecipient,
    tx?: DbTransaction
  ): Promise<GlobalRecipient> {
    const database = this.getDb(tx);
    const [newGlobalRecipient] = await database
      .insert(globalRecipients)
      .values({ ...globalRecipient, updatedAt: new Date() } as any)
      .returning();
    return newGlobalRecipient;
  }

  /**
   * Find global recipient by ID
   */
  async findGlobalById(id: string, tx?: DbTransaction): Promise<GlobalRecipient | undefined> {
    const database = this.getDb(tx);
    const [globalRecipient] = await database
      .select()
      .from(globalRecipients)
      .where(eq(globalRecipients.id, id));
    return globalRecipient;
  }

  /**
   * Find global recipients by creator ID (ordered)
   */
  async findGlobalByCreator(creatorId: string, tx?: DbTransaction): Promise<GlobalRecipient[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(globalRecipients)
      .where(eq(globalRecipients.creatorId, creatorId))
      .orderBy(desc(globalRecipients.createdAt));
  }

  /**
   * Find global recipient by creator and email
   */
  async findGlobalByCreatorAndEmail(
    creatorId: string,
    email: string,
    tx?: DbTransaction
  ): Promise<GlobalRecipient | undefined> {
    const database = this.getDb(tx);
    const [globalRecipient] = await database
      .select()
      .from(globalRecipients)
      .where(and(eq(globalRecipients.creatorId, creatorId), eq(globalRecipients.email, email)));
    return globalRecipient;
  }

  /**
   * Update global recipient
   */
  async updateGlobal(
    id: string,
    updates: Partial<InsertGlobalRecipient>,
    tx?: DbTransaction
  ): Promise<GlobalRecipient> {
    const database = this.getDb(tx);
    const [updatedGlobalRecipient] = await database
      .update(globalRecipients)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(globalRecipients.id, id))
      .returning();
    return updatedGlobalRecipient;
  }

  /**
   * Delete global recipient
   */
  async deleteGlobal(id: string, tx?: DbTransaction): Promise<void> {
    const database = this.getDb(tx);
    await database.delete(globalRecipients).where(eq(globalRecipients.id, id));
  }

  /**
   * Bulk delete global recipients
   */
  async bulkDeleteGlobal(
    ids: string[],
    creatorId: string,
    tx?: DbTransaction
  ): Promise<BulkOperationResult> {
    const database = this.getDb(tx);

    try {
      // Verify ownership of all recipients before deletion
      const recipientsToDelete = await database
        .select()
        .from(globalRecipients)
        .where(and(inArray(globalRecipients.id, ids), eq(globalRecipients.creatorId, creatorId)));

      if (recipientsToDelete.length !== ids.length) {
        return {
          success: false,
          updatedCount: 0,
          errors: ['Some recipients not found or access denied'],
        };
      }

      await database
        .delete(globalRecipients)
        .where(and(inArray(globalRecipients.id, ids), eq(globalRecipients.creatorId, creatorId)));

      return {
        success: true,
        updatedCount: ids.length,
        errors: [],
      };
    } catch (error) {
      console.error('Error in bulk delete global recipients:', error);
      return {
        success: false,
        updatedCount: 0,
        errors: ['Failed to bulk delete global recipients'],
      };
    }
  }

  /**
   * Bulk add global recipients to survey
   */
  async bulkAddGlobalToSurvey(
    surveyId: string,
    globalRecipientIds: string[],
    creatorId: string,
    tx?: DbTransaction
  ): Promise<Recipient[]> {
    const database = this.getDb(tx);

    // Get the global recipients and verify ownership
    const globalRecipientsToAdd = await database
      .select()
      .from(globalRecipients)
      .where(
        and(
          inArray(globalRecipients.id, globalRecipientIds),
          eq(globalRecipients.creatorId, creatorId)
        )
      );

    if (globalRecipientsToAdd.length === 0) {
      throw new Error('No valid global recipients found');
    }

    // Check for duplicates in the survey
    const existingRecipients = await database
      .select()
      .from(recipients)
      .where(eq(recipients.surveyId, surveyId));

    const existingEmails = new Set(
      existingRecipients.map((r: typeof recipients.$inferSelect) => r.email.toLowerCase())
    );
    const recipientsToAdd = globalRecipientsToAdd.filter(
      (gr: typeof globalRecipients.$inferSelect) => !existingEmails.has(gr.email.toLowerCase())
    );

    if (recipientsToAdd.length === 0) {
      throw new Error('All selected recipients are already in this survey');
    }

    // Create survey recipients from global recipients
    const newRecipients: Recipient[] = [];
    for (const globalRecipient of recipientsToAdd) {
      const token = randomUUID();
      const recipientData = {
        surveyId,
        name: globalRecipient.name,
        email: globalRecipient.email,
        token,
      };

      const [newRecipient] = await database
        .insert(recipients)
        .values(recipientData as any)
        .returning();

      newRecipients.push(newRecipient);
    }

    return newRecipients;
  }

  /**
   * Upsert many global recipients (for CSV import)
   * Returns counts of imported, updated, and skipped records
   */
  async upsertManyGlobal(
    creatorId: string,
    rows: Array<{ name?: string | null; email: string; tags?: string[] | null }>,
    tx?: DbTransaction
  ): Promise<{ imported: number; updated: number; skipped: number }> {
    const database = this.getDb(tx);
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const r of rows) {
      const email = r.email.trim().toLowerCase();
      if (!email) {
        skipped++;
        continue;
      }

      const existing = await this.findGlobalByCreatorAndEmail(creatorId, email, tx);

      if (existing) {
        // Merge tags - combine existing and new tags
        const mergedTags = Array.from(
          new Set([...(existing.tags || []), ...(r.tags || [])])
        );

        await database
          .update(globalRecipients)
          .set({
            name: r.name || existing.name,
            tags: mergedTags,
            updatedAt: new Date(),
          } as any)
          .where(eq(globalRecipients.id, existing.id));
        updated++;
      } else {
        await database
          .insert(globalRecipients)
          .values({
            creatorId,
            name: r.name || '',
            email,
            tags: r.tags || null,
          } as any);
        imported++;
      }
    }

    return { imported, updated, skipped };
  }

  /**
   * List global recipients with pagination
   */
  async listGlobal(
    creatorId: string,
    limit = 100,
    offset = 0,
    tx?: DbTransaction
  ): Promise<GlobalRecipient[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(globalRecipients)
      .where(eq(globalRecipients.creatorId, creatorId))
      .orderBy(desc(globalRecipients.email))
      .limit(limit)
      .offset(offset);
  }
}

export const recipientRepository = new RecipientRepository();
