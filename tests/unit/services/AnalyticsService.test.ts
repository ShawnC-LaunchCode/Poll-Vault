import { describe, it, expect, beforeEach, vi } from "vitest";
import { AnalyticsService } from "../../../server/services/AnalyticsService";
import { createTestSurvey, createTestPage, createTestQuestion } from "../../factories/mockFactories";
import { createTestResponse, createTestCompletedResponse } from "../../factories/responseFactory";

// Mock the storage module - AnalyticsService calls storage directly for some methods
// Use vi.hoisted to ensure mockStorage is available during hoisting
const mockStorage = vi.hoisted(() => ({
  getQuestionAnalytics: vi.fn(),
  getPageAnalytics: vi.fn(),
  getCompletionFunnelData: vi.fn(),
  getTimeSpentData: vi.fn(),
  getEngagementMetrics: vi.fn(),
}));

vi.mock("../../../server/storage", () => ({
  storage: mockStorage,
}));

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let mockAnalyticsRepo: any;
  let mockResponseRepo: any;
  let mockSurveyRepo: any;
  let mockQuestionRepo: any;
  let mockPageRepo: any;

  beforeEach(() => {
    // Reset all storage mocks
    vi.clearAllMocks();

    mockAnalyticsRepo = {
      getAverageCompletionTime: vi.fn(),
      getQuestionMetrics: vi.fn(),
      getPageMetrics: vi.fn(),
      getQuestionAggregates: vi.fn(),
    };

    mockResponseRepo = {
      findBySurvey: vi.fn(),
      countBySurveyId: vi.fn(),
      findAnswersByResponse: vi.fn(),
    };

    mockSurveyRepo = {
      findById: vi.fn(),
    };

    mockQuestionRepo = {
      findBySurveyId: vi.fn(),
      findByPageWithSubquestions: vi.fn(),
    };

    mockPageRepo = {
      findBySurveyId: vi.fn(),
      findBySurvey: vi.fn(),  // Alias for same functionality
    };

    service = new AnalyticsService(
      mockAnalyticsRepo,
      mockResponseRepo,
      mockSurveyRepo,
      mockQuestionRepo,
      mockPageRepo
    );
  });

  describe("getSurveyResults", () => {
    it("should return comprehensive survey analytics", async () => {
      const survey = createTestSurvey();
      const page = createTestPage(survey.id);
      const question = createTestQuestion(page.id);
      const responses = [
        createTestCompletedResponse(survey.id),
        createTestCompletedResponse(survey.id),
        createTestResponse({ surveyId: survey.id, completed: false }),
      ];

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockResponseRepo.findBySurvey.mockResolvedValue(responses);
      mockPageRepo.findBySurvey.mockResolvedValue([page]);
      mockQuestionRepo.findByPageWithSubquestions.mockResolvedValue([question]);
      mockResponseRepo.findAnswersByResponse.mockResolvedValue([]);

      const result = await service.getSurveyResults(survey.id, survey.creatorId);

      expect(result.survey.id).toBe(survey.id);
      expect(result.stats.totalResponses).toBe(3);
      expect(result.stats.completedResponses).toBe(2);
      expect(result.stats.completionRate).toBeCloseTo(66.67, 2);
    });

    it("should throw error if user is not the creator", async () => {
      const survey = createTestSurvey({ creatorId: "user-123" });

      mockSurveyRepo.findById.mockResolvedValue(survey);

      await expect(service.getSurveyResults(survey.id, "other-user")).rejects.toThrow(
        "Access denied"
      );
    });

    it("should throw error if survey not found", async () => {
      mockSurveyRepo.findById.mockResolvedValue(null);

      await expect(service.getSurveyResults("non-existent", "user-123")).rejects.toThrow(
        "Survey not found"
      );
    });
  });

  describe("getQuestionAnalytics", () => {
    it("should return question-level metrics", async () => {
      const survey = createTestSurvey();
      const page = createTestPage(survey.id);
      const questions = [
        createTestQuestion(page.id, { id: "q1" }),
        createTestQuestion(page.id, { id: "q2" }),
      ];
      const mockMetrics = [
        { questionId: "q1", views: 100, answers: 90 },
        { questionId: "q2", views: 100, answers: 85 },
      ];

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockPageRepo.findBySurveyId.mockResolvedValue([page]);
      mockQuestionRepo.findBySurveyId.mockResolvedValue(questions);
      mockStorage.getQuestionAnalytics.mockResolvedValue(mockMetrics);

      const result = await service.getQuestionAnalytics(survey.id, survey.creatorId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
    });

    it("should throw error if not authorized", async () => {
      const survey = createTestSurvey({ creatorId: "user-123" });

      mockSurveyRepo.findById.mockResolvedValue(survey);

      await expect(
        service.getQuestionAnalytics(survey.id, "other-user")
      ).rejects.toThrow("Access denied");
    });
  });

  describe("getPageAnalytics", () => {
    it("should return page-level analytics", async () => {
      const survey = createTestSurvey();
      const pages = [
        createTestPage(survey.id, { id: "page-1", order: 0 }),
        createTestPage(survey.id, { id: "page-2", order: 1 }),
      ];
      const mockMetrics = [
        { pageId: "page-1", views: 100, completions: 80 },
        { pageId: "page-2", views: 80, completions: 70 },
      ];

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockPageRepo.findBySurveyId.mockResolvedValue(pages);
      mockStorage.getPageAnalytics.mockResolvedValue(mockMetrics);

      const result = await service.getPageAnalytics(survey.id, survey.creatorId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
    });
  });

  describe("getCompletionFunnel", () => {
    it("should calculate drop-off rates between pages", async () => {
      const survey = createTestSurvey();
      const pages = [
        createTestPage(survey.id, { id: "page-1", order: 0, title: "Page 1" }),
        createTestPage(survey.id, { id: "page-2", order: 1, title: "Page 2" }),
        createTestPage(survey.id, { id: "page-3", order: 2, title: "Page 3" }),
      ];
      const mockMetrics = [
        { pageId: "page-1", views: 100 },
        { pageId: "page-2", views: 80 },
        { pageId: "page-3", views: 60 },
      ];

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockPageRepo.findBySurveyId.mockResolvedValue(pages);
      mockStorage.getCompletionFunnelData.mockResolvedValue(mockMetrics);

      const result = await service.getCompletionFunnel(survey.id, survey.creatorId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
    });

    it("should handle single-page surveys", async () => {
      const survey = createTestSurvey();
      const pages = [createTestPage(survey.id, { order: 0 })];
      const mockMetrics = [{ pageId: pages[0].id, views: 50 }];

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockPageRepo.findBySurveyId.mockResolvedValue(pages);
      mockStorage.getCompletionFunnelData.mockResolvedValue(mockMetrics);

      const result = await service.getCompletionFunnel(survey.id, survey.creatorId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });

  describe("getTimeSpentData", () => {
    it("should return time spent metrics", async () => {
      const survey = createTestSurvey();
      const responses = [
        createTestCompletedResponse(survey.id),
        createTestCompletedResponse(survey.id),
      ];

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockResponseRepo.findBySurvey.mockResolvedValue(responses);
      mockStorage.getTimeSpentData.mockResolvedValue({
        averageTime: 300,
        medianTime: 300,
        responses: 2,
      });

      const result = await service.getTimeSpentData(survey.id, survey.creatorId);

      expect(result).toBeDefined();
      expect(result.averageTime).toBe(300);
    });

    it("should handle surveys with no completed responses", async () => {
      const survey = createTestSurvey();

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockResponseRepo.findBySurvey.mockResolvedValue([]);
      mockStorage.getTimeSpentData.mockResolvedValue({
        averageTime: null,
        medianTime: null,
        responses: 0,
      });

      const result = await service.getTimeSpentData(survey.id, survey.creatorId);

      expect(result.averageTime).toBeNull();
    });
  });

  describe("getEngagementMetrics", () => {
    it("should calculate engagement metrics", async () => {
      const survey = createTestSurvey();
      const responses = Array.from({ length: 100 }, (_, i) =>
        i < 80
          ? createTestCompletedResponse(survey.id)
          : createTestResponse({ surveyId: survey.id, completed: false })
      );

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockResponseRepo.findBySurvey.mockResolvedValue(responses);
      mockStorage.getEngagementMetrics.mockResolvedValue({
        totalResponses: 100,
        completedResponses: 80,
        abandonmentRate: 0.2,
        averageCompletionTime: 240,
      });

      const result = await service.getEngagementMetrics(survey.id, survey.creatorId);

      expect(result.totalResponses).toBe(100);
      expect(result.completedResponses).toBe(80);
      expect(result.abandonmentRate).toBe(0.2);
    });

    it("should handle zero responses gracefully", async () => {
      const survey = createTestSurvey();

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockResponseRepo.findBySurvey.mockResolvedValue([]);
      mockStorage.getEngagementMetrics.mockResolvedValue({
        totalResponses: 0,
        completedResponses: 0,
        abandonmentRate: 0,
        averageCompletionTime: null,
      });

      const result = await service.getEngagementMetrics(survey.id, survey.creatorId);

      expect(result.totalResponses).toBe(0);
      expect(result.completedResponses).toBe(0);
      expect(result.abandonmentRate).toBe(0);
    });
  });

  describe("getQuestionAggregates", () => {
    it("should return aggregated question data", async () => {
      const survey = createTestSurvey();
      const page = createTestPage(survey.id);
      const questions = [
        createTestQuestion(page.id, {
          id: "q1",
          type: "yes_no",
          title: "Do you agree?",
        }),
        createTestQuestion(page.id, {
          id: "q2",
          type: "multiple_choice",
          title: "Choose options",
          options: ["A", "B", "C"],
        }),
      ];

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockPageRepo.findBySurveyId.mockResolvedValue([page]);
      mockQuestionRepo.findBySurveyId.mockResolvedValue(questions);
      mockResponseRepo.findBySurvey.mockResolvedValue([
        createTestCompletedResponse(survey.id),
      ]);
      mockAnalyticsRepo.getQuestionAggregates.mockResolvedValue({});

      const result = await service.getQuestionAggregates(survey.id, survey.creatorId);

      expect(result).toBeDefined();
    });

    it("should throw error if unauthorized", async () => {
      const survey = createTestSurvey({ creatorId: "user-123" });

      mockSurveyRepo.findById.mockResolvedValue(survey);

      await expect(
        service.getQuestionAggregates(survey.id, "other-user")
      ).rejects.toThrow("Access denied");
    });
  });
});
