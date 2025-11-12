import type { Express } from "express";
import { isAuthenticated } from "../googleAuth";
import { userPreferencesService } from "../services/UserPreferencesService";

/**
 * Register user preferences routes
 */
export function registerUserPreferencesRoutes(app: Express): void {
  /**
   * GET /api/preferences
   * Get current user's preferences
   */
  app.get('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const prefs = await userPreferencesService.getByUserId(userId);
      res.json(prefs);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  /**
   * PUT /api/preferences
   * Update current user's preferences
   */
  app.put('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const updates = req.body;
      const updated = await userPreferencesService.update(userId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  /**
   * POST /api/preferences/reset
   * Reset user's preferences to defaults
   */
  app.post('/api/preferences/reset', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const defaults = await userPreferencesService.reset(userId);
      res.json(defaults);
    } catch (error) {
      console.error("Error resetting user preferences:", error);
      res.status(500).json({ message: "Failed to reset preferences" });
    }
  });

  /**
   * POST /api/preferences/import
   * Import preferences from JSON
   */
  app.post('/api/preferences/import', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const importedSettings = req.body;
      const updated = await userPreferencesService.importSettings(userId, importedSettings);
      res.json(updated);
    } catch (error) {
      console.error("Error importing user preferences:", error);
      res.status(500).json({ message: "Failed to import preferences" });
    }
  });

  /**
   * GET /api/preferences/export
   * Export preferences as JSON
   */
  app.get('/api/preferences/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const exported = await userPreferencesService.exportSettings(userId);
      res.json(exported);
    } catch (error) {
      console.error("Error exporting user preferences:", error);
      res.status(500).json({ message: "Failed to export preferences" });
    }
  });

  /**
   * POST /api/preferences/presets
   * Save current preferences as a named preset
   */
  app.post('/api/preferences/presets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const { name, settings } = req.body;
      if (!name || !settings) {
        return res.status(400).json({ message: "Name and settings are required" });
      }

      const preset = await userPreferencesService.savePreset(userId, name, settings);
      res.json(preset);
    } catch (error) {
      console.error("Error saving preset:", error);
      res.status(500).json({ message: "Failed to save preset" });
    }
  });

  /**
   * GET /api/preferences/presets
   * List all presets for current user
   */
  app.get('/api/preferences/presets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const presets = await userPreferencesService.listPresets(userId);
      res.json(presets);
    } catch (error) {
      console.error("Error fetching presets:", error);
      res.status(500).json({ message: "Failed to fetch presets" });
    }
  });

  /**
   * POST /api/preferences/presets/:presetId/apply
   * Apply a preset to current preferences
   */
  app.post('/api/preferences/presets/:presetId/apply', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const { presetId } = req.params;
      const applied = await userPreferencesService.applyPreset(userId, presetId);
      res.json(applied);
    } catch (error) {
      console.error("Error applying preset:", error);
      const message = error instanceof Error ? error.message : "Failed to apply preset";
      res.status(error instanceof Error && error.message.includes("not found") ? 404 : 500)
        .json({ message });
    }
  });

  /**
   * DELETE /api/preferences/presets/:presetId
   * Delete a preset
   */
  app.delete('/api/preferences/presets/:presetId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const { presetId } = req.params;
      const deleted = await userPreferencesService.deletePreset(userId, presetId);

      if (!deleted) {
        return res.status(404).json({ message: "Preset not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting preset:", error);
      res.status(500).json({ message: "Failed to delete preset" });
    }
  });
}
