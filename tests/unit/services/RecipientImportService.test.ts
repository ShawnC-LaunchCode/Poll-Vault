import { describe, it, expect, beforeEach, vi } from "vitest";
import { RecipientImportService } from "../../../server/services/RecipientImportService";

describe("RecipientImportService", () => {
  let service: RecipientImportService;
  let mockRecipientRepo: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock repository
    mockRecipientRepo = {
      upsertManyGlobal: vi.fn(),
    };

    // Create service with mocked dependencies
    service = new RecipientImportService(mockRecipientRepo);
  });

  describe("importFromCsv", () => {
    it("should parse CSV and normalize tags", async () => {
      const csv = `name,email,tags
Jane Doe,jane@example.com,"beta,customer"
John Smith,john@company.com,internal`;

      mockRecipientRepo.upsertManyGlobal.mockImplementation(
        async (_creatorId: string, rows: any[]) => {
          expect(rows[0].email).toBe("jane@example.com");
          expect(rows[0].tags).toEqual(["beta", "customer"]);
          expect(rows[1].email).toBe("john@company.com");
          expect(rows[1].tags).toEqual(["internal"]);
          return { imported: 2, updated: 0, skipped: 0 };
        }
      );

      const summary = await service.importFromCsv("creator-1", csv);

      expect(summary.imported).toBe(2);
      expect(summary.updated).toBe(0);
      expect(summary.skipped).toBe(0);
      expect(mockRecipientRepo.upsertManyGlobal).toHaveBeenCalledTimes(1);
    });

    it("should handle duplicate tags and normalize them", async () => {
      const csv = `name,email,tags
Test User,test@example.com,"beta,beta,customer"`;

      mockRecipientRepo.upsertManyGlobal.mockImplementation(
        async (_creatorId: string, rows: any[]) => {
          // Duplicate "beta" should be deduplicated
          expect(rows[0].tags).toEqual(["beta", "customer"]);
          return { imported: 1, updated: 0, skipped: 0 };
        }
      );

      const summary = await service.importFromCsv("creator-1", csv);

      expect(summary.imported).toBe(1);
    });

    it("should handle missing email and report errors", async () => {
      const csv = `name,email,tags
Jane Doe,jane@example.com,beta
John Smith,john@example.com,internal
Missing Email,,customer`;

      mockRecipientRepo.upsertManyGlobal.mockImplementation(
        async (_creatorId: string, rows: any[]) => {
          // Only rows with valid emails should be processed
          expect(rows.length).toBe(2);
          expect(rows[0].email).toBe("jane@example.com");
          expect(rows[1].email).toBe("john@example.com");
          return { imported: 2, updated: 0, skipped: 0 };
        }
      );

      const summary = await service.importFromCsv("creator-1", csv);

      expect(summary.imported).toBe(2);
      expect(summary.errors.length).toBeGreaterThanOrEqual(1);
      expect(summary.errors[0].message).toContain("Missing email");
    });

    it("should handle empty tags correctly", async () => {
      const csv = `name,email,tags
Jane Doe,jane@example.com,
John Smith,john@company.com,`;

      mockRecipientRepo.upsertManyGlobal.mockImplementation(
        async (_creatorId: string, rows: any[]) => {
          expect(rows[0].tags).toBe(null);
          expect(rows[1].tags).toBe(null);
          return { imported: 2, updated: 0, skipped: 0 };
        }
      );

      const summary = await service.importFromCsv("creator-1", csv);

      expect(summary.imported).toBe(2);
    });

    it("should trim whitespace from names, emails, and tags", async () => {
      const csv = `name,email,tags
  Jane Doe  , jane@example.com  ," beta , customer "`;

      mockRecipientRepo.upsertManyGlobal.mockImplementation(
        async (_creatorId: string, rows: any[]) => {
          expect(rows[0].name).toBe("Jane Doe");
          expect(rows[0].email).toBe("jane@example.com");
          expect(rows[0].tags).toEqual(["beta", "customer"]);
          return { imported: 1, updated: 0, skipped: 0 };
        }
      );

      const summary = await service.importFromCsv("creator-1", csv);

      expect(summary.imported).toBe(1);
    });
  });

  describe("csvTemplate", () => {
    it("should return a valid CSV template", () => {
      const template = RecipientImportService.csvTemplate();

      expect(template).toContain("name,email,tags");
      expect(template).toContain("Jane Doe");
      expect(template).toContain("jane@example.com");
    });
  });
});
