import { v4 as uuid } from "uuid";
import type { AnalyticsEvent } from "../../shared/schema";

export interface TestAnalyticsOptions {
  id?: string;
  responseId?: string;
  surveyId?: string;
  pageId?: string | null;
  questionId?: string | null;
  event?: "page_view" | "page_leave" | "question_focus" | "question_blur" | "question_answer" | "question_skip" | "survey_start" | "survey_complete" | "survey_abandon";
  data?: any;
  duration?: number | null;
  timestamp?: Date;
}

/**
 * Create a test analytics event
 */
export function createTestAnalyticsEvent(overrides: TestAnalyticsOptions = {}): AnalyticsEvent {
  return {
    id: uuid(),
    responseId: uuid(),
    surveyId: uuid(),
    pageId: null,
    questionId: null,
    event: "page_view",
    data: null,
    duration: null,
    timestamp: new Date(),
    ...overrides,
  };
}

/**
 * Create multiple analytics events
 */
export function createTestAnalyticsEvents(count: number, baseOverrides: TestAnalyticsOptions = {}): AnalyticsEvent[] {
  return Array.from({ length: count }, () =>
    createTestAnalyticsEvent(baseOverrides)
  );
}

/**
 * Create a survey journey (start → page views → complete)
 */
export function createTestSurveyJourney(
  responseId: string,
  surveyId: string,
  pageIds: string[],
  completed: boolean = true
): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = [];
  let timestamp = new Date(Date.now() - 600000); // 10 minutes ago

  // Survey start
  events.push(createTestAnalyticsEvent({
    responseId,
    surveyId,
    event: "survey_start",
    timestamp: new Date(timestamp),
  }));

  // Page views with durations
  pageIds.forEach((pageId, index) => {
    timestamp = new Date(timestamp.getTime() + 60000); // +1 minute

    events.push(createTestAnalyticsEvent({
      responseId,
      surveyId,
      pageId,
      event: "page_view",
      timestamp: new Date(timestamp),
    }));

    if (index < pageIds.length - 1) {
      timestamp = new Date(timestamp.getTime() + 120000); // +2 minutes
      events.push(createTestAnalyticsEvent({
        responseId,
        surveyId,
        pageId,
        event: "page_leave",
        duration: 120,
        timestamp: new Date(timestamp),
      }));
    }
  });

  // Survey completion or abandon
  timestamp = new Date(timestamp.getTime() + 60000);
  events.push(createTestAnalyticsEvent({
    responseId,
    surveyId,
    event: completed ? "survey_complete" : "survey_abandon",
    timestamp: new Date(timestamp),
  }));

  return events;
}

/**
 * Create question interaction events
 */
export function createTestQuestionInteractions(
  responseId: string,
  surveyId: string,
  questionId: string,
  answered: boolean = true
): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = [];
  let timestamp = new Date();

  // Focus
  events.push(createTestAnalyticsEvent({
    responseId,
    surveyId,
    questionId,
    event: "question_focus",
    timestamp: new Date(timestamp),
  }));

  // Answer or skip
  timestamp = new Date(timestamp.getTime() + 30000); // +30 seconds
  if (answered) {
    events.push(createTestAnalyticsEvent({
      responseId,
      surveyId,
      questionId,
      event: "question_answer",
      duration: 30,
      timestamp: new Date(timestamp),
    }));
  } else {
    events.push(createTestAnalyticsEvent({
      responseId,
      surveyId,
      questionId,
      event: "question_skip",
      timestamp: new Date(timestamp),
    }));
  }

  // Blur
  timestamp = new Date(timestamp.getTime() + 1000);
  events.push(createTestAnalyticsEvent({
    responseId,
    surveyId,
    questionId,
    event: "question_blur",
    timestamp: new Date(timestamp),
  }));

  return events;
}

/**
 * Mock analytics summary data
 */
export function createTestAnalyticsSummary(overrides: any = {}) {
  return {
    responseCount: 10,
    completionRate: 0.8,
    avgCompletionTime: 300, // 5 minutes in seconds
    medianCompletionTime: 280,
    totalViews: 15,
    abandonmentRate: 0.2,
    ...overrides,
  };
}

/**
 * Mock question analytics data
 */
export function createTestQuestionAnalytics(questionId: string, overrides: any = {}) {
  return {
    questionId,
    views: 100,
    answers: 85,
    skips: 10,
    answerRate: 0.85,
    avgTimeSpent: 45,
    ...overrides,
  };
}
