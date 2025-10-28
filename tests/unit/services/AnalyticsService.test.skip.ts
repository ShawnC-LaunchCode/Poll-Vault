import { describe, it, expect, beforeEach, vi } from "vitest";
import { AnalyticsService } from "../../../server/services/AnalyticsService";
import {
  createTestAnalyticsSummary,
  createTestQuestionAnalytics,
  createTestAnalyticsEvent,
} from "../../factories/analyticsFactory";
import { createTestSurvey } from "../../factories/mockFactories";

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let mockAnalyticsRepo: any;
  let mockResponseRepo: any;
  let mockSurveyRepo: any;

  beforeEach(() => {
    mockAnalyticsRepo = {
      trackEvent: vi.fn(),
      getEventsBySurveyId: vi.fn(),
      getEventsByResponseId: vi.fn(),
      getQuestionMetrics: vi.fn(),
      getPageMetrics: vi.fn(),
      getCompletionFunnel: vi.fn(),
      getAverageCompletionTime: vi.fn(),
    };

    mockResponseRepo = {
      countBySurveyId: vi.fn(),
      findBySurveyId: vi.fn(),
    };

    mockSurveyRepo = {
      findById: vi.fn(),
    };

    service = new AnalyticsService(mockAnalyticsRepo, mockResponseRepo, mockSurveyRepo);
  });

  describe("getSurveyAnalytics", () => {
    it("should return comprehensive survey analytics", async () => {
      const survey = createTestSurvey();

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockResponseRepo.countBySurveyId.mockResolvedValueOnce(100); // total
      mockResponseRepo.countBySurveyId.mockResolvedValueOnce(80); // completed
      mockAnalyticsRepo.getAverageCompletionTime.mockResolvedValue(300);

      const result = await service.getSurveyAnalytics(survey.id);

      expect(result.responseCount).toBe(100);
      expect(result.completionRate).toBe(0.8);
      expect(result.avgCompletionTime).toBe(300);
    });

    it("should handle surveys with no responses", async () => {
      const survey = createTestSurvey();

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockResponseRepo.countBySurveyId.mockResolvedValue(0);
      mockAnalyticsRepo.getAverageCompletionTime.mockResolvedValue(null);

      const result = await service.getSurveyAnalytics(survey.id);

      expect(result.responseCount).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.avgCompletionTime).toBeNull();
    });
  });

  describe("getQuestionAnalytics", () => {
    it("should return question-level metrics", async () => {
      const mockMetrics = [
        createTestQuestionAnalytics("q1", { views: 100, answers: 90 }),
        createTestQuestionAnalytics("q2", { views: 100, answers: 85 }),
        createTestQuestionAnalytics("q3", { views: 90, answers: 80 }),
      ];

      mockAnalyticsRepo.getQuestionMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getQuestionAnalytics("survey-123");

      expect(result).toHaveLength(3);
      expect(result[0].answerRate).toBe(0.9);
      expect(result[1].answerRate).toBe(0.85);
    });

    it("should calculate answer rates correctly", async () => {
      const mockMetrics = [
        createTestQuestionAnalytics("q1", { views: 50, answers: 25 }),
      ];

      mockAnalyticsRepo.getQuestionMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getQuestionAnalytics("survey-123");

      expect(result[0].answerRate).toBe(0.5);
    });
  });

  describe("getCompletionFunnel", () => {
    it("should calculate drop-off rates between pages", async () => {
      const funnelData = [
        { pageId: "page-1", order: 0, views: 100, title: "Page 1" },
        { pageId: "page-2", order: 1, views: 80, title: "Page 2" },
        { pageId: "page-3", order: 2, views: 60, title: "Page 3" },
      ];

      mockAnalyticsRepo.getCompletionFunnel.mockResolvedValue(funnelData);

      const result = await service.getCompletionFunnel("survey-123");

      expect(result).toHaveLength(3);
      expect(result[0].dropOffRate).toBe(0); // First page
      expect(result[1].dropOffRate).toBe(0.2); // 20% dropped from page 1 to 2
      expect(result[2].dropOffRate).toBe(0.25); // 25% dropped from page 2 to 3
    });

    it("should handle single-page surveys", async () => {
      const funnelData = [
        { pageId: "page-1", order: 0, views: 50, title: "Only Page" },
      ];

      mockAnalyticsRepo.getCompletionFunnel.mockResolvedValue(funnelData);

      const result = await service.getCompletionFunnel("survey-123");

      expect(result).toHaveLength(1);
      expect(result[0].dropOffRate).toBe(0);
    });
  });

  describe("trackEvent", () => {
    it("should track analytics events", async () => {
      const eventData = {
        responseId: "response-123",
        surveyId: "survey-123",
        pageId: "page-1",
        event: "page_view" as const,
      };

      const trackedEvent = createTestAnalyticsEvent(eventData);
      mockAnalyticsRepo.trackEvent.mockResolvedValue(trackedEvent);

      const result = await service.trackEvent(eventData);

      expect(result.event).toBe("page_view");
      expect(mockAnalyticsRepo.trackEvent).toHaveBeenCalledWith(eventData);
    });

    it("should track events with duration", async () => {
      const eventData = {
        responseId: "response-123",
        surveyId: "survey-123",
        questionId: "question-123",
        event: "question_answer" as const,
        duration: 45,
      };

      const trackedEvent = createTestAnalyticsEvent(eventData);
      mockAnalyticsRepo.trackEvent.mockResolvedValue(trackedEvent);

      const result = await service.trackEvent(eventData);

      expect(result.duration).toBe(45);
    });
  });

  describe("getResponseJourney", () => {
    it("should return chronological events for a response", async () => {
      const events = [
        createTestAnalyticsEvent({ event: "survey_start", timestamp: new Date("2025-01-01T10:00:00Z") }),
        createTestAnalyticsEvent({ event: "page_view", timestamp: new Date("2025-01-01T10:01:00Z") }),
        createTestAnalyticsEvent({ event: "page_leave", timestamp: new Date("2025-01-01T10:03:00Z") }),
        createTestAnalyticsEvent({ event: "survey_complete", timestamp: new Date("2025-01-01T10:05:00Z") }),
      ];

      mockAnalyticsRepo.getEventsByResponseId.mockResolvedValue(events);

      const result = await service.getResponseJourney("response-123");

      expect(result).toHaveLength(4);
      expect(result[0].event).toBe("survey_start");
      expect(result[result.length - 1].event).toBe("survey_complete");
    });
  });

  describe("getEngagementMetrics", () => {
    it("should calculate engagement metrics", async () => {
      const responses = Array.from({ length: 100 }, (_, i) => ({
        id: `response-${i}`,
        completed: i < 80, // 80% completion rate
      }));

      mockResponseRepo.findBySurveyId.mockResolvedValue(responses);
      mockAnalyticsRepo.getAverageCompletionTime.mockResolvedValue(240);

      const result = await service.getEngagementMetrics("survey-123");

      expect(result.totalResponses).toBe(100);
      expect(result.completedResponses).toBe(80);
      expect(result.abandonmentRate).toBe(0.2);
      expect(result.avgSessionDuration).toBe(240);
    });

    it("should handle zero responses gracefully", async () => {
      mockResponseRepo.findBySurveyId.mockResolvedValue([]);
      mockAnalyticsRepo.getAverageCompletionTime.mockResolvedValue(null);

      const result = await service.getEngagementMetrics("survey-123");

      expect(result.totalResponses).toBe(0);
      expect(result.completedResponses).toBe(0);
      expect(result.abandonmentRate).toBe(0);
    });
  });

  describe("getTimeSeries", () => {
    it("should group responses by day", async () => {
      const responses = [
        { createdAt: new Date("2025-01-01T10:00:00Z") },
        { createdAt: new Date("2025-01-01T14:00:00Z") },
        { createdAt: new Date("2025-01-02T10:00:00Z") },
        { createdAt: new Date("2025-01-03T10:00:00Z") },
      ];

      mockResponseRepo.findBySurveyId.mockResolvedValue(responses);

      const result = await service.getTimeSeries("survey-123", "day");

      expect(result["2025-01-01"]).toBe(2);
      expect(result["2025-01-02"]).toBe(1);
      expect(result["2025-01-03"]).toBe(1);
    });

    it("should group responses by hour", async () => {
      const responses = [
        { createdAt: new Date("2025-01-01T10:00:00Z") },
        { createdAt: new Date("2025-01-01T10:30:00Z") },
        { createdAt: new Date("2025-01-01T11:00:00Z") },
      ];

      mockResponseRepo.findBySurveyId.mockResolvedValue(responses);

      const result = await service.getTimeSeries("survey-123", "hour");

      expect(result["2025-01-01T10:00"]).toBe(2);
      expect(result["2025-01-01T11:00"]).toBe(1);
    });
  });
});
