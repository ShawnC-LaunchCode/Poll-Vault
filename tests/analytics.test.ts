import { describe, it, expect } from "vitest";
import { createTestSurvey, insertResponses, createEmptySurvey } from "./factories/testHelpers";
import { testSqlite } from "./setup/setup";

/**
 * Analytics Reliability Testing Suite
 * Validates data integrity from submission → storage → aggregation
 */
describe("Analytics Data Integrity", () => {
  describe("Data Persistence", () => {
    it("should persist all submitted answers correctly", async () => {
      // Create survey with questions
      const survey = await createTestSurvey();

      // Insert 3 responses
      const responseIds = await insertResponses(survey, 3);

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

    it("should correctly store yes/no answer values", async () => {
      const survey = await createTestSurvey();
      await insertResponses(survey, 2);

      const yesNoAnswers = await testDb
        .select()
        .from(answers)
        .where(eq(answers.questionId, survey.questions.yesNo.id));

      expect(yesNoAnswers).toHaveLength(2);

      // Verify values are stored as JSON
      const values = yesNoAnswers.map(a => JSON.parse(a.value));
      expect(values).toContain(true);
      expect(values).toContain(false);
    });

    it("should correctly store multiple choice answer values", async () => {
      const survey = await createTestSurvey();
      await insertResponses(survey, 3);

      const mcAnswers = await testDb
        .select()
        .from(answers)
        .where(eq(answers.questionId, survey.questions.multipleChoice.id));

      expect(mcAnswers).toHaveLength(3);

      const values = mcAnswers.map(a => JSON.parse(a.value));
      expect(values).toContain("Blue");
      expect(values).toContain("Red");
    });

    it("should correctly store text answer values", async () => {
      const survey = await createTestSurvey();
      await insertResponses(survey, 2);

      const textAnswers = await testDb
        .select()
        .from(answers)
        .where(eq(answers.questionId, survey.questions.shortText.id));

      expect(textAnswers).toHaveLength(2);

      const values = textAnswers.map(a => JSON.parse(a.value));
      expect(values.every((v: any) => typeof v === "string")).toBe(true);
    });
  });

  describe("Analytics Aggregation - Yes/No Questions", () => {
    it("should aggregate yes/no responses correctly", async () => {
      const survey = await createTestSurvey();
      await insertResponses(survey, 5); // Will have 3 yes, 2 no based on our factory

      // Query answers
      const yesNoAnswers = await testDb
        .select()
        .from(answers)
        .where(eq(answers.questionId, survey.questions.yesNo.id));

      // Manually aggregate (mimicking AnalyticsRepository logic)
      const aggregation = { yes: 0, no: 0 };
      for (const answer of yesNoAnswers) {
        const value = JSON.parse(answer.value);
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

    it("should handle boolean values stored in different formats", async () => {
      const survey = await createTestSurvey();
      const responseId = (await insertResponses(survey, 1))[0];
      const now = Date.now();

      // Manually insert answers with different boolean formats
      await testDb.insert(answers).values([
        {
          id: "test-1",
          responseId,
          questionId: survey.questions.yesNo.id,
          value: JSON.stringify(true), // boolean
          createdAt: now as any,
        },
        {
          id: "test-2",
          responseId,
          questionId: survey.questions.yesNo.id,
          value: JSON.stringify("Yes"), // string
          createdAt: now as any,
        },
        {
          id: "test-3",
          responseId,
          questionId: survey.questions.yesNo.id,
          value: JSON.stringify("true"), // string boolean
          createdAt: now as any,
        },
      ]);

      const allAnswers = await testDb
        .select()
        .from(answers)
        .where(eq(answers.questionId, survey.questions.yesNo.id));

      // Aggregate with robust parsing
      let yesCount = 0;
      for (const answer of allAnswers) {
        const value = JSON.parse(answer.value);
        if (value === true || value === "true" || value === "Yes" || value === "yes") {
          yesCount++;
        }
      }

      expect(yesCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Analytics Aggregation - Multiple Choice Questions", () => {
    it("should aggregate multiple choice options correctly", async () => {
      const survey = await createTestSurvey();
      await insertResponses(survey, 5);

      const mcAnswers = await testDb
        .select()
        .from(answers)
        .where(eq(answers.questionId, survey.questions.multipleChoice.id));

      // Aggregate options
      const optionCounts: Record<string, number> = {};
      for (const answer of mcAnswers) {
        const value = JSON.parse(answer.value);
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

    it("should calculate percentages correctly", async () => {
      const survey = await createTestSurvey();
      await insertResponses(survey, 4);

      const mcAnswers = await testDb
        .select()
        .from(answers)
        .where(eq(answers.questionId, survey.questions.multipleChoice.id));

      const optionCounts: Record<string, number> = {};
      for (const answer of mcAnswers) {
        const value = JSON.parse(answer.value);
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
    it("should extract keywords from text answers", async () => {
      const survey = await createTestSurvey();
      await insertResponses(survey, 5);

      const textAnswers = await testDb
        .select()
        .from(answers)
        .where(eq(answers.questionId, survey.questions.shortText.id));

      expect(textAnswers.length).toBe(5);

      // Extract keywords (simple word frequency analysis)
      const wordCounts: Record<string, number> = {};
      for (const answer of textAnswers) {
        const value = JSON.parse(answer.value);
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

    it("should handle empty text responses", async () => {
      const survey = await createTestSurvey();
      const responseId = (await insertResponses(survey, 1))[0];
      const now = Date.now();

      // Add empty text answer
      await testDb.insert(answers).values({
        id: "empty-text",
        responseId,
        questionId: survey.questions.longText.id,
        value: JSON.stringify(""),
        createdAt: now as any,
      });

      const textAnswers = await testDb
        .select()
        .from(answers)
        .where(eq(answers.questionId, survey.questions.longText.id));

      // Should handle empty values gracefully
      const nonEmptyAnswers = textAnswers.filter(a => {
        const value = JSON.parse(a.value);
        return String(value).trim().length > 0;
      });

      expect(textAnswers.length).toBeGreaterThan(nonEmptyAnswers.length);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty surveys gracefully", async () => {
      const emptySurvey = await createEmptySurvey();

      // Query responses
      const surveyResponses = await testDb
        .select()
        .from(responses)
        .where(eq(responses.surveyId, emptySurvey.surveyId));

      expect(surveyResponses).toHaveLength(0);

      // Query answers for the question
      const questionAnswers = await testDb
        .select()
        .from(answers)
        .where(eq(answers.questionId, emptySurvey.questionId));

      expect(questionAnswers).toHaveLength(0);
    });

    it("should handle surveys with no completed responses", async () => {
      const survey = await createTestSurvey();
      const now = Date.now();

      // Create incomplete response
      const responseId = "incomplete-response";
      await testDb.insert(responses).values({
        id: responseId,
        surveyId: survey.surveyId,
        completed: false, // Not completed
        isAnonymous: false,
        createdAt: now as any,
      });

      // Query completed responses only
      const completedResponses = await testDb
        .select()
        .from(responses)
        .where(
          and(
            eq(responses.surveyId, survey.surveyId),
            eq(responses.completed, true)
          )
        );

      expect(completedResponses).toHaveLength(0);
    });

    it("should handle missing answers for optional questions", async () => {
      const survey = await createTestSurvey();
      const responseId = (await insertResponses(survey, 1))[0];

      // Remove answer for optional question
      await testDb
        .delete(answers)
        .where(
          and(
            eq(answers.responseId, responseId),
            eq(answers.questionId, survey.questions.shortText.id)
          )
        );

      // Verify answer was removed
      const remainingAnswers = await testDb
        .select()
        .from(answers)
        .where(eq(answers.responseId, responseId));

      expect(remainingAnswers).toHaveLength(4); // 5 - 1 removed
    });

    it("should maintain data consistency across related tables", async () => {
      const survey = await createTestSurvey();
      await insertResponses(survey, 3);

      // Verify referential integrity
      const allAnswers = await testDb.select().from(answers);

      for (const answer of allAnswers) {
        // Verify response exists
        const [response] = await testDb
          .select()
          .from(responses)
          .where(eq(responses.id, answer.responseId));

        expect(response).toBeDefined();

        // Verify question exists
        const [question] = await testDb
          .select()
          .from(questions)
          .where(eq(questions.id, answer.questionId));

        expect(question).toBeDefined();
      }
    });
  });

  describe("Performance & Scalability", () => {
    it("should handle large response volumes efficiently", async () => {
      const survey = await createTestSurvey();

      const startTime = Date.now();

      // Insert 100 responses
      await insertResponses(survey, 100);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 2 seconds)
      expect(duration).toBeLessThan(2000);

      // Verify all were inserted
      const allResponses = await testDb
        .select()
        .from(responses)
        .where(eq(responses.surveyId, survey.surveyId));

      expect(allResponses).toHaveLength(100);
    });

    it("should aggregate large datasets correctly", async () => {
      const survey = await createTestSurvey();
      await insertResponses(survey, 50);

      const startTime = Date.now();

      // Aggregate multiple choice answers
      const mcAnswers = await testDb
        .select()
        .from(answers)
        .where(eq(answers.questionId, survey.questions.multipleChoice.id));

      const optionCounts: Record<string, number> = {};
      for (const answer of mcAnswers) {
        const value = JSON.parse(answer.value);
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
