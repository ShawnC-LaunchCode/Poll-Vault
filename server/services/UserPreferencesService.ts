import { userPreferencesRepository, presetRepository } from "../repositories";
import type { UserPreferences, UserPreferencePreset } from "@shared/schema";

/**
 * Service layer for user preferences business logic
 * Handles user personalization settings management including presets
 */
export class UserPreferencesService {
  /**
   * Get user preferences by user ID
   * Returns default preferences if none exist
   */
  async getByUserId(userId: string): Promise<Record<string, any>> {
    const prefs = await userPreferencesRepository.findByUserId(userId);

    if (!prefs) {
      // Return default preferences if none exist
      return {
        celebrationEffects: true,
        darkMode: "system",
        aiHints: true,
        aiAssistEnabled: true,
        aiAutoSuggest: true,
        aiTone: "friendly",
        aiSummaryDepth: "standard",
      };
    }

    return prefs.settings as Record<string, any>;
  }

  /**
   * Update user preferences
   * Merges new settings with existing ones
   */
  async update(userId: string, updates: Record<string, any>): Promise<Record<string, any>> {
    const updated = await userPreferencesRepository.upsert(userId, updates);
    return updated.settings as Record<string, any>;
  }

  /**
   * Reset user preferences to defaults
   */
  async reset(userId: string): Promise<Record<string, any>> {
    const defaults = {
      celebrationEffects: true,
      darkMode: "system",
      aiHints: true,
      aiAssistEnabled: true,
      aiAutoSuggest: true,
      aiTone: "friendly",
      aiSummaryDepth: "standard",
    };

    const updated = await userPreferencesRepository.upsert(userId, defaults);
    return updated.settings as Record<string, any>;
  }

  /**
   * Delete user preferences
   */
  async delete(userId: string): Promise<void> {
    await userPreferencesRepository.deleteByUserId(userId);
  }

  /**
   * Save current preferences as a named preset
   */
  async savePreset(userId: string, name: string, settings: Record<string, any>): Promise<UserPreferencePreset> {
    // Validate settings before saving
    const validatedSettings = this.validateAndSanitizeSettings(settings);
    return await presetRepository.createPreset(userId, name, validatedSettings);
  }

  /**
   * List all presets for a user
   */
  async listPresets(userId: string): Promise<UserPreferencePreset[]> {
    return await presetRepository.findByUserId(userId);
  }

  /**
   * Apply a preset to user preferences
   */
  async applyPreset(userId: string, presetId: string): Promise<Record<string, any>> {
    const preset = await presetRepository.findByIdAndUserId(presetId, userId);

    if (!preset) {
      throw new Error("Preset not found or access denied");
    }

    // Apply the preset settings
    const validatedSettings = this.validateAndSanitizeSettings(preset.settings as Record<string, any>);
    const updated = await userPreferencesRepository.upsert(userId, validatedSettings);
    return updated.settings as Record<string, any>;
  }

  /**
   * Delete a preset
   */
  async deletePreset(userId: string, presetId: string): Promise<boolean> {
    return await presetRepository.deleteByIdAndUserId(presetId, userId);
  }

  /**
   * Validate and sanitize preference settings
   * Removes critical system fields and validates structure
   */
  private validateAndSanitizeSettings(settings: Record<string, any>): Record<string, any> {
    // Remove any system fields that shouldn't be imported/exported
    const { userId, createdAt, updatedAt, ...safeSettings } = settings as any;

    // Validate known preference keys
    const validKeys = [
      'celebrationEffects',
      'darkMode',
      'aiHints',
      'aiAssistEnabled',
      'aiAutoSuggest',
      'aiTone',
      'aiSummaryDepth',
    ];

    // Only keep valid preference keys
    const validated: Record<string, any> = {};
    for (const key of validKeys) {
      if (key in safeSettings) {
        validated[key] = safeSettings[key];
      }
    }

    return validated;
  }

  /**
   * Import settings from JSON (with validation)
   */
  async importSettings(userId: string, importedSettings: Record<string, any>): Promise<Record<string, any>> {
    const validatedSettings = this.validateAndSanitizeSettings(importedSettings);
    return await this.update(userId, validatedSettings);
  }

  /**
   * Export current settings as JSON
   */
  async exportSettings(userId: string): Promise<Record<string, any>> {
    const prefs = await this.getByUserId(userId);
    return this.validateAndSanitizeSettings(prefs);
  }
}

export const userPreferencesService = new UserPreferencesService();
