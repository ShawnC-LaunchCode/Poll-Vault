import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../googleAuth";
import { insertQuestionSchema, insertLoopGroupSubquestionSchema, insertConditionalRuleSchema } from "@shared/schema";

/**
 * Register question-related routes
 * Handles questions, subquestions (loop groups), and conditional logic rules
 */
export function registerQuestionRoutes(app: Express): void {

  // ============================================================================
  // Questions Routes
  // ============================================================================

  /**
   * POST /api/pages/:pageId/questions
   * Create a new question for a page
   */
  app.post('/api/pages/:pageId/questions', isAuthenticated, async (req: any, res) => {
    try {
      const page = await storage.getSurveyPage(req.params.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      const survey = await storage.getSurvey(page.surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const questionData = insertQuestionSchema.parse({ ...req.body, pageId: req.params.pageId });
      const question = await storage.createQuestion(questionData);
      res.json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  /**
   * GET /api/pages/:pageId/questions
   * Get all questions for a page (includes subquestions for loop groups)
   */
  app.get('/api/pages/:pageId/questions', isAuthenticated, async (req: any, res) => {
    try {
      const page = await storage.getSurveyPage(req.params.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      const survey = await storage.getSurvey(page.surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const questions = await storage.getQuestionsWithSubquestionsByPage(req.params.pageId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  /**
   * PUT /api/questions/:id
   * Update a question
   */
  app.put('/api/questions/:id', isAuthenticated, async (req: any, res) => {
    try {
      console.log('[Question Update] Request received for question:', req.params.id);
      console.log('[Question Update] Request body:', JSON.stringify(req.body, null, 2));

      const question = await storage.getQuestion(req.params.id);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      console.log('[Question Update] Current question data:', {
        id: question.id,
        title: question.title,
        description: question.description,
        type: question.type
      });

      const page = await storage.getSurveyPage(question.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      const survey = await storage.getSurvey(page.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = insertQuestionSchema.partial().parse(req.body);
      console.log('[Question Update] Parsed updates:', JSON.stringify(updates, null, 2));

      const updatedQuestion = await storage.updateQuestion(req.params.id, updates);

      console.log('[Question Update] Updated question data:', {
        id: updatedQuestion.id,
        title: updatedQuestion.title,
        description: updatedQuestion.description,
        type: updatedQuestion.type
      });

      res.json(updatedQuestion);
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  /**
   * DELETE /api/questions/:id
   * Delete a question
   */
  app.delete('/api/questions/:id', isAuthenticated, async (req: any, res) => {
    try {
      console.log('[DELETE Question] Attempting to delete question:', req.params.id);

      const question = await storage.getQuestion(req.params.id);
      if (!question) {
        console.log('[DELETE Question] Question not found:', req.params.id);
        return res.status(404).json({ message: "Question not found" });
      }

      console.log('[DELETE Question] Found question:', {
        id: question.id,
        title: question.title,
        pageId: question.pageId,
        type: question.type
      });

      const page = await storage.getSurveyPage(question.pageId);
      if (!page) {
        console.log('[DELETE Question] Page not found:', question.pageId);
        return res.status(404).json({ message: "Page not found" });
      }

      const survey = await storage.getSurvey(page.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        console.log('[DELETE Question] Access denied. Survey creator:', survey?.creatorId, 'User:', req.user.claims.sub);
        return res.status(403).json({ message: "Access denied" });
      }

      console.log('[DELETE Question] Authorization passed. Deleting question...');
      await storage.deleteQuestion(req.params.id);
      console.log('[DELETE Question] Question deleted successfully');

      res.json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("[DELETE Question] Error deleting question:", error);
      console.error("[DELETE Question] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      console.error("[DELETE Question] Error details:", {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        detail: (error as any)?.detail,
        constraint: (error as any)?.constraint
      });

      res.status(500).json({
        message: "Failed to delete question",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * PUT /api/surveys/:surveyId/questions/reorder
   * Bulk reorder questions across pages
   */
  app.put('/api/surveys/:surveyId/questions/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { questions } = req.body;
      if (!questions || !Array.isArray(questions)) {
        return res.status(400).json({ message: "Invalid request: questions array is required" });
      }

      // Validate questions data
      for (const question of questions) {
        if (!question.id || !question.pageId || typeof question.order !== 'number') {
          return res.status(400).json({ message: "Invalid question data: id, pageId, and order are required" });
        }
      }

      const reorderedQuestions = await storage.bulkReorderQuestions(req.params.surveyId, questions);
      res.json(reorderedQuestions);
    } catch (error) {
      console.error("Error reordering questions:", error);
      res.status(500).json({ message: "Failed to reorder questions" });
    }
  });

  // ============================================================================
  // Loop Group Subquestions Routes
  // ============================================================================

  /**
   * POST /api/questions/:questionId/subquestions
   * Create a new subquestion for a loop group question
   */
  app.post('/api/questions/:questionId/subquestions', isAuthenticated, async (req: any, res) => {
    try {
      const question = await storage.getQuestion(req.params.questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const page = await storage.getSurveyPage(question.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      const survey = await storage.getSurvey(page.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (question.type !== 'loop_group') {
        return res.status(400).json({ message: "Question is not a loop group" });
      }

      const subquestionData = insertLoopGroupSubquestionSchema.parse({
        ...req.body,
        loopQuestionId: req.params.questionId
      });
      const subquestion = await storage.createLoopGroupSubquestion(subquestionData);
      res.json(subquestion);
    } catch (error) {
      console.error("Error creating subquestion:", error);
      res.status(500).json({ message: "Failed to create subquestion" });
    }
  });

  /**
   * GET /api/questions/:questionId/subquestions
   * Get all subquestions for a loop group question
   */
  app.get('/api/questions/:questionId/subquestions', isAuthenticated, async (req: any, res) => {
    try {
      const question = await storage.getQuestion(req.params.questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const page = await storage.getSurveyPage(question.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      const survey = await storage.getSurvey(page.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subquestions = await storage.getLoopGroupSubquestions(req.params.questionId);
      res.json(subquestions);
    } catch (error) {
      console.error("Error fetching subquestions:", error);
      res.status(500).json({ message: "Failed to fetch subquestions" });
    }
  });

  /**
   * PUT /api/subquestions/:id
   * Update a subquestion
   */
  app.put('/api/subquestions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const subquestion = await storage.getLoopGroupSubquestion(req.params.id);
      if (!subquestion) {
        return res.status(404).json({ message: "Subquestion not found" });
      }

      const question = await storage.getQuestion(subquestion.loopQuestionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const page = await storage.getSurveyPage(question.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      const survey = await storage.getSurvey(page.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = insertLoopGroupSubquestionSchema.partial().parse(req.body);
      const updatedSubquestion = await storage.updateLoopGroupSubquestion(req.params.id, updates);
      res.json(updatedSubquestion);
    } catch (error) {
      console.error("Error updating subquestion:", error);
      res.status(500).json({ message: "Failed to update subquestion" });
    }
  });

  /**
   * DELETE /api/subquestions/:id
   * Delete a subquestion
   */
  app.delete('/api/subquestions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const subquestion = await storage.getLoopGroupSubquestion(req.params.id);
      if (!subquestion) {
        return res.status(404).json({ message: "Subquestion not found" });
      }

      const question = await storage.getQuestion(subquestion.loopQuestionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const page = await storage.getSurveyPage(question.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      const survey = await storage.getSurvey(page.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteLoopGroupSubquestion(req.params.id);
      res.json({ message: "Subquestion deleted successfully" });
    } catch (error) {
      console.error("Error deleting subquestion:", error);
      res.status(500).json({ message: "Failed to delete subquestion" });
    }
  });

  // ============================================================================
  // Conditional Rules Routes
  // ============================================================================

  /**
   * POST /api/surveys/:surveyId/conditional-rules
   * Create a new conditional rule for a survey
   */
  app.post('/api/surveys/:surveyId/conditional-rules', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const ruleData = insertConditionalRuleSchema.parse({ ...req.body, surveyId: req.params.surveyId });
      const rule = await storage.createConditionalRule(ruleData);
      res.json(rule);
    } catch (error) {
      console.error("Error creating conditional rule:", error);
      res.status(500).json({ message: "Failed to create conditional rule" });
    }
  });

  /**
   * GET /api/surveys/:surveyId/conditional-rules
   * Get all conditional rules for a survey
   */
  app.get('/api/surveys/:surveyId/conditional-rules', isAuthenticated, async (req: any, res) => {
    try {
      const survey = await storage.getSurvey(req.params.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const rules = await storage.getConditionalRulesBySurvey(req.params.surveyId);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching conditional rules:", error);
      res.status(500).json({ message: "Failed to fetch conditional rules" });
    }
  });

  /**
   * GET /api/questions/:questionId/conditional-rules
   * Get all conditional rules for a specific question
   */
  app.get('/api/questions/:questionId/conditional-rules', isAuthenticated, async (req: any, res) => {
    try {
      const question = await storage.getQuestion(req.params.questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const page = await storage.getSurveyPage(question.pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      const survey = await storage.getSurvey(page.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const rules = await storage.getConditionalRulesByQuestion(req.params.questionId);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching conditional rules:", error);
      res.status(500).json({ message: "Failed to fetch conditional rules" });
    }
  });

  /**
   * PUT /api/conditional-rules/:id
   * Update a conditional rule
   */
  app.put('/api/conditional-rules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const rule = await storage.getConditionalRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ message: "Conditional rule not found" });
      }

      const survey = await storage.getSurvey(rule.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = insertConditionalRuleSchema.partial().parse(req.body);
      const updatedRule = await storage.updateConditionalRule(req.params.id, updates);
      res.json(updatedRule);
    } catch (error) {
      console.error("Error updating conditional rule:", error);
      res.status(500).json({ message: "Failed to update conditional rule" });
    }
  });

  /**
   * DELETE /api/conditional-rules/:id
   * Delete a conditional rule
   */
  app.delete('/api/conditional-rules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const rule = await storage.getConditionalRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ message: "Conditional rule not found" });
      }

      const survey = await storage.getSurvey(rule.surveyId);
      if (!survey || survey.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteConditionalRule(req.params.id);
      res.json({ message: "Conditional rule deleted successfully" });
    } catch (error) {
      console.error("Error deleting conditional rule:", error);
      res.status(500).json({ message: "Failed to delete conditional rule" });
    }
  });
}
