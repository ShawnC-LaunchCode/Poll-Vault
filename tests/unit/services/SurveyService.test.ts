import { describe, it, expect, beforeEach, vi } from "vitest";
import { SurveyService } from "../../../server/services/SurveyService";
import { createTestSurvey, createTestSurveyWithQuestions, createTestPage } from "../../factories/mockFactories";
import { createTestUser } from "../../factories/userFactory";

describe("SurveyService", () => {
  let service: SurveyService;
  let mockSurveyRepo: any;
  let mockPageRepo: any;
  let mockQuestionRepo: any;
  let mockUserRepo: any;

  beforeEach(() => {
    // Create mock repositories
    mockSurveyRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByCreator: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByPublicLink: vi.fn(),
      transaction: vi.fn((callback) => callback()),
    };

    mockPageRepo = {
      create: vi.fn(),
      findBySurveyId: vi.fn(),
      findBySurvey: vi.fn(), // Alias for different method name
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockQuestionRepo = {
      findBySurveyId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockUserRepo = {
      findById: vi.fn(),
    };

    // Create service with mocked dependencies
    service = new SurveyService(mockSurveyRepo, mockPageRepo, mockQuestionRepo, mockUserRepo);
  });

  describe("createSurvey", () => {
    it("should create a survey with a default page", async () => {
      const user = createTestUser();
      const surveyData = {
        title: "Employee Engagement Survey",
        description: "Annual survey",
      };

      const createdSurvey = createTestSurvey({
        ...surveyData,
        creatorId: user.id,
        status: "draft",
      });

      mockSurveyRepo.create.mockResolvedValue(createdSurvey);
      mockPageRepo.create.mockResolvedValue(createTestPage(createdSurvey.id));

      const result = await service.createSurvey(surveyData, user.id);

      expect(result.title).toBe("Employee Engagement Survey");
      expect(result.creatorId).toBe(user.id);
      expect(result.status).toBe("draft");
      expect(mockSurveyRepo.create).toHaveBeenCalled();
      expect(mockPageRepo.create).toHaveBeenCalled();
    });
  });

  describe("verifyOwnership", () => {
    it("should return survey if user is the owner", async () => {
      const user = createTestUser();
      const survey = createTestSurvey({ creatorId: user.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockUserRepo.findById.mockResolvedValue(user);

      const result = await service.verifyOwnership(survey.id, user.id);

      expect(result.id).toBe(survey.id);
      expect(result.creatorId).toBe(user.id);
    });

    it("should throw error if survey not found", async () => {
      mockSurveyRepo.findById.mockResolvedValue(null);

      await expect(service.verifyOwnership("non-existent", "user-123")).rejects.toThrow(
        "Survey not found"
      );
    });

    it("should throw error if user is not the creator", async () => {
      const creator = createTestUser();
      const otherUser = createTestUser();
      const survey = createTestSurvey({ creatorId: creator.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockUserRepo.findById.mockResolvedValue(otherUser);

      await expect(service.verifyOwnership(survey.id, otherUser.id)).rejects.toThrow(
        "Access denied"
      );
    });

    it("should allow admin to access any survey", async () => {
      const creator = createTestUser();
      const admin = createTestUser({ role: "admin" });
      const survey = createTestSurvey({ creatorId: creator.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockUserRepo.findById.mockResolvedValue(admin);

      const result = await service.verifyOwnership(survey.id, admin.id);

      expect(result.id).toBe(survey.id);
    });
  });

  describe("getSurvey", () => {
    it("should return survey by id", async () => {
      const survey = createTestSurvey();
      mockSurveyRepo.findById.mockResolvedValue(survey);

      const result = await service.getSurvey(survey.id);

      expect(result?.id).toBe(survey.id);
    });

    it("should return undefined if not found", async () => {
      mockSurveyRepo.findById.mockResolvedValue(null);

      const result = await service.getSurvey("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getSurveysByCreator", () => {
    it("should return all surveys for a creator", async () => {
      const user = createTestUser();
      const surveys = [
        createTestSurvey({ creatorId: user.id }),
        createTestSurvey({ creatorId: user.id }),
        createTestSurvey({ creatorId: user.id }),
      ];

      mockSurveyRepo.findByCreator.mockResolvedValue(surveys);

      const result = await service.getSurveysByCreator(user.id);

      expect(result).toHaveLength(3);
      expect(result.every((s) => s.creatorId === user.id)).toBe(true);
    });
  });

  describe("updateSurvey", () => {
    it("should update survey with ownership check", async () => {
      const user = createTestUser();
      const survey = createTestSurvey({ creatorId: user.id });
      const updates = { title: "Updated Title", description: "New description" };

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockUserRepo.findById.mockResolvedValue(user);
      mockSurveyRepo.update.mockResolvedValue({ ...survey, ...updates });

      const result = await service.updateSurvey(survey.id, user.id, updates);

      expect(result?.title).toBe("Updated Title");
      expect(result?.description).toBe("New description");
      expect(mockSurveyRepo.update).toHaveBeenCalled();
    });

    it("should auto-generate publicLink when enabling anonymous access", async () => {
      const user = createTestUser();
      const survey = createTestSurvey({ creatorId: user.id, publicLink: null });
      const updates = {
        allowAnonymous: true,
        anonymousAccessType: "unlimited" as const,
      };

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockUserRepo.findById.mockResolvedValue(user);
      mockSurveyRepo.update.mockResolvedValue({
        ...survey,
        ...updates,
        publicLink: "generated-uuid",
      });

      const result = await service.updateSurvey(survey.id, user.id, updates);

      expect(result?.allowAnonymous).toBe(true);
      expect(result?.publicLink).toBeDefined();
    });
  });

  describe("deleteSurvey", () => {
    it("should delete survey with ownership check", async () => {
      const user = createTestUser();
      const survey = createTestSurvey({ creatorId: user.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockUserRepo.findById.mockResolvedValue(user);
      mockSurveyRepo.delete.mockResolvedValue(undefined);

      await expect(service.deleteSurvey(survey.id, user.id)).resolves.not.toThrow();
      expect(mockSurveyRepo.delete).toHaveBeenCalledWith(survey.id);
    });

    it("should throw error if user is not the creator", async () => {
      const creator = createTestUser();
      const otherUser = createTestUser();
      const survey = createTestSurvey({ creatorId: creator.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockUserRepo.findById.mockResolvedValue(otherUser);

      await expect(service.deleteSurvey(survey.id, otherUser.id)).rejects.toThrow();
      expect(mockSurveyRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe("changeStatus", () => {
    it("should change survey status from draft to open", async () => {
      const user = createTestUser();
      const survey = createTestSurvey({ creatorId: user.id, status: "draft" });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockUserRepo.findById.mockResolvedValue(user);
      mockPageRepo.findBySurvey.mockResolvedValue([createTestPage(survey.id)]);
      mockQuestionRepo.findBySurveyId.mockResolvedValue([]);
      mockSurveyRepo.update.mockResolvedValue({ ...survey, status: "open" });

      const result = await service.changeStatus(survey.id, user.id, "open");

      expect(result?.status).toBe("open");
    });

    it("should throw error for invalid status", async () => {
      const user = createTestUser();
      const survey = createTestSurvey({ creatorId: user.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockUserRepo.findById.mockResolvedValue(user);

      await expect(
        service.changeStatus(survey.id, user.id, "invalid" as any)
      ).rejects.toThrow();
    });
  });

  describe("getSurveyByPublicLink", () => {
    it("should return survey for valid public link", async () => {
      const survey = createTestSurvey({
        status: "open",
        allowAnonymous: true,
        publicLink: "abc-123-def",
      });

      mockSurveyRepo.findByPublicLink.mockResolvedValue(survey);
      mockPageRepo.findBySurvey.mockResolvedValue([]);

      const result = await service.getSurveyByPublicLink("abc-123-def");

      expect(result.survey.publicLink).toBe("abc-123-def");
      expect(result.survey.allowAnonymous).toBe(true);
    });

    it("should throw error if survey not found", async () => {
      mockSurveyRepo.findByPublicLink.mockResolvedValue(null);

      await expect(service.getSurveyByPublicLink("invalid-link")).rejects.toThrow(
        "Survey not found"
      );
    });

    it("should throw error if survey is not open", async () => {
      const survey = createTestSurvey({
        status: "closed",
        allowAnonymous: true,
        publicLink: "abc-123",
      });

      mockSurveyRepo.findByPublicLink.mockResolvedValue(survey);

      await expect(service.getSurveyByPublicLink("abc-123")).rejects.toThrow(
        "Survey is not currently open"
      );
    });

    it("should throw error if anonymous access is disabled", async () => {
      const survey = createTestSurvey({
        status: "open",
        allowAnonymous: false,
        publicLink: "abc-123",
      });

      mockSurveyRepo.findByPublicLink.mockResolvedValue(survey);

      await expect(service.getSurveyByPublicLink("abc-123")).rejects.toThrow(
        "Anonymous access is not enabled"
      );
    });
  });
});
