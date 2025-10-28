import { v4 as uuid } from "uuid";
import type { Survey, SurveyPage, Question, LoopGroupSubquestion } from "../../shared/schema";

/**
 * Mock Factories for Unit Tests
 *
 * These factories create pure objects without database operations.
 * Use these for unit tests that mock repositories and services.
 *
 * For integration tests that need real database, use dbFactories.ts or surveyFactory.ts
 */

// ============================================================================
// Survey Factories
// ============================================================================

export interface TestSurveyOptions {
  id?: string;
  title?: string;
  description?: string | null;
  creatorId?: string;
  status?: "draft" | "open" | "closed";
  allowAnonymous?: boolean;
  anonymousAccessType?: "disabled" | "unlimited" | "one_per_ip" | "one_per_session";
  publicLink?: string | null;
  anonymousConfig?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create a mock survey with sensible defaults
 */
export function createTestSurvey(overrides: TestSurveyOptions = {}): Survey {
  const timestamp = new Date();
  return {
    id: uuid(),
    title: "Test Survey",
    description: "A test survey for unit testing",
    creatorId: uuid(),
    status: "draft",
    allowAnonymous: false,
    anonymousAccessType: "disabled",
    publicLink: null,
    anonymousConfig: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

/**
 * Create multiple surveys
 */
export function createTestSurveys(count: number, baseOverrides: TestSurveyOptions = {}): Survey[] {
  return Array.from({ length: count }, () =>
    createTestSurvey(baseOverrides)
  );
}

// ============================================================================
// Page Factories
// ============================================================================

export interface TestPageOptions {
  id?: string;
  surveyId?: string;
  title?: string;
  order?: number;
  createdAt?: Date;
}

/**
 * Create a mock survey page
 */
export function createTestPage(surveyId: string, overrides: TestPageOptions = {}): SurveyPage {
  return {
    id: uuid(),
    surveyId,
    title: "Page 1",
    order: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create multiple pages for a survey
 */
export function createTestPages(surveyId: string, count: number): SurveyPage[] {
  return Array.from({ length: count }, (_, i) =>
    createTestPage(surveyId, {
      title: `Page ${i + 1}`,
      order: i,
    })
  );
}

// ============================================================================
// Question Factories
// ============================================================================

export interface TestQuestionOptions {
  id?: string;
  pageId?: string;
  type?: "short_text" | "long_text" | "multiple_choice" | "radio" | "yes_no" | "date_time" | "file_upload" | "loop_group";
  title?: string;
  description?: string | null;
  required?: boolean;
  options?: any;
  loopConfig?: any;
  conditionalLogic?: any;
  order?: number;
  createdAt?: Date;
}

/**
 * Create a mock question
 */
export function createTestQuestion(pageId: string, overrides: TestQuestionOptions = {}): Question {
  return {
    id: uuid(),
    pageId,
    type: "short_text",
    title: "Test Question",
    description: null,
    required: false,
    options: null,
    loopConfig: null,
    conditionalLogic: null,
    order: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create multiple questions for a page
 */
export function createTestQuestions(pageId: string, count: number, baseType: TestQuestionOptions["type"] = "short_text"): Question[] {
  return Array.from({ length: count }, (_, i) =>
    createTestQuestion(pageId, {
      title: `Question ${i + 1}`,
      type: baseType,
      order: i,
    })
  );
}

/**
 * Create a yes/no question
 */
export function createTestYesNoQuestion(pageId: string, overrides: TestQuestionOptions = {}): Question {
  return createTestQuestion(pageId, {
    type: "yes_no",
    title: "Do you agree?",
    required: false,
    ...overrides,
  });
}

/**
 * Create a multiple choice question
 */
export function createTestMultipleChoiceQuestion(pageId: string, overrides: TestQuestionOptions = {}): Question {
  return createTestQuestion(pageId, {
    type: "multiple_choice",
    title: "Select your preferences",
    options: ["Option 1", "Option 2", "Option 3", "Option 4"],
    required: false,
    ...overrides,
  });
}

/**
 * Create a radio question
 */
export function createTestRadioQuestion(pageId: string, overrides: TestQuestionOptions = {}): Question {
  return createTestQuestion(pageId, {
    type: "radio",
    title: "Choose one option",
    options: ["Choice A", "Choice B", "Choice C"],
    required: false,
    ...overrides,
  });
}

// ============================================================================
// Subquestion Factories (for Loop Groups)
// ============================================================================

export interface TestSubquestionOptions {
  id?: string;
  loopQuestionId?: string;
  type?: "short_text" | "long_text" | "multiple_choice" | "radio" | "yes_no" | "date_time";
  title?: string;
  description?: string | null;
  required?: boolean;
  options?: any;
  order?: number;
  createdAt?: Date;
}

/**
 * Create a mock subquestion for loop groups
 */
export function createTestSubquestion(loopQuestionId: string, overrides: TestSubquestionOptions = {}): LoopGroupSubquestion {
  return {
    id: uuid(),
    loopQuestionId,
    type: "short_text",
    title: "Subquestion",
    description: null,
    required: false,
    options: null,
    order: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Composite Factories (Survey with Pages and Questions)
// ============================================================================

export interface SurveyWithDetails {
  survey: Survey;
  pages: SurveyPage[];
  questions: Question[];
}

/**
 * Create a survey with pages and questions for comprehensive testing
 */
export function createTestSurveyWithQuestions(
  surveyOverrides: TestSurveyOptions = {},
  pageCount: number = 2,
  questionsPerPage: number = 3
): SurveyWithDetails {
  const survey = createTestSurvey(surveyOverrides);
  const pages: SurveyPage[] = [];
  const questions: Question[] = [];

  for (let i = 0; i < pageCount; i++) {
    const page = createTestPage(survey.id, {
      title: `Page ${i + 1}`,
      order: i,
    });
    pages.push(page);

    // Create mixed question types for variety
    for (let j = 0; j < questionsPerPage; j++) {
      const questionTypes: TestQuestionOptions["type"][] = [
        "short_text",
        "yes_no",
        "multiple_choice",
        "radio",
        "long_text",
      ];
      const type = questionTypes[j % questionTypes.length];

      let question: Question;
      if (type === "yes_no") {
        question = createTestYesNoQuestion(page.id, { order: j });
      } else if (type === "multiple_choice") {
        question = createTestMultipleChoiceQuestion(page.id, { order: j });
      } else if (type === "radio") {
        question = createTestRadioQuestion(page.id, { order: j });
      } else {
        question = createTestQuestion(page.id, {
          type,
          title: `Question ${j + 1}`,
          order: j,
        });
      }

      questions.push(question);
    }
  }

  return { survey, pages, questions };
}

/**
 * Create a survey with specific question types
 */
export function createTestSurveyWithSpecificQuestions(
  questionTypes: TestQuestionOptions["type"][],
  surveyOverrides: TestSurveyOptions = {}
): SurveyWithDetails {
  const survey = createTestSurvey(surveyOverrides);
  const page = createTestPage(survey.id);
  const pages = [page];

  const questions = questionTypes.map((type, i) => {
    return createTestQuestion(page.id, {
      type,
      title: `${type} question`,
      order: i,
      required: i === 0, // Make first question required
    });
  });

  return { survey, pages, questions };
}

/**
 * Create a minimal survey (1 page, 1 question) for simple tests
 */
export function createTestMinimalSurvey(surveyOverrides: TestSurveyOptions = {}): SurveyWithDetails {
  const survey = createTestSurvey(surveyOverrides);
  const page = createTestPage(survey.id);
  const question = createTestQuestion(page.id, {
    title: "Simple question",
    required: true,
  });

  return {
    survey,
    pages: [page],
    questions: [question],
  };
}
