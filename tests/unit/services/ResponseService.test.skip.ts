import { describe, it, expect, beforeEach, vi } from "vitest";
import { ResponseService } from "../../../server/services/ResponseService";
import {
  createTestResponse,
  createTestCompletedResponse,
  createTestAnonymousResponse,
  createTestAnswer,
} from "../../factories/responseFactory";
import { createTestSurvey, createTestQuestion } from "../../factories/mockFactories";

describe("ResponseService", () => {
  let service: ResponseService;
  let mockResponseRepo: any;
  let mockSurveyRepo: any;
  let mockQuestionRepo: any;

  beforeEach(() => {
    mockResponseRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findBySurveyId: vi.fn(),
      saveAnswer: vi.fn(),
      markComplete: vi.fn(),
      checkAnonymousLimit: vi.fn(),
      countBySurveyId: vi.fn(),
    };

    mockSurveyRepo = {
      findById: vi.fn(),
      findByPublicLink: vi.fn(),
    };

    mockQuestionRepo = {
      findBySurveyId: vi.fn(),
    };

    service = new ResponseService(mockResponseRepo, mockSurveyRepo, mockQuestionRepo);
  });

  describe("createResponse", () => {
    it("should create an authenticated response", async () => {
      const survey = createTestSurvey({ status: "open" });
      const responseData = {
        surveyId: survey.id,
        recipientId: "recipient-123",
        isAnonymous: false,
      };

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockResponseRepo.create.mockResolvedValue(createTestResponse(responseData));

      const result = await service.createResponse(responseData);

      expect(result.surveyId).toBe(survey.id);
      expect(result.isAnonymous).toBe(false);
      expect(mockResponseRepo.create).toHaveBeenCalled();
    });

    it("should throw error if survey is not open", async () => {
      const survey = createTestSurvey({ status: "draft" });

      mockSurveyRepo.findById.mockResolvedValue(survey);

      await expect(
        service.createResponse({ surveyId: survey.id, recipientId: null, isAnonymous: false })
      ).rejects.toThrow("Survey is not open");
    });
  });

  describe("createAnonymousResponse", () => {
    it("should create anonymous response for public survey", async () => {
      const survey = createTestSurvey({
        status: "open",
        allowAnonymous: true,
        anonymousAccessType: "unlimited",
        publicLink: "public-123",
      });

      mockSurveyRepo.findByPublicLink.mockResolvedValue(survey);
      mockResponseRepo.create.mockResolvedValue(
        createTestAnonymousResponse(survey.id, { ipAddress: "192.168.1.1" })
      );

      const result = await service.createAnonymousResponse("public-123", {
        ipAddress: "192.168.1.1",
        userAgent: "Test Browser",
      });

      expect(result.isAnonymous).toBe(true);
      expect(result.ipAddress).toBe("192.168.1.1");
    });

    it("should enforce one_per_ip limit", async () => {
      const survey = createTestSurvey({
        status: "open",
        allowAnonymous: true,
        anonymousAccessType: "one_per_ip",
        publicLink: "public-123",
      });

      mockSurveyRepo.findByPublicLink.mockResolvedValue(survey);
      mockResponseRepo.checkAnonymousLimit.mockResolvedValue(true); // Already responded

      await expect(
        service.createAnonymousResponse("public-123", {
          ipAddress: "192.168.1.1",
          userAgent: "Test Browser",
        })
      ).rejects.toThrow("Already submitted");
    });

    it("should throw error if survey doesn't allow anonymous", async () => {
      const survey = createTestSurvey({
        status: "open",
        allowAnonymous: false,
        publicLink: "public-123",
      });

      mockSurveyRepo.findByPublicLink.mockResolvedValue(survey);

      await expect(
        service.createAnonymousResponse("public-123", {
          ipAddress: "192.168.1.1",
          userAgent: "Test Browser",
        })
      ).rejects.toThrow("Anonymous responses not allowed");
    });
  });

  describe("saveAnswer", () => {
    it("should save a single answer", async () => {
      const response = createTestResponse();
      const answerData = {
        responseId: response.id,
        questionId: "question-123",
        value: { text: "My answer" },
      };

      mockResponseRepo.findById.mockResolvedValue(response);
      mockResponseRepo.saveAnswer.mockResolvedValue(createTestAnswer(response.id, "question-123"));

      const result = await service.saveAnswer(answerData);

      expect(result.questionId).toBe("question-123");
      expect(mockResponseRepo.saveAnswer).toHaveBeenCalledWith(answerData);
    });

    it("should throw error if response is already completed", async () => {
      const response = createTestCompletedResponse("survey-123");

      mockResponseRepo.findById.mockResolvedValue(response);

      await expect(
        service.saveAnswer({
          responseId: response.id,
          questionId: "question-123",
          value: { text: "Late answer" },
        })
      ).rejects.toThrow("Response already completed");
    });
  });

  describe("completeResponse", () => {
    it("should mark response as complete after validation", async () => {
      const response = createTestResponse();
      const survey = createTestSurvey();
      const questions = [
        createTestQuestion("page-1", { required: true, id: "q1" }),
        createTestQuestion("page-1", { required: false, id: "q2" }),
      ];
      const answers = [createTestAnswer(response.id, "q1")];

      mockResponseRepo.findById.mockResolvedValue({ ...response, answers, survey });
      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockQuestionRepo.findBySurveyId.mockResolvedValue(questions);
      mockResponseRepo.markComplete.mockResolvedValue(
        createTestCompletedResponse(response.surveyId, { id: response.id })
      );

      const result = await service.completeResponse(response.id);

      expect(result.completed).toBe(true);
      expect(result.submittedAt).toBeDefined();
      expect(mockResponseRepo.markComplete).toHaveBeenCalled();
    });

    it("should throw error if required questions are not answered", async () => {
      const response = createTestResponse();
      const survey = createTestSurvey();
      const questions = [
        createTestQuestion("page-1", { required: true, id: "q1" }),
        createTestQuestion("page-1", { required: true, id: "q2" }),
      ];
      const answers = [createTestAnswer(response.id, "q1")]; // Missing q2

      mockResponseRepo.findById.mockResolvedValue({ ...response, answers, survey });
      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockQuestionRepo.findBySurveyId.mockResolvedValue(questions);

      await expect(service.completeResponse(response.id)).rejects.toThrow("Required questions not answered");
    });
  });

  describe("getResponsesForSurvey", () => {
    it("should return all responses for a survey", async () => {
      const survey = createTestSurvey();
      const responses = Array.from({ length: 5 }, () =>
        createTestResponse({ surveyId: survey.id })
      );

      mockResponseRepo.findBySurveyId.mockResolvedValue(responses);

      const result = await service.getResponsesForSurvey(survey.id);

      expect(result).toHaveLength(5);
      expect(result.every(r => r.surveyId === survey.id)).toBe(true);
    });

    it("should filter by completion status", async () => {
      const survey = createTestSurvey();
      const completedResponses = Array.from({ length: 3 }, () =>
        createTestCompletedResponse(survey.id)
      );

      mockResponseRepo.findBySurveyId.mockResolvedValue(completedResponses);

      const result = await service.getResponsesForSurvey(survey.id, true);

      expect(result).toHaveLength(3);
      expect(result.every(r => r.completed === true)).toBe(true);
    });
  });

  describe("getResponseStatistics", () => {
    it("should calculate response statistics", async () => {
      mockResponseRepo.countBySurveyId.mockResolvedValueOnce(100); // total
      mockResponseRepo.countBySurveyId.mockResolvedValueOnce(75); // completed

      const result = await service.getResponseStatistics("survey-123");

      expect(result.total).toBe(100);
      expect(result.completed).toBe(75);
      expect(result.completionRate).toBe(0.75);
    });

    it("should handle zero responses", async () => {
      mockResponseRepo.countBySurveyId.mockResolvedValue(0);

      const result = await service.getResponseStatistics("survey-123");

      expect(result.total).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.completionRate).toBe(0);
    });
  });
});
