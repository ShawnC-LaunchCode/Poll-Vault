/**
 * Activity Log Configuration
 *
 * Maps logical activity log fields to actual database columns.
 * Default configuration uses the existing analyticsEvents table.
 *
 * To use a different table (e.g., a dedicated activity_logs table):
 * 1. Update the `table` property
 * 2. Map the columns to match your schema
 * 3. Set any unavailable columns to null
 */

export const activityLogSource = {
  table: "analytics_events", // Change to "activity_logs" if you create a dedicated table
  columns: {
    id: "id",
    timestamp: "timestamp",          // timestamptz - when the event occurred
    event: "event",                  // text - event name/type
    actorId: "response_id",          // uuid - who performed the action (responseId as proxy for user)
    actorEmail: null,                // Not available in analyticsEvents; set to column name if you add it
    entityType: "question_id",       // uuid - what type of entity (we can infer from non-null columns)
    entityId: "survey_id",           // uuid - the main entity being acted upon
    status: null,                    // Not available; could be inferred from event name
    ipAddress: null,                 // Not in analyticsEvents; available in responses table
    userAgent: null,                 // Not in analyticsEvents; available in responses table
    metadata: "data"                 // jsonb - freeform event payload
  }
} as const;

/**
 * Event Display Configuration
 *
 * Maps event names to human-friendly labels and visual styling.
 * Add new events here as they're introduced to your application.
 */
export const eventDisplayMap: Record<string, { label: string; tone: "info" | "success" | "warn" | "error" }> = {
  // Survey lifecycle events
  "survey_start": { label: "Survey Started", tone: "info" },
  "survey_complete": { label: "Survey Completed", tone: "success" },
  "survey_abandon": { label: "Survey Abandoned", tone: "warn" },

  // Page navigation events
  "page_view": { label: "Page Viewed", tone: "info" },
  "page_leave": { label: "Page Left", tone: "info" },

  // Question interaction events
  "question_focus": { label: "Question Focused", tone: "info" },
  "question_blur": { label: "Question Blurred", tone: "info" },
  "question_answer": { label: "Question Answered", tone: "success" },
  "question_skip": { label: "Question Skipped", tone: "warn" },

  // AI-related events (if you're tracking AI survey generation)
  "ai.generated": { label: "AI Survey Generated", tone: "success" },
  "ai.error": { label: "AI Generation Failed", tone: "error" },
};

/**
 * Get display info for an event, with fallback for unknown events
 */
export function getEventDisplay(eventName: string): { label: string; tone: "info" | "success" | "warn" | "error" } {
  return eventDisplayMap[eventName] ?? {
    label: eventName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    tone: "info"
  };
}
