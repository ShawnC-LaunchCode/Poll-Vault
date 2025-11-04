import { testSqlite } from "../setup/setup";
import { randomUUID } from "crypto";

/**
 * Test helpers using raw SQL to avoid Drizzle type issues with SQLite
 * These are for unit tests that use the in-memory SQLite database
 *
 * For integration tests that use the real database, see integrationTestHelpers.ts
 */

export function createTestUser(overrides: Partial<{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}> = {}) {
  const userId = overrides.id || randomUUID();
  const now = new Date().toISOString();

  testSqlite.prepare(`
    INSERT INTO users (id, email, first_name, last_name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    overrides.email || `test-${userId}@example.com`,
    overrides.firstName || "Test",
    overrides.lastName || "User",
    "creator",
    now,
    now
  );

  return userId;
}

export function createTestSurvey(userId?: string) {
  const creatorId = userId || createTestUser();
  const surveyId = randomUUID();
  const pageId = randomUUID();
  const now = new Date().toISOString();

  // Insert survey
  testSqlite.prepare(`
    INSERT INTO surveys (id, title, description, creator_id, status, allow_anonymous, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    surveyId,
    "Analytics Test Survey",
    "Survey for testing analytics aggregation",
    creatorId,
    "open",
    0,
    now,
    now
  );

  // Insert page
  testSqlite.prepare(`
    INSERT INTO survey_pages (id, survey_id, title, "order", created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(pageId, surveyId, "Page 1", 0, now);

  // Create questions
  const qYesNo = { id: randomUUID(), pageId, type: "yes_no", title: "Do you like pizza?" };
  const qMultipleChoice = { id: randomUUID(), pageId, type: "multiple_choice", title: "What is your favorite color?" };
  const qRadio = { id: randomUUID(), pageId, type: "radio", title: "Choose your age group" };
  const qShortText = { id: randomUUID(), pageId, type: "short_text", title: "Describe yourself in a few words" };
  const qLongText = { id: randomUUID(), pageId, type: "long_text", title: "Tell us your story" };

  const insertQuestion = testSqlite.prepare(`
    INSERT INTO questions (id, page_id, type, title, required, options, "order", created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertQuestion.run(qYesNo.id, pageId, qYesNo.type, qYesNo.title, 1, null, 0, now);
  insertQuestion.run(qMultipleChoice.id, pageId, qMultipleChoice.type, qMultipleChoice.title, 1, JSON.stringify(["Blue", "Red", "Green", "Yellow"]), 1, now);
  insertQuestion.run(qRadio.id, pageId, qRadio.type, qRadio.title, 0, JSON.stringify(["18-25", "26-35", "36-45", "46+"]), 2, now);
  insertQuestion.run(qShortText.id, pageId, qShortText.type, qShortText.title, 0, null, 3, now);
  insertQuestion.run(qLongText.id, pageId, qLongText.type, qLongText.title, 0, null, 4, now);

  return {
    surveyId,
    pageId,
    creatorId,
    questions: {
      yesNo: qYesNo,
      multipleChoice: qMultipleChoice,
      radio: qRadio,
      shortText: qShortText,
      longText: qLongText,
    },
  };
}

export function insertResponses(survey: ReturnType<typeof createTestSurvey>, count: number = 2) {
  const { surveyId, questions } = survey;
  const responseIds: string[] = [];

  const yesNoValues = [true, false, true, false, true];
  const colorValues = ["Blue", "Red", "Green", "Blue", "Yellow"];
  const ageGroupValues = ["18-25", "26-35", "36-45", "18-25", "26-35"];
  const shortTextValues = [
    "Creative thinker",
    "Data enthusiast",
    "Problem solver",
    "Team player",
    "Tech lover",
  ];
  const longTextValues = [
    "I love working with data and building things",
    "I am passionate about technology and innovation",
    "I enjoy solving complex problems",
    "I like collaborating with others",
    "I am always learning new things",
  ];

  const insertResponse = testSqlite.prepare(`
    INSERT INTO responses (id, survey_id, completed, submitted_at, is_anonymous, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertAnswer = testSqlite.prepare(`
    INSERT INTO answers (id, response_id, question_id, value, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < count; i++) {
    const responseId = randomUUID();
    responseIds.push(responseId);
    const now = new Date().toISOString();

    insertResponse.run(responseId, surveyId, 1, now, 0, now);

    insertAnswer.run(randomUUID(), responseId, questions.yesNo.id, JSON.stringify(yesNoValues[i % yesNoValues.length]), now);
    insertAnswer.run(randomUUID(), responseId, questions.multipleChoice.id, JSON.stringify(colorValues[i % colorValues.length]), now);
    insertAnswer.run(randomUUID(), responseId, questions.radio.id, JSON.stringify(ageGroupValues[i % ageGroupValues.length]), now);
    insertAnswer.run(randomUUID(), responseId, questions.shortText.id, JSON.stringify(shortTextValues[i % shortTextValues.length]), now);
    insertAnswer.run(randomUUID(), responseId, questions.longText.id, JSON.stringify(longTextValues[i % longTextValues.length]), now);
  }

  return responseIds;
}

export function createEmptySurvey(userId?: string) {
  const creatorId = userId || createTestUser();
  const surveyId = randomUUID();
  const pageId = randomUUID();
  const questionId = randomUUID();
  const now = new Date().toISOString();

  testSqlite.prepare(`
    INSERT INTO surveys (id, title, description, creator_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(surveyId, "Empty Survey", "Survey with no responses", creatorId, "open", now, now);

  testSqlite.prepare(`
    INSERT INTO survey_pages (id, survey_id, title, "order", created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(pageId, surveyId, "Page 1", 0, now);

  testSqlite.prepare(`
    INSERT INTO questions (id, page_id, type, title, required, "order", created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(questionId, pageId, "yes_no", "Unanswered question?", 0, 0, now);

  return { surveyId, pageId, questionId, creatorId };
}
