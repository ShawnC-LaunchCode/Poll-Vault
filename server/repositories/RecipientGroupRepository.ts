import { db } from "../db";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { recipientGroups, recipientGroupMembers, globalRecipients, users } from "@shared/schema";
import type { DbTransaction } from "./BaseRepository";

export class RecipientGroupRepository {
  /**
   * Create a new recipient group
   */
  async createGroup(creatorId: string, name: string, description?: string, tx?: DbTransaction) {
    const database = tx || db;
    const [row] = await database
      .insert(recipientGroups)
      .values({
        creatorId,
        name,
        description: description || null,
      } as any)
      .returning();
    return row;
  }

  /**
   * List all groups for a creator with member counts
   */
  async listGroups(creatorId: string, tx?: DbTransaction) {
    const database = tx || db;

    const rows = await database
      .select({
        id: recipientGroups.id,
        name: recipientGroups.name,
        description: recipientGroups.description,
        createdAt: recipientGroups.createdAt,
        updatedAt: recipientGroups.updatedAt,
        membersCount: count(recipientGroupMembers.recipientId),
      })
      .from(recipientGroups)
      .leftJoin(recipientGroupMembers, eq(recipientGroups.id, recipientGroupMembers.groupId))
      .where(eq(recipientGroups.creatorId, creatorId))
      .groupBy(
        recipientGroups.id,
        recipientGroups.name,
        recipientGroups.description,
        recipientGroups.createdAt,
        recipientGroups.updatedAt
      );

    return rows;
  }

  /**
   * Update a group (name and/or description)
   */
  async updateGroup(
    creatorId: string,
    groupId: string,
    patch: { name?: string; description?: string },
    tx?: DbTransaction
  ) {
    const database = tx || db;
    const [row] = await database
      .update(recipientGroups)
      .set({ ...patch, updatedAt: sql`now()` } as any)
      .where(and(eq(recipientGroups.id, groupId), eq(recipientGroups.creatorId, creatorId)))
      .returning();
    return row;
  }

  /**
   * Delete a group (cascade deletes group members)
   */
  async deleteGroup(creatorId: string, groupId: string, tx?: DbTransaction) {
    const database = tx || db;
    const res = await database
      .delete(recipientGroups)
      .where(and(eq(recipientGroups.id, groupId), eq(recipientGroups.creatorId, creatorId)))
      .returning({ id: recipientGroups.id });
    return res.length > 0;
  }

  /**
   * Add recipients to a group
   */
  async addMembers(
    creatorId: string,
    groupId: string,
    recipientIds: string[],
    tx?: DbTransaction
  ) {
    const database = tx || db;

    // Ensure group belongs to creator
    const [g] = await database
      .select()
      .from(recipientGroups)
      .where(and(eq(recipientGroups.id, groupId), eq(recipientGroups.creatorId, creatorId)));

    if (!g) {
      throw new Error("Group not found");
    }

    // Ensure recipients belong to creator
    const recs = await database
      .select({ id: globalRecipients.id })
      .from(globalRecipients)
      .where(and(eq(globalRecipients.creatorId, creatorId), inArray(globalRecipients.id, recipientIds)));

    const values = recs.map((r) => ({ groupId, recipientId: r.id }));
    if (!values.length) {
      return 0;
    }

    // Upsert semantics (ignore duplicates)
    await database
      .insert(recipientGroupMembers)
      .values(values as any)
      .onConflictDoNothing();

    return values.length;
  }

  /**
   * Remove a recipient from a group
   */
  async removeMember(
    creatorId: string,
    groupId: string,
    recipientId: string,
    tx?: DbTransaction
  ) {
    const database = tx || db;

    // Verify group ownership
    const [g] = await database
      .select()
      .from(recipientGroups)
      .where(and(eq(recipientGroups.id, groupId), eq(recipientGroups.creatorId, creatorId)));

    if (!g) {
      throw new Error("Group not found");
    }

    await database
      .delete(recipientGroupMembers)
      .where(
        and(
          eq(recipientGroupMembers.groupId, groupId),
          eq(recipientGroupMembers.recipientId, recipientId)
        )
      );

    return true;
  }

  /**
   * List all members of a group
   */
  async listGroupMembers(creatorId: string, groupId: string, tx?: DbTransaction) {
    const database = tx || db;

    // Verify group
    const [g] = await database
      .select()
      .from(recipientGroups)
      .where(and(eq(recipientGroups.id, groupId), eq(recipientGroups.creatorId, creatorId)));

    if (!g) {
      throw new Error("Group not found");
    }

    const rows = await database
      .select({
        id: globalRecipients.id,
        name: globalRecipients.name,
        email: globalRecipients.email,
        tags: globalRecipients.tags,
        addedAt: recipientGroupMembers.addedAt,
      })
      .from(recipientGroupMembers)
      .innerJoin(globalRecipients, eq(globalRecipients.id, recipientGroupMembers.recipientId))
      .where(eq(recipientGroupMembers.groupId, groupId))
      .orderBy(globalRecipients.email);

    return rows;
  }
}

export const recipientGroupRepository = new RecipientGroupRepository();
