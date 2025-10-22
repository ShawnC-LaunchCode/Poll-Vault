import type { Express } from "express";
import { registerAuthRoutes } from "./auth.routes";
import { registerSurveyRoutes } from "./surveys.routes";
import { registerPageRoutes } from "./pages.routes";
import { registerQuestionRoutes } from "./questions.routes";
import { registerRecipientRoutes } from "./recipients.routes";
import { registerResponseRoutes } from "./responses.routes";
import { registerAnalyticsRoutes } from "./analytics.routes";
import { registerFileRoutes } from "./files.routes";
import { registerDashboardRoutes } from "./dashboard.routes";
import { registerAdminRoutes } from "./admin.routes";
import { registerExportRoutes } from "./export.routes";

/**
 * Register all modular routes
 * This is the main aggregator that wires up all domain-specific route modules
 */
export function registerAllRoutes(app: Express): void {
  // Authentication routes
  registerAuthRoutes(app);

  // Dashboard routes
  registerDashboardRoutes(app);

  // Survey management routes
  registerSurveyRoutes(app);

  // Survey page routes
  registerPageRoutes(app);

  // Question and conditional logic routes
  registerQuestionRoutes(app);

  // Recipient management routes
  registerRecipientRoutes(app);

  // Response collection routes
  registerResponseRoutes(app);

  // Analytics and reporting routes
  registerAnalyticsRoutes(app);

  // File upload and management routes
  registerFileRoutes(app);

  // Export routes (CSV and PDF)
  registerExportRoutes(app);

  // Admin routes (must be after auth routes)
  registerAdminRoutes(app);
}
