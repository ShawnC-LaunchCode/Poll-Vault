import { parseString } from "fast-csv";
import { RecipientRepository } from "../repositories/RecipientRepository";
import type { CsvRecipientRow, ImportSummary } from "../types/recipients";

export class RecipientImportService {
  constructor(private recipientsRepo = new RecipientRepository()) {}

  private parseCsv(csv: string): Promise<{ rows: CsvRecipientRow[]; errors: ImportSummary["errors"] }> {
    return new Promise((resolve) => {
      const rows: CsvRecipientRow[] = [];
      const errors: ImportSummary["errors"] = [];
      let lineNo = 0;

      parseString<CsvRecipientRow, CsvRecipientRow>(csv, {
        headers: true,
        ignoreEmpty: true,
        trim: true,
      })
        .on("data", (row) => {
          lineNo++;
          const email = (row.email || "").trim().toLowerCase();
          if (!email) {
            errors.push({ line: lineNo, message: "Missing email" });
            return;
          }
          rows.push({
            name: (row.name || "").trim(),
            email,
            tags: (row.tags || "").trim(),
          });
        })
        .on("end", () => resolve({ rows, errors }));
    });
  }

  async importFromCsv(creatorId: string, csvContent: string): Promise<ImportSummary> {
    const { rows, errors } = await this.parseCsv(csvContent);

    const norm = rows.map((r) => ({
      name: r.name || null,
      email: r.email,
      tags: r.tags
        ? Array.from(new Set(r.tags.split(",").map((s) => s.trim()).filter(Boolean)))
        : null,
    }));

    const summary = await this.recipientsRepo.upsertManyGlobal(creatorId, norm);
    return { ...summary, errors };
  }

  static csvTemplate(): string {
    return "name,email,tags\nJane Doe,jane@example.com,beta,customer\nJohn Smith,john@company.com,internal\n";
  }
}
