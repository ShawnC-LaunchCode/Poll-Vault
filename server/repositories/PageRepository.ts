import { BaseRepository, type DbTransaction } from "./BaseRepository";
import { surveyPages, type SurveyPage, type InsertSurveyPage } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Repository for survey page-related database operations
 * Handles page CRUD and reordering
 */
export class PageRepository extends BaseRepository<typeof surveyPages, SurveyPage, InsertSurveyPage> {
  constructor() {
    super(surveyPages);
  }

  /**
   * Find pages by survey ID (ordered)
   */
  async findBySurvey(surveyId: string, tx?: DbTransaction): Promise<SurveyPage[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(surveyPages)
      .where(eq(surveyPages.surveyId, surveyId))
      .orderBy(surveyPages.order);
  }

  /**
   * Bulk reorder pages
   */
  async bulkReorder(
    surveyId: string,
    pageOrders: Array<{ id: string; order: number }>,
    tx?: DbTransaction
  ): Promise<SurveyPage[]> {
    return await this.transaction(async (innerTx) => {
      const reorderedPages: SurveyPage[] = [];

      for (const { id, order } of pageOrders) {
        const [updatedPage] = await innerTx
          .update(surveyPages)
          .set({ order })
          .where(and(eq(surveyPages.id, id), eq(surveyPages.surveyId, surveyId)))
          .returning();

        if (updatedPage) {
          reorderedPages.push(updatedPage);
        }
      }

      return reorderedPages;
    });
  }
}

export const pageRepository = new PageRepository();
