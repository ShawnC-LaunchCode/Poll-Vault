import { TemplateRepository } from "../repositories/TemplateRepository";
import { db } from "../db";
import { surveys, surveyPages, questions, loopGroupSubquestions } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { SurveyTemplate } from "@shared/schema";

export class TemplateService {
  repo = new TemplateRepository();

  /**
   * Create a template from an existing survey
   * Serializes the full survey structure (pages, questions, subquestions)
   */
  async createFromSurvey(
    surveyId: string,
    creatorId: string,
    name: string,
    description?: string,
    tags: string[] = []
  ): Promise<SurveyTemplate> {
    // Get survey and verify ownership
    const [survey] = await db
      .select()
      .from(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.creatorId, creatorId)))
      .limit(1);

    if (!survey) {
      throw new Error("Survey not found or access denied");
    }

    // Get all pages
    const pages = await db
      .select()
      .from(surveyPages)
      .where(eq(surveyPages.surveyId, surveyId))
      .orderBy(surveyPages.order);

    // Get all questions for all pages
    const pagesWithQuestions = await Promise.all(
      pages.map(async (page: any) => {
        const pageQuestions = await db
          .select()
          .from(questions)
          .where(eq(questions.pageId, page.id))
          .orderBy(questions.order);

        // Get subquestions for any loop group questions
        const questionsWithSubquestions = await Promise.all(
          pageQuestions.map(async (question: any) => {
            if (question.type === "loop_group") {
              const subqs = await db
                .select()
                .from(loopGroupSubquestions)
                .where(eq(loopGroupSubquestions.loopQuestionId, question.id))
                .orderBy(loopGroupSubquestions.order);

              return {
                ...question,
                subquestions: subqs,
              };
            }
            return question;
          })
        );

        return {
          ...page,
          questions: questionsWithSubquestions,
        };
      })
    );

    // Build template content
    const content = {
      survey: {
        title: survey.title,
        description: survey.description,
      },
      pages: pagesWithQuestions,
    };

    // Create template
    return await this.repo.create(name, content, creatorId, description, false, tags);
  }

  /**
   * List all templates accessible to a user (their own + system templates)
   */
  async listAll(creatorId: string): Promise<SurveyTemplate[]> {
    return await this.repo.findAllAccessible(creatorId);
  }

  /**
   * List only user's own templates
   */
  async listUserTemplates(creatorId: string): Promise<SurveyTemplate[]> {
    return await this.repo.findAllByCreator(creatorId);
  }

  /**
   * List only system templates
   */
  async listSystemTemplates(): Promise<SurveyTemplate[]> {
    return await this.repo.findSystemTemplates();
  }

  /**
   * Get a template by ID
   */
  async getById(id: string): Promise<SurveyTemplate | undefined> {
    return await this.repo.findById(id);
  }

  /**
   * Update a template
   */
  async update(
    id: string,
    creatorId: string,
    patch: { name?: string; description?: string; content?: any; tags?: string[] }
  ): Promise<SurveyTemplate | undefined> {
    return await this.repo.update(id, creatorId, patch);
  }

  /**
   * Delete a template
   */
  async delete(id: string, creatorId: string): Promise<boolean> {
    return await this.repo.delete(id, creatorId);
  }
}

export const templateService = new TemplateService();
