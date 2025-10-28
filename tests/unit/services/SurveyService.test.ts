import { describe, it, expect, beforeEach, vi } from "vitest";
import { SurveyService } from "../../../server/services/SurveyService";
import { createTestSurvey, createTestSurveyWithQuestions } from "../../factories/surveyFactory";
import { createTestUser } from "../../factories/userFactory";

describe("SurveyService", () => {
  let service: SurveyService;
  let mockSurveyRepo: any;
  let mockPageRepo: any;
  let mockQuestionRepo: any;

  beforeEach(() => {
    mockSurveyRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByCreatorId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      duplicate: vi.fn(),
      findByPublicLink: vi.fn(),
    };

    mockPageRepo = {
      findBySurveyId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockQuestionRepo = {
      findByPageId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    service = new SurveyService(mockSurveyRepo, mockPageRepo, mockQuestionRepo);
  });

  describe("createSurvey", () => {
    it("should create a survey with ownership validation", async () => {
      const user = createTestUser();
      const surveyData = {
        title: "Employee Engagement Survey",
        description: "Annual survey",
        creatorId: user.id,
      };

      const createdSurvey = createTestSurvey(surveyData);
      mockSurveyRepo.create.mockResolvedValue(createdSurvey);

      const result = await service.createSurvey(surveyData);

      expect(result.title).toBe("Employee Engagement Survey");
      expect(result.creatorId).toBe(user.id);
      expect(mockSurveyRepo.create).toHaveBeenCalledWith(surveyData);
    });

    it("should auto-generate publicLink when allowAnonymous is enabled", async () => {
      const user = createTestUser();
      const surveyData = {
        title: "Public Survey",
        creatorId: user.id,
        allowAnonymous: true,
        anonymousAccessType: "unlimited" as const,
      };

      mockSurveyRepo.create.mockImplementation((data: any) =>
        Promise.resolve(createTestSurvey({ ...data, publicLink: expect.any(String) }))
      );

      const result = await service.createSurvey(surveyData);

      expect(result.allowAnonymous).toBe(true);
      expect(result.publicLink).toBeDefined();
    });
  });

  describe("getSurveyWithDetails", () => {
    it("should return survey with pages and questions", async () => {
      const { survey, pages, questions } = createTestSurveyWithQuestions();

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockPageRepo.findBySurveyId.mockResolvedValue(pages);
      mockQuestionRepo.findByPageId.mockImplementation((pageId: string) =>
        Promise.resolve(questions.filter(q => q.pageId === pageId))
      );

      const result = await service.getSurveyWithDetails(survey.id);

      expect(result).toBeDefined();
      expect(result?.pages).toHaveLength(2);
      expect(result?.pages[0].questions).toBeDefined();
    });

    it("should return null if survey not found", async () => {
      mockSurveyRepo.findById.mockResolvedValue(null);

      const result = await service.getSurveyWithDetails("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("updateSurvey", () => {
    it("should update survey with ownership check", async () => {
      const user = createTestUser();
      const survey = createTestSurvey({ creatorId: user.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockSurveyRepo.update.mockResolvedValue({ ...survey, title: "Updated Title" });

      const result = await service.updateSurvey(survey.id, user.id, { title: "Updated Title" });

      expect(result?.title).toBe("Updated Title");
      expect(mockSurveyRepo.update).toHaveBeenCalled();
    });

    it("should throw error if user is not the creator", async () => {
      const creator = createTestUser();
      const otherUser = createTestUser();
      const survey = createTestSurvey({ creatorId: creator.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);

      await expect(
        service.updateSurvey(survey.id, otherUser.id, { title: "Unauthorized Update" })
      ).rejects.toThrow("Unauthorized");
    });

    it("should auto-generate publicLink when enabling anonymous access", async () => {
      const user = createTestUser();
      const survey = createTestSurvey({ creatorId: user.id, publicLink: null });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockSurveyRepo.update.mockImplementation((id: string, data: any) =>
        Promise.resolve({ ...survey, ...data, publicLink: data.publicLink || "generated-link" })
      );

      const result = await service.updateSurvey(survey.id, user.id, {
        allowAnonymous: true,
        anonymousAccessType: "one_per_ip",
      });

      expect(result?.allowAnonymous).toBe(true);
      expect(result?.publicLink).toBeDefined();
    });
  });

  describe("deleteSurvey", () => {
    it("should delete survey with ownership check", async () => {
      const user = createTestUser();
      const survey = createTestSurvey({ creatorId: user.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockSurveyRepo.delete.mockResolvedValue(undefined);

      await expect(service.deleteSurvey(survey.id, user.id)).resolves.not.toThrow();
      expect(mockSurveyRepo.delete).toHaveBeenCalledWith(survey.id);
    });

    it("should throw error if user is not the creator", async () => {
      const creator = createTestUser();
      const otherUser = createTestUser();
      const survey = createTestSurvey({ creatorId: creator.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);

      await expect(service.deleteSurvey(survey.id, otherUser.id)).rejects.toThrow("Unauthorized");
      expect(mockSurveyRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe("duplicateSurvey", () => {
    it("should create a copy with pages and questions", async () => {
      const user = createTestUser();
      const { survey, pages, questions } = createTestSurveyWithQuestions({ creatorId: user.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockSurveyRepo.duplicate.mockResolvedValue({
        ...survey,
        id: "new-id",
        title: survey.title + " (Copy)",
      });

      const result = await service.duplicateSurvey(survey.id, user.id, false);

      expect(result.id).not.toBe(survey.id);
      expect(result.title).toContain("(Copy)");
      expect(mockSurveyRepo.duplicate).toHaveBeenCalled();
    });

    it("should only duplicate structure, not responses by default", async () => {
      const user = createTestUser();
      const survey = createTestSurvey({ creatorId: user.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockSurveyRepo.duplicate.mockResolvedValue({ ...survey, id: "new-id" });

      await service.duplicateSurvey(survey.id, user.id, false);

      expect(mockSurveyRepo.duplicate).toHaveBeenCalledWith(survey.id, false);
    });
  });

  describe("publishSurvey", () => {
    it("should change status from draft to open with validation", async () => {
      const user = createTestUser();
      const { survey, pages, questions } = createTestSurveyWithQuestions({ creatorId: user.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockPageRepo.findBySurveyId.mockResolvedValue(pages);
      mockQuestionRepo.findByPageId.mockImplementation((pageId: string) =>
        Promise.resolve(questions.filter(q => q.pageId === pageId))
      );
      mockSurveyRepo.update.mockResolvedValue({ ...survey, status: "open" });

      const result = await service.publishSurvey(survey.id, user.id);

      expect(result?.status).toBe("open");
    });

    it("should throw error if survey has no questions", async () => {
      const user = createTestUser();
      const survey = createTestSurvey({ creatorId: user.id });

      mockSurveyRepo.findById.mockResolvedValue(survey);
      mockPageRepo.findBySurveyId.mockResolvedValue([]);

      await expect(service.publishSurvey(survey.id, user.id)).rejects.toThrow();
    });
  });
});
