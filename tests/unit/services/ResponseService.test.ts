import { describe, it, expect, beforeEach, vi } from "vitest";
import { ResponseService } from "../../../server/services/ResponseService";
import {
  createTestResponse,
  createTestCompletedResponse,
  createTestAnonymousResponse,
  createTestAnswer,
} from "../../factories/responseFactory";
import { createTestSurvey, createTestQuestion, createTestPage } from "../../factories/mockFactories";

describe("ResponseService", () => {
  let service: ResponseService;
  let mockResponseRepo: any;
  let mockSurveyRepo: any;
  let mockQuestionRepo: any;
  let mockRecipientRepo: any;
  let mockPageRepo: any;
  let mockSystemStatsRepo: any;

  beforeEach(() => {
    mockResponseRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findBySurvey: vi.fn(),
      findByRecipient: vi.fn(),
      update: vi.fn(),
      saveAnswer: vi.fn(),
      checkAnonymousLimit: vi.fn(),
      findAnswersByResponse: vi.fn(),
    };

    mockSurveyRepo = {
      findById: vi.fn(),
      findByPublicLink: vi.fn(),
    };

    mockQuestionRepo = {
      findBySurveyId: vi.fn(),
      findById: vi.fn(),
    };

    mockRecipientRepo = {
      findByToken: vi.fn(),
    };

    mockPageRepo = {
      findBySurveyId: vi.fn(),
      findBySurvey: vi.fn(),  // Alias for same functionality
    };

    mockSystemStatsRepo = {
      incrementResponsesCollected: vi.fn(),
    };

    service = new ResponseService(
      mockResponseRepo,
      mockSurveyRepo,
      mockQuestionRepo,
      mockRecipientRepo,
      mockPageRepo,
      mockSystemStatsRepo
    );
  });

  describe("createAuthenticatedResponse", () => {
    it("should create an authenticated response with valid token", async () => {
      const survey = createTestSurvey({ status: "open" });
      const recipient = {
        id: "recipient-123",
        surveyId: survey.id,
        email: "test@example.com",
        token: "valid-token",
      };
      const response = createTestResponse({
        surveyId: survey.id,
        recipientId: recipient.id,
        isAnonymous: false,
      });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockRecipientRepo.findByToken.mockResolvedValue(recipient);
      mockResponseRepo.findByRecipient.mockResolvedValue(null);
      mockResponseRepo.create.mockResolvedValue(response);

      const result = await service.createAuthenticatedResponse(survey.id, "valid-token");

      expect(result.response.surveyId).toBe(survey.id);
      expect(result.response.isAnonymous).toBe(false);
      expect(mockResponseRepo.create).toHaveBeenCalled();
    });

    it("should throw error if survey is not open", async () => {
      const survey = createTestSurvey({ status: "draft" });

      mockSurveyRepo.findById.mockResolvedValue(survey);

      await expect(service.createAuthenticatedResponse(survey.id)).rejects.toThrow(
        "not currently open"
      );
    });

    it("should throw error if survey not found", async () => {
      mockSurveyRepo.findById.mockResolvedValue(null);

      await expect(service.createAuthenticatedResponse("non-existent")).rejects.toThrow(
        "Survey not found"
      );
    });

    it("should throw error if token is invalid", async () => {
      const survey = createTestSurvey({ status: "open" });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockRecipientRepo.findByToken.mockResolvedValue(null);

      await expect(
        service.createAuthenticatedResponse(survey.id, "invalid-token")
      ).rejects.toThrow("Invalid token");
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
      const response = createTestAnonymousResponse(survey.id, {
        ipAddress: "192.168.1.1",
      });

      mockSurveyRepo.findByPublicLink.mockResolvedValue(survey);
      mockResponseRepo.create.mockResolvedValue(response);

      const result = await service.createAnonymousResponse("public-123", {
        ipAddress: "192.168.1.1",
        userAgent: "Test Browser",
      });

      expect(result.response.isAnonymous).toBe(true);
      expect(result.response.ipAddress).toBe("192.168.1.1");
    });

    it("should enforce one_per_ip limit", async () => {
      const survey = createTestSurvey({
        status: "open",
        allowAnonymous: true,
        anonymousAccessType: "one_per_ip",
        publicLink: "public-123",
      });

      mockSurveyRepo.findByPublicLink.mockResolvedValue(survey);
      mockResponseRepo.checkAnonymousLimit.mockResolvedValue(true);

      await expect(
        service.createAnonymousResponse("public-123", {
          ipAddress: "192.168.1.1",
          userAgent: "Test Browser",
        })
      ).rejects.toThrow("already submitted");
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
      ).rejects.toThrow("not enabled for anonymous");
    });
  });

  describe("submitAnswer", () => {
    it("should save a single answer", async () => {
      const response = createTestResponse({ completed: false });
      const question = createTestQuestion("page-1", { id: "question-123" });
      const answerData = {
        responseId: response.id,
        questionId: question.id,
        value: { text: "My answer" },
      };

      mockResponseRepo.findById.mockResolvedValue(response);
      mockQuestionRepo.findById.mockResolvedValue(question);
      mockResponseRepo.saveAnswer.mockResolvedValue(
        createTestAnswer(response.id, question.id)
      );

      const result = await service.submitAnswer(answerData);

      expect(result.questionId).toBe(question.id);
      expect(mockResponseRepo.saveAnswer).toHaveBeenCalledWith(answerData);
    });

    it("should throw error if response is already completed", async () => {
      const response = createTestCompletedResponse("survey-123");

      mockResponseRepo.findById.mockResolvedValue(response);

      await expect(
        service.submitAnswer({
          responseId: response.id,
          questionId: "question-123",
          value: { text: "Late answer" },
        })
      ).rejects.toThrow("already been completed");
    });

    it("should throw error if response not found", async () => {
      mockResponseRepo.findById.mockResolvedValue(null);

      await expect(
        service.submitAnswer({
          responseId: "non-existent",
          questionId: "question-123",
          value: { text: "Answer" },
        })
      ).rejects.toThrow("Response not found");
    });
  });

  describe("completeResponse", () => {
    it("should mark response as complete after validation", async () => {
      const survey = createTestSurvey();
      const page = createTestPage(survey.id);
      const questions = [
        createTestQuestion(page.id, { id: "q1", required: true }),
        createTestQuestion(page.id, { id: "q2", required: false }),
      ];
      const response = createTestResponse({ surveyId: survey.id });
      const answers = [createTestAnswer(response.id, "q1")];

      mockResponseRepo.findById.mockResolvedValue({
        ...response,
        survey,
        answers,
      });
      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockPageRepo.findBySurvey.mockResolvedValue([page]);
      mockQuestionRepo.findBySurveyId.mockResolvedValue(questions);
      mockResponseRepo.findAnswersByResponse.mockResolvedValue(answers);
      mockResponseRepo.update.mockResolvedValue(
        createTestCompletedResponse(survey.id, { id: response.id })
      );

      const result = await service.completeResponse(response.id);

      expect(result.completed).toBe(true);
      expect(result.submittedAt).toBeDefined();
      expect(mockResponseRepo.update).toHaveBeenCalled();
    });

    it("should throw error if required questions are not answered", async () => {
      const survey = createTestSurvey();
      const page = createTestPage(survey.id);
      const questions = [
        createTestQuestion(page.id, { id: "q1", required: true }),
        createTestQuestion(page.id, { id: "q2", required: true }),
      ];
      const response = createTestResponse({ surveyId: survey.id });
      const answers = [createTestAnswer(response.id, "q1")]; // Missing q2

      mockResponseRepo.findById.mockResolvedValue({
        ...response,
        survey,
        answers,
      });
      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockPageRepo.findBySurvey.mockResolvedValue([page]);
      mockQuestionRepo.findBySurveyId.mockResolvedValue(questions);
      mockResponseRepo.findAnswersByResponse.mockResolvedValue(answers);

      await expect(service.completeResponse(response.id)).rejects.toThrow(
        "Required question"
      );
    });
  });

  describe("getResponsesForSurvey", () => {
    it("should return all responses for a survey", async () => {
      const survey = createTestSurvey();
      const responses = Array.from({ length: 5 }, () =>
        createTestResponse({ surveyId: survey.id })
      );

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockResponseRepo.findBySurvey.mockResolvedValue(responses);

      const result = await service.getResponsesForSurvey(survey.id);

      expect(result).toHaveLength(5);
      expect(result.every((r) => r.surveyId === survey.id)).toBe(true);
    });

    it("should filter by completion status", async () => {
      const survey = createTestSurvey();
      const completedResponses = Array.from({ length: 3 }, () =>
        createTestCompletedResponse(survey.id)
      );

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockResponseRepo.findBySurvey.mockResolvedValue(completedResponses);

      const result = await service.getResponsesForSurvey(survey.id, true);

      expect(result).toHaveLength(3);
      expect(result.every((r) => r.completed === true)).toBe(true);
    });
  });

  describe("getResponseDetails", () => {
    it("should return response with answers and survey details", async () => {
      const survey = createTestSurvey();
      const response = createTestResponse({ surveyId: survey.id });
      const answers = [
        createTestAnswer(response.id, "q1"),
        createTestAnswer(response.id, "q2"),
      ];

      mockResponseRepo.findById.mockResolvedValue({
        ...response,
        survey,
        answers,
      });

      const result = await service.getResponseDetails(response.id);

      expect(result.id).toBe(response.id);
      expect(result.survey).toBeDefined();
      expect(result.answers).toHaveLength(2);
    });

    it("should throw error if response not found", async () => {
      mockResponseRepo.findById.mockResolvedValue(null);

      await expect(service.getResponseDetails("non-existent")).rejects.toThrow(
        "Response not found"
      );
    });
  });
});
