import { BaseRepository, type DbTransaction } from "./BaseRepository";
import {
  questions,
  loopGroupSubquestions,
  conditionalRules,
  surveyPages,
  type Question,
  type InsertQuestion,
  type LoopGroupSubquestion,
  type InsertLoopGroupSubquestion,
  type ConditionalRule,
  type InsertConditionalRule,
  type QuestionWithSubquestions,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Repository for question-related database operations
 * Handles questions, subquestions, conditional rules, and reordering
 */
export class QuestionRepository extends BaseRepository<typeof questions, Question, InsertQuestion> {
  constructor() {
    super(questions);
  }

  /**
   * Find questions by page ID (ordered)
   */
  async findByPage(pageId: string, tx?: DbTransaction): Promise<Question[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(questions)
      .where(eq(questions.pageId, pageId))
      .orderBy(questions.order);
  }

  /**
   * Find questions with subquestions by page ID
   */
  async findByPageWithSubquestions(
    pageId: string,
    tx?: DbTransaction
  ): Promise<QuestionWithSubquestions[]> {
    const questionsData = await this.findByPage(pageId, tx);
    const result: QuestionWithSubquestions[] = [];

    for (const question of questionsData) {
      if (question.type === 'loop_group') {
        const subquestions = await this.findSubquestionsByLoopId(question.id, tx);
        result.push({ ...question, subquestions });
      } else {
        result.push(question);
      }
    }

    return result;
  }

  /**
   * Bulk reorder questions (including cross-page moves)
   */
  async bulkReorder(
    surveyId: string,
    questionOrders: Array<{ id: string; pageId: string; order: number }>,
    tx?: DbTransaction
  ): Promise<Question[]> {
    return await this.transaction(async (innerTx) => {
      const reorderedQuestions: Question[] = [];

      for (const { id, pageId, order } of questionOrders) {
        // Verify the question belongs to a page in this survey
        const [page] = await innerTx
          .select()
          .from(surveyPages)
          .where(and(eq(surveyPages.id, pageId), eq(surveyPages.surveyId, surveyId)));

        if (!page) {
          throw new Error(`Page ${pageId} does not belong to survey ${surveyId}`);
        }

        const [updatedQuestion] = await innerTx
          .update(questions)
          .set({ pageId, order })
          .where(eq(questions.id, id))
          .returning();

        if (updatedQuestion) {
          reorderedQuestions.push(updatedQuestion);
        }
      }

      return reorderedQuestions;
    });
  }

  // ==================== Subquestion Operations ====================

  /**
   * Create loop group subquestion
   */
  async createSubquestion(
    subquestion: InsertLoopGroupSubquestion,
    tx?: DbTransaction
  ): Promise<LoopGroupSubquestion> {
    const database = this.getDb(tx);
    const [newSubquestion] = await database
      .insert(loopGroupSubquestions)
      .values(subquestion as any)
      .returning();
    return newSubquestion;
  }

  /**
   * Find subquestion by ID
   */
  async findSubquestionById(
    id: string,
    tx?: DbTransaction
  ): Promise<LoopGroupSubquestion | undefined> {
    const database = this.getDb(tx);
    const [subquestion] = await database
      .select()
      .from(loopGroupSubquestions)
      .where(eq(loopGroupSubquestions.id, id));
    return subquestion;
  }

  /**
   * Find subquestions by loop question ID (ordered)
   */
  async findSubquestionsByLoopId(
    loopQuestionId: string,
    tx?: DbTransaction
  ): Promise<LoopGroupSubquestion[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(loopGroupSubquestions)
      .where(eq(loopGroupSubquestions.loopQuestionId, loopQuestionId))
      .orderBy(loopGroupSubquestions.order);
  }

  /**
   * Update subquestion
   */
  async updateSubquestion(
    id: string,
    updates: Partial<InsertLoopGroupSubquestion>,
    tx?: DbTransaction
  ): Promise<LoopGroupSubquestion> {
    const database = this.getDb(tx);
    const [updatedSubquestion] = await database
      .update(loopGroupSubquestions)
      .set(updates as any)
      .where(eq(loopGroupSubquestions.id, id))
      .returning();
    return updatedSubquestion;
  }

  /**
   * Delete subquestion
   */
  async deleteSubquestion(id: string, tx?: DbTransaction): Promise<void> {
    const database = this.getDb(tx);
    await database.delete(loopGroupSubquestions).where(eq(loopGroupSubquestions.id, id));
  }

  /**
   * Delete all subquestions for a loop question
   */
  async deleteSubquestionsByLoopId(loopQuestionId: string, tx?: DbTransaction): Promise<void> {
    const database = this.getDb(tx);
    await database
      .delete(loopGroupSubquestions)
      .where(eq(loopGroupSubquestions.loopQuestionId, loopQuestionId));
  }

  // ==================== Conditional Rules Operations ====================

  /**
   * Create conditional rule
   */
  async createConditionalRule(
    rule: InsertConditionalRule,
    tx?: DbTransaction
  ): Promise<ConditionalRule> {
    const database = this.getDb(tx);
    const [newRule] = await database
      .insert(conditionalRules)
      .values(rule as any)
      .returning();
    return newRule;
  }

  /**
   * Find conditional rule by ID
   */
  async findConditionalRuleById(
    id: string,
    tx?: DbTransaction
  ): Promise<ConditionalRule | undefined> {
    const database = this.getDb(tx);
    const [rule] = await database
      .select()
      .from(conditionalRules)
      .where(eq(conditionalRules.id, id));
    return rule;
  }

  /**
   * Find conditional rules by survey ID (ordered)
   */
  async findConditionalRulesBySurvey(
    surveyId: string,
    tx?: DbTransaction
  ): Promise<ConditionalRule[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(conditionalRules)
      .where(eq(conditionalRules.surveyId, surveyId))
      .orderBy(conditionalRules.order);
  }

  /**
   * Find conditional rules by target question ID
   */
  async findConditionalRulesByQuestion(
    questionId: string,
    tx?: DbTransaction
  ): Promise<ConditionalRule[]> {
    const database = this.getDb(tx);
    return await database
      .select()
      .from(conditionalRules)
      .where(eq(conditionalRules.targetQuestionId, questionId))
      .orderBy(conditionalRules.order);
  }

  /**
   * Update conditional rule
   */
  async updateConditionalRule(
    id: string,
    updates: Partial<InsertConditionalRule>,
    tx?: DbTransaction
  ): Promise<ConditionalRule> {
    const database = this.getDb(tx);
    const [updatedRule] = await database
      .update(conditionalRules)
      .set(updates as any)
      .where(eq(conditionalRules.id, id))
      .returning();
    return updatedRule;
  }

  /**
   * Delete conditional rule
   */
  async deleteConditionalRule(id: string, tx?: DbTransaction): Promise<void> {
    const database = this.getDb(tx);
    await database.delete(conditionalRules).where(eq(conditionalRules.id, id));
  }

  /**
   * Delete all conditional rules for a survey
   */
  async deleteConditionalRulesBySurvey(surveyId: string, tx?: DbTransaction): Promise<void> {
    const database = this.getDb(tx);
    await database.delete(conditionalRules).where(eq(conditionalRules.surveyId, surveyId));
  }
}

export const questionRepository = new QuestionRepository();
