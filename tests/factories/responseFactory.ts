import { v4 as uuid } from "uuid";
import type { Response, Answer } from "../../shared/schema";

export interface TestResponseOptions {
  id?: string;
  surveyId?: string;
  recipientId?: string | null;
  completed?: boolean;
  submittedAt?: Date | null;
  isAnonymous?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  anonymousMetadata?: any;
  createdAt?: Date;
}

/**
 * Create a test response with sensible defaults
 */
export function createTestResponse(overrides: TestResponseOptions = {}): Response {
  return {
    id: uuid(),
    surveyId: uuid(),
    recipientId: uuid(),
    completed: false,
    submittedAt: null,
    isAnonymous: false,
    ipAddress: null,
    userAgent: null,
    sessionId: null,
    anonymousMetadata: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create multiple test responses
 */
export function createTestResponses(count: number, surveyId: string, baseOverrides: TestResponseOptions = {}): Response[] {
  return Array.from({ length: count }, () =>
    createTestResponse({
      surveyId,
      ...baseOverrides,
    })
  );
}

/**
 * Create a completed response
 */
export function createTestCompletedResponse(surveyId: string, overrides: TestResponseOptions = {}): Response {
  return createTestResponse({
    surveyId,
    completed: true,
    submittedAt: new Date(),
    ...overrides,
  });
}

/**
 * Create an anonymous response
 */
export function createTestAnonymousResponse(surveyId: string, overrides: TestResponseOptions = {}): Response {
  return createTestResponse({
    surveyId,
    recipientId: null,
    isAnonymous: true,
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0 (Test Browser)",
    sessionId: uuid(),
    ...overrides,
  });
}

/**
 * Create a test answer
 */
export function createTestAnswer(responseId: string, questionId: string, overrides: Partial<Answer> = {}): Answer {
  return {
    id: uuid(),
    responseId,
    questionId,
    subquestionId: null,
    loopIndex: null,
    value: { text: "Test answer" },
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create multiple test answers for a response
 */
export function createTestAnswers(
  responseId: string,
  questionIds: string[],
  valueGenerator: (index: number) => any = (i) => ({ text: `Answer ${i + 1}` })
): Answer[] {
  return questionIds.map((questionId, i) =>
    createTestAnswer(responseId, questionId, {
      value: valueGenerator(i),
    })
  );
}

/**
 * Create a response with answers
 */
export function createTestResponseWithAnswers(
  surveyId: string,
  questionIds: string[],
  completed: boolean = false
) {
  const response = createTestResponse({
    surveyId,
    completed,
    submittedAt: completed ? new Date() : null,
  });

  const answers = createTestAnswers(response.id, questionIds);

  return { response, answers };
}
