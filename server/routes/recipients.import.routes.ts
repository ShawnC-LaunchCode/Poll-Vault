import type { Express } from "express";
import { isAuthenticated } from "../googleAuth";
import { RecipientImportService } from "../services/RecipientImportService";
import { recipientRepository } from "../repositories";

const recipientImportService = new RecipientImportService();

/**
 * Register recipient CSV import/export routes
 * Handles CSV template download, import, and export
 */
export function registerRecipientImportRoutes(app: Express): void {
  /**
   * GET /api/recipients/template.csv
   * Download CSV template for recipient import
   */
  app.get("/api/recipients/template.csv", isAuthenticated, (req: any, res) => {
    try {
      const csv = RecipientImportService.csvTemplate();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="recipients-template.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error generating CSV template:", error);
      res.status(500).json({
        message: "Failed to generate CSV template",
        error: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      });
    }
  });

  /**
   * POST /api/recipients/import
   * Import recipients from CSV
   * Accepts raw CSV content in request body
   */
  app.post("/api/recipients/import", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      // Accept text/csv or text/plain; if using req.body as string or { csv: "..." }
      const csvContent = typeof req.body === "string" ? req.body : (req.body?.csv ?? "");

      if (!csvContent?.trim()) {
        return res.status(400).json({ message: "No CSV content provided" });
      }

      const summary = await recipientImportService.importFromCsv(userId, csvContent);
      res.json(summary);
    } catch (error) {
      console.error("Error importing recipients:", error);
      res.status(500).json({
        message: "Failed to import recipients",
        error: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      });
    }
  });

  /**
   * GET /api/recipients/export.csv
   * Export all global recipients to CSV
   */
  app.get("/api/recipients/export.csv", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const rows = await recipientRepository.listGlobal(userId, 10000, 0);
      const lines = [
        "name,email,tags",
        ...rows.map((r) => `${r.name ?? ""},${r.email},${(r.tags ?? []).join(" ")}`),
      ];
      const csv = lines.join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="recipients-export.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting recipients:", error);
      res.status(500).json({
        message: "Failed to export recipients",
        error: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      });
    }
  });
}
