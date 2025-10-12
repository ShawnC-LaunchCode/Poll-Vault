import { db } from "../db";
import { surveys, surveyPages, questions, conditionalRules } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validates a survey before it can be published
 * Checks for required fields, structure, and configuration issues
 */
export async function validateSurveyForPublish(
  surveyId: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  try {
    // 1. Check if survey exists and get basic info
    const [survey] = await db
      .select()
      .from(surveys)
      .where(eq(surveys.id, surveyId));

    if (!survey) {
      errors.push({
        field: "survey",
        message: "Survey not found",
        severity: "error",
      });
      return { valid: false, errors, warnings };
    }

    // 2. Check survey title
    if (!survey.title || survey.title.trim().length === 0) {
      errors.push({
        field: "title",
        message: "Survey title is required",
        severity: "error",
      });
    }

    // 3. Check if survey has at least one page
    const pages = await db
      .select()
      .from(surveyPages)
      .where(eq(surveyPages.surveyId, surveyId));

    if (pages.length === 0) {
      errors.push({
        field: "pages",
        message: "Survey must have at least one page",
        severity: "error",
      });
      return { valid: errors.length === 0, errors, warnings };
    }

    // 4. Check if each page has a title
    for (const page of pages) {
      if (!page.title || page.title.trim().length === 0) {
        warnings.push({
          field: "pages",
          message: `Page ${page.order} has no title`,
          severity: "warning",
        });
      }
    }

    // 5. Check if survey has at least one question
    const allQuestions = await db
      .select()
      .from(questions)
      .where(
        eq(
          questions.pageId,
          pages.map((p) => p.id)[0]
        )
      );

    // Get questions for all pages
    const questionCounts = await Promise.all(
      pages.map(async (page) => {
        const pageQuestions = await db
          .select()
          .from(questions)
          .where(eq(questions.pageId, page.id));
        return pageQuestions.length;
      })
    );

    const totalQuestions = questionCounts.reduce((sum, count) => sum + count, 0);

    if (totalQuestions === 0) {
      errors.push({
        field: "questions",
        message: "Survey must have at least one question",
        severity: "error",
      });
    }

    // 6. Validate conditional logic for circular dependencies
    const rules = await db
      .select()
      .from(conditionalRules)
      .where(eq(conditionalRules.surveyId, surveyId));

    if (rules.length > 0) {
      const circularDeps = detectCircularConditionalLogic(rules);
      if (circularDeps.length > 0) {
        errors.push({
          field: "conditionalLogic",
          message: `Circular conditional logic detected: ${circularDeps.join(", ")}`,
          severity: "error",
        });
      }
    }

    // 7. Check for questions with invalid configurations
    for (const page of pages) {
      const pageQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.pageId, page.id));

      for (const question of pageQuestions) {
        // Check multiple choice/radio questions have options
        if (
          (question.type === "multiple_choice" || question.type === "radio") &&
          (!question.options || (Array.isArray(question.options) && question.options.length === 0))
        ) {
          errors.push({
            field: "questions",
            message: `Question "${question.title}" (${question.type}) has no options`,
            severity: "error",
          });
        }

        // Check loop groups have proper configuration
        if (question.type === "loop_group" && !question.loopConfig) {
          errors.push({
            field: "questions",
            message: `Loop group question "${question.title}" has no loop configuration`,
            severity: "error",
          });
        }

        // Warn about questions without titles
        if (!question.title || question.title.trim().length === 0) {
          warnings.push({
            field: "questions",
            message: `Question on page ${page.order} has no title`,
            severity: "warning",
          });
        }
      }
    }

    // 8. Warnings for missing recipients (only if anonymous access is disabled)
    if (!survey.allowAnonymous) {
      // Check if survey has recipients
      // Note: This would require a recipients table query
      warnings.push({
        field: "recipients",
        message: "No recipients added. Consider adding recipients or enabling anonymous access.",
        severity: "warning",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    console.error("Error validating survey:", error);
    errors.push({
      field: "system",
      message: "An error occurred during validation",
      severity: "error",
    });
    return { valid: false, errors, warnings };
  }
}

/**
 * Detects circular dependencies in conditional logic rules
 * Returns array of question IDs involved in circular dependencies
 */
function detectCircularConditionalLogic(
  rules: Array<{ conditionQuestionId: string; targetQuestionId: string | null }>
): string[] {
  const graph = new Map<string, Set<string>>();

  // Build dependency graph
  rules.forEach((rule) => {
    if (rule.targetQuestionId) {
      if (!graph.has(rule.conditionQuestionId)) {
        graph.set(rule.conditionQuestionId, new Set());
      }
      graph.get(rule.conditionQuestionId)!.add(rule.targetQuestionId);
    }
  });

  // Detect cycles using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const circularNodes: string[] = [];

  function hasCycle(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) {
            circularNodes.push(node);
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          circularNodes.push(node);
          return true;
        }
      }
    }

    recursionStack.delete(node);
    return false;
  }

  // Check all nodes
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      hasCycle(node);
    }
  }

  return [...new Set(circularNodes)];
}

/**
 * Check if a survey status change is allowed
 * Returns { allowed: boolean, reason?: string }
 */
export async function canChangeStatus(
  surveyId: string,
  currentStatus: string,
  newStatus: string
): Promise<{ allowed: boolean; reason?: string }> {
  // draft -> open: Requires validation passing
  if (currentStatus === "draft" && newStatus === "open") {
    const validation = await validateSurveyForPublish(surveyId);
    if (!validation.valid) {
      return {
        allowed: false,
        reason: `Survey has validation errors: ${validation.errors.map((e) => e.message).join(", ")}`,
      };
    }
    return { allowed: true };
  }

  // open -> closed: Always allowed
  if (currentStatus === "open" && newStatus === "closed") {
    return { allowed: true };
  }

  // closed -> open: Check if responses exist and warn
  if (currentStatus === "closed" && newStatus === "open") {
    // Could add response count check here
    return { allowed: true }; // Allow reopening
  }

  // Any status -> draft: Only if no responses OR force flag
  if (newStatus === "draft") {
    // Could check for responses here
    // For now, we'll allow it but this could be restricted
    return {
      allowed: true,
      reason: "Reverting to draft may affect existing responses",
    };
  }

  return { allowed: false, reason: "Invalid status transition" };
}
