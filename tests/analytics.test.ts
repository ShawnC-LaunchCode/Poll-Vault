import { describe, it, expect } from "vitest";
import { createTestSurvey, insertResponses, createEmptySurvey } from "./factories/testHelpers";
import { testSqlite } from "./setup/setup";
import { randomUUID } from "crypto";

/**
 * Analytics Reliability Testing Suite
 * Validates data integrity from submission → storage → aggregation
 */
describe("Analytics Data Integrity", () => {
  describe("Data Persistence", () => {
    it("should persist all submitted answers correctly", () => {
      // Create survey with questions
      const survey = createTestSurvey();

      // Insert 3 responses
      const responseIds = insertResponses(survey, 3);

      // Verify all responses exist
      expect(responseIds).toHaveLength(3);

      for (const responseId of responseIds) {
        const responseAnswers = testSqlite.prepare(`
          SELECT * FROM answers WHERE response_id = ?
        `).all(responseId);

        // Each response should have 5 answers (one per question)
        expect(responseAnswers).toHaveLength(5);
      }
    });

    it("should correctly store yes/no answer values", () => {
      const survey = createTestSurvey();
      insertResponses(survey, 2);

      const yesNoAnswers = testSqlite.prepare(`
        SELECT * FROM answers WHERE question_id = ?
      `).all(survey.questions.yesNo.id);

      expect(yesNoAnswers).toHaveLength(2);

      // Verify values are stored as JSON
      const values = yesNoAnswers.map((a: any) => JSON.parse(a.value));
      expect(values).toContain(true);
      expect(values).toContain(false);
    });

    it("should correctly store multiple choice answer values", () => {
      const survey = createTestSurvey();
      insertResponses(survey, 3);

      const mcAnswers = testSqlite.prepare(`
        SELECT * FROM answers WHERE question_id = ?
      `).all(survey.questions.multipleChoice.id);

      expect(mcAnswers).toHaveLength(3);

      const values = mcAnswers.map((a: any) => JSON.parse(a.value));
      expect(values).toContain("Blue");
      expect(values).toContain("Red");
    });

    it("should correctly store text answer values", () => {
      const survey = createTestSurvey();
      insertResponses(survey, 2);

      const textAnswers = testSqlite.prepare(`
        SELECT * FROM answers WHERE question_id = ?
      `).all(survey.questions.shortText.id);

      expect(textAnswers).toHaveLength(2);

      const values = textAnswers.map((a: any) => JSON.parse(a.value));
      expect(values.every((v: any) => typeof v === "string")).toBe(true);
    });
  });

  describe("Analytics Aggregation - Yes/No Questions", () => {
    it("should aggregate yes/no responses correctly", () => {
      const survey = createTestSurvey();
      insertResponses(survey, 5); // Will have 3 yes, 2 no based on our factory

      // Query answers
      const yesNoAnswers = testSqlite.prepare(`
        SELECT * FROM answers WHERE question_id = ?
      `).all(survey.questions.yesNo.id);

      // Manually aggregate (mimicking AnalyticsRepository logic)
      const aggregation = { yes: 0, no: 0 };
      for (const answer of yesNoAnswers) {
        const value = JSON.parse((answer as any).value);
        if (value === true || value === "true" || value === "Yes") {
          aggregation.yes++;
        } else {
          aggregation.no++;
        }
      }

      expect(aggregation.yes).toBe(3);
      expect(aggregation.no).toBe(2);
      expect(aggregation.yes + aggregation.no).toBe(5);
    });

    it("should handle boolean values stored in different formats", () => {
      const survey = createTestSurvey();
      const responseId = insertResponses(survey, 1)[0];
      const now = new Date().toISOString();

      // Manually insert answers with different boolean formats
      const insertAnswer = testSqlite.prepare(`
        INSERT INTO answers (id, response_id, question_id, value, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      insertAnswer.run("test-1", responseId, survey.questions.yesNo.id, JSON.stringify(true), now);
      insertAnswer.run("test-2", responseId, survey.questions.yesNo.id, JSON.stringify("Yes"), now);
      insertAnswer.run("test-3", responseId, survey.questions.yesNo.id, JSON.stringify("true"), now);

      const allAnswers = testSqlite.prepare(`
        SELECT * FROM answers WHERE question_id = ?
      `).all(survey.questions.yesNo.id);

      // Aggregate with robust parsing
      let yesCount = 0;
      for (const answer of allAnswers) {
        const value = JSON.parse((answer as any).value);
        if (value === true || value === "true" || value === "Yes" || value === "yes") {
          yesCount++;
        }
      }

      expect(yesCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Analytics Aggregation - Multiple Choice Questions", () => {
    it("should aggregate multiple choice options correctly", () => {
      const survey = createTestSurvey();
      insertResponses(survey, 5);

      const mcAnswers = testSqlite.prepare(`
        SELECT * FROM answers WHERE question_id = ?
      `).all(survey.questions.multipleChoice.id);

      // Aggregate options
      const optionCounts: Record<string, number> = {};
      for (const answer of mcAnswers) {
        const value = JSON.parse((answer as any).value);
        const option = String(value);
        optionCounts[option] = (optionCounts[option] || 0) + 1;
      }

      // Verify counts
      expect(Object.keys(optionCounts).length).toBeGreaterThan(0);
      expect(optionCounts["Blue"]).toBe(2); // Based on our factory pattern
      expect(optionCounts["Red"]).toBe(1);

      // Verify total
      const totalResponses = Object.values(optionCounts).reduce((sum, count) => sum + count, 0);
      expect(totalResponses).toBe(5);
    });

    it("should calculate percentages correctly", () => {
      const survey = createTestSurvey();
      insertResponses(survey, 4);

      const mcAnswers = testSqlite.prepare(`
        SELECT * FROM answers WHERE question_id = ?
      `).all(survey.questions.multipleChoice.id);

      const optionCounts: Record<string, number> = {};
      for (const answer of mcAnswers) {
        const value = JSON.parse((answer as any).value);
        optionCounts[String(value)] = (optionCounts[String(value)] || 0) + 1;
      }

      const total = Object.values(optionCounts).reduce((sum, count) => sum + count, 0);

      // Calculate percentages
      const optionsWithPercentages = Object.entries(optionCounts).map(([option, count]) => ({
        option,
        count,
        percent: Math.round((count / total) * 100),
      }));

      // Verify percentages add up to ~100%
      const totalPercent = optionsWithPercentages.reduce((sum, opt) => sum + opt.percent, 0);
      expect(totalPercent).toBeGreaterThanOrEqual(98); // Allow for rounding
      expect(totalPercent).toBeLessThanOrEqual(100);
    });
  });

  describe("Analytics Aggregation - Text Questions", () => {
    it("should extract keywords from text answers", () => {
      const survey = createTestSurvey();
      insertResponses(survey, 5);

      const textAnswers = testSqlite.prepare(`
        SELECT * FROM answers WHERE question_id = ?
      `).all(survey.questions.shortText.id);

      expect(textAnswers.length).toBe(5);

      // Extract keywords (simple word frequency analysis)
      const wordCounts: Record<string, number> = {};
      for (const answer of textAnswers) {
        const value = JSON.parse((answer as any).value);
        const words = String(value).toLowerCase().split(/\s+/);

        for (const word of words) {
          // Skip short words
          if (word.length > 2) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
          }
        }
      }

      // Verify common keywords exist
      const topKeywords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);

      expect(topKeywords.length).toBeGreaterThan(0);
      expect(topKeywords.some(word => ["creative", "data", "thinker", "enthusiast"].includes(word))).toBe(true);
    });

    it("should handle empty text responses", () => {
      const survey = createTestSurvey();
      const responseId = insertResponses(survey, 1)[0];
      const now = new Date().toISOString();

      // Add empty text answer
      testSqlite.prepare(`
        INSERT INTO answers (id, response_id, question_id, value, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run("empty-text", responseId, survey.questions.longText.id, JSON.stringify(""), now);

      const textAnswers = testSqlite.prepare(`
        SELECT * FROM answers WHERE question_id = ?
      `).all(survey.questions.longText.id);

      // Should handle empty values gracefully
      const nonEmptyAnswers = textAnswers.filter((a: any) => {
        const value = JSON.parse(a.value);
        return String(value).trim().length > 0;
      });

      expect(textAnswers.length).toBeGreaterThan(nonEmptyAnswers.length);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty surveys gracefully", () => {
      const emptySurvey = createEmptySurvey();

      // Query responses
      const surveyResponses = testSqlite.prepare(`
        SELECT * FROM responses WHERE survey_id = ?
      `).all(emptySurvey.surveyId);

      expect(surveyResponses).toHaveLength(0);

      // Query answers for the question
      const questionAnswers = testSqlite.prepare(`
        SELECT * FROM answers WHERE question_id = ?
      `).all(emptySurvey.questionId);

      expect(questionAnswers).toHaveLength(0);
    });

    it("should handle surveys with no completed responses", () => {
      const survey = createTestSurvey();
      const now = new Date().toISOString();

      // Create incomplete response
      const responseId = "incomplete-response";
      testSqlite.prepare(`
        INSERT INTO responses (id, survey_id, completed, is_anonymous, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(responseId, survey.surveyId, 0, 0, now);

      // Query completed responses only
      const completedResponses = testSqlite.prepare(`
        SELECT * FROM responses WHERE survey_id = ? AND completed = 1
      `).all(survey.surveyId);

      expect(completedResponses).toHaveLength(0);
    });

    it("should handle missing answers for optional questions", () => {
      const survey = createTestSurvey();
      const responseId = insertResponses(survey, 1)[0];

      // Remove answer for optional question
      testSqlite.prepare(`
        DELETE FROM answers WHERE response_id = ? AND question_id = ?
      `).run(responseId, survey.questions.shortText.id);

      // Verify answer was removed
      const remainingAnswers = testSqlite.prepare(`
        SELECT * FROM answers WHERE response_id = ?
      `).all(responseId);

      expect(remainingAnswers).toHaveLength(4); // 5 - 1 removed
    });

    it("should maintain data consistency across related tables", () => {
      const survey = createTestSurvey();
      insertResponses(survey, 3);

      // Verify referential integrity
      const allAnswers = testSqlite.prepare(`SELECT * FROM answers`).all();

      for (const answer of allAnswers) {
        const ans = answer as any;

        // Verify response exists
        const response = testSqlite.prepare(`
          SELECT * FROM responses WHERE id = ?
        `).get(ans.response_id);

        expect(response).toBeDefined();

        // Verify question exists
        const question = testSqlite.prepare(`
          SELECT * FROM questions WHERE id = ?
        `).get(ans.question_id);

        expect(question).toBeDefined();
      }
    });
  });

  describe("Performance & Scalability", () => {
    it("should handle large response volumes efficiently", () => {
      const survey = createTestSurvey();

      const startTime = Date.now();

      // Insert 100 responses
      insertResponses(survey, 100);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 2 seconds)
      expect(duration).toBeLessThan(2000);

      // Verify all were inserted
      const allResponses = testSqlite.prepare(`
        SELECT * FROM responses WHERE survey_id = ?
      `).all(survey.surveyId);

      expect(allResponses).toHaveLength(100);
    });

    it("should aggregate large datasets correctly", () => {
      const survey = createTestSurvey();
      insertResponses(survey, 50);

      const startTime = Date.now();

      // Aggregate multiple choice answers
      const mcAnswers = testSqlite.prepare(`
        SELECT * FROM answers WHERE question_id = ?
      `).all(survey.questions.multipleChoice.id);

      const optionCounts: Record<string, number> = {};
      for (const answer of mcAnswers) {
        const value = JSON.parse((answer as any).value);
        optionCounts[String(value)] = (optionCounts[String(value)] || 0) + 1;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Aggregation should be fast
      expect(duration).toBeLessThan(500);

      // Verify total
      const total = Object.values(optionCounts).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(50);
    });
  });
});
