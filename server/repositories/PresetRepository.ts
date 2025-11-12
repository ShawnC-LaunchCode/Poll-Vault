import { BaseRepository, type DbTransaction } from "./BaseRepository";
import { userPreferencePresets, type UserPreferencePreset, type InsertUserPreferencePreset } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Repository for user preference presets database operations
 * Handles saving, loading, and managing named preference configurations
 */
export class PresetRepository extends BaseRepository<typeof userPreferencePresets, UserPreferencePreset, InsertUserPreferencePreset> {
  constructor() {
    super(userPreferencePresets);
  }

  /**
   * Find all presets for a specific user
   */
  async findByUserId(userId: string, tx?: DbTransaction): Promise<UserPreferencePreset[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(userPreferencePresets)
      .where(eq(userPreferencePresets.userId, userId))
      .orderBy(userPreferencePresets.createdAt);
  }

  /**
   * Find a specific preset by ID for a user
   */
  async findByIdAndUserId(id: string, userId: string, tx?: DbTransaction): Promise<UserPreferencePreset | undefined> {
    const database = this.getDb(tx);
    const [preset] = await database
      .select()
      .from(userPreferencePresets)
      .where(
        and(
          eq(userPreferencePresets.id, id),
          eq(userPreferencePresets.userId, userId)
        )
      );
    return preset;
  }

  /**
   * Create a new preset
   */
  async createPreset(userId: string, name: string, settings: Record<string, any>, tx?: DbTransaction): Promise<UserPreferencePreset> {
    const database = this.getDb(tx);
    const [preset] = await database
      .insert(userPreferencePresets)
      .values({
        userId,
        name,
        settings,
      })
      .returning();
    return preset;
  }

  /**
   * Delete a preset by ID (only if owned by user)
   */
  async deleteByIdAndUserId(id: string, userId: string, tx?: DbTransaction): Promise<boolean> {
    const database = this.getDb(tx);
    const result = await database
      .delete(userPreferencePresets)
      .where(
        and(
          eq(userPreferencePresets.id, id),
          eq(userPreferencePresets.userId, userId)
        )
      )
      .returning();
    return result.length > 0;
  }
}

export const presetRepository = new PresetRepository();
