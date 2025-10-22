import { randomUUID } from "crypto";
import { testDb } from "../setup/setup";
import { users, surveys, surveyPages, questions, responses, answers } from "@shared/schema";

/**
 * Create a test user
 */
export async function createTestUser(overrides: Partial<{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}> = {}) {
  const userId = overrides.id || randomUUID();
  const now = Date.now();

  await testDb.insert(users).values({
    id: userId,
    email: overrides.email || `test-${userId}@example.com`,
    firstName: overrides.firstName || "Test",
    lastName: overrides.lastName || "User",
    role: "creator",
    createdAt: now as any,
    updatedAt: now as any,
  });

  return userId;
}

/**
 * Create a test survey with questions
 */
export async function createTestSurvey(userId?: string) {
  // Create user if not provided
  const creatorId = userId || await createTestUser();

  const surveyId = randomUUID();

  const now = Date.now();

  // Insert survey
  await testDb.insert(surveys).values({
    id: surveyId,
    title: "Analytics Test Survey",
    description: "Survey for testing analytics aggregation",
    creatorId,
    status: "open",
    allowAnonymous: false,
    createdAt: now as any,
    updatedAt: now as any,
  });

  // Create a page
  const pageId = randomUUID();
  await testDb.insert(surveyPages).values({
    id: pageId,
    surveyId,
    title: "Page 1",
    order: 0,
    createdAt: now as any,
  });

  // Create test questions of different types
  const qYesNo = {
    id: randomUUID(),
    pageId,
    type: "yes_no" as const,
    title: "Do you like pizza?",
    required: true,
    order: 0,
    createdAt: now as any,
  };

  const qMultipleChoice = {
    id: randomUUID(),
    pageId,
    type: "multiple_choice" as const,
    title: "What is your favorite color?",
    options: JSON.stringify(["Blue", "Red", "Green", "Yellow"]),
    required: true,
    order: 1,
    createdAt: now as any,
  };

  const qRadio = {
    id: randomUUID(),
    pageId,
    type: "radio" as const,
    title: "Choose your age group",
    options: JSON.stringify(["18-25", "26-35", "36-45", "46+"]),
    required: false,
    order: 2,
    createdAt: now as any,
  };

  const qShortText = {
    id: randomUUID(),
    pageId,
    type: "short_text" as const,
    title: "Describe yourself in a few words",
    required: false,
    order: 3,
    createdAt: now as any,
  };

  const qLongText = {
    id: randomUUID(),
    pageId,
    type: "long_text" as const,
    title: "Tell us your story",
    required: false,
    order: 4,
    createdAt: now as any,
  };

  await testDb.insert(questions).values([
    qYesNo,
    qMultipleChoice,
    qRadio,
    qShortText,
    qLongText,
  ]);

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

/**
 * Insert test responses with answers
 */
export async function insertResponses(survey: Awaited<ReturnType<typeof createTestSurvey>>, count: number = 2) {
  const { surveyId, questions } = survey;
  const responseIds: string[] = [];

  // Sample data sets
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

  for (let i = 0; i < count; i++) {
    const responseId = randomUUID();
    responseIds.push(responseId);
    const now = Date.now();

    // Create response
    await testDb.insert(responses).values({
      id: responseId,
      surveyId,
      completed: true,
      submittedAt: now as any,
      isAnonymous: false,
      createdAt: now as any,
    });

    // Create answers for each question
    const answersData = [];

    // Yes/No answer
    answersData.push({
      id: randomUUID(),
      responseId,
      questionId: questions.yesNo.id,
      value: JSON.stringify(yesNoValues[i % yesNoValues.length]),
      createdAt: now as any,
    });

    // Multiple choice answer
    answersData.push({
      id: randomUUID(),
      responseId,
      questionId: questions.multipleChoice.id,
      value: JSON.stringify(colorValues[i % colorValues.length]),
      createdAt: now as any,
    });

    // Radio answer
    answersData.push({
      id: randomUUID(),
      responseId,
      questionId: questions.radio.id,
      value: JSON.stringify(ageGroupValues[i % ageGroupValues.length]),
      createdAt: now as any,
    });

    // Short text answer
    answersData.push({
      id: randomUUID(),
      responseId,
      questionId: questions.shortText.id,
      value: JSON.stringify(shortTextValues[i % shortTextValues.length]),
      createdAt: now as any,
    });

    // Long text answer
    answersData.push({
      id: randomUUID(),
      responseId,
      questionId: questions.longText.id,
      value: JSON.stringify(longTextValues[i % longTextValues.length]),
      createdAt: now as any,
    });

    await testDb.insert(answers).values(answersData);
  }

  return responseIds;
}

/**
 * Create an empty survey (no responses)
 */
export async function createEmptySurvey(userId?: string) {
  const creatorId = userId || await createTestUser();

  const surveyId = randomUUID();
  const now = Date.now();

  await testDb.insert(surveys).values({
    id: surveyId,
    title: "Empty Survey",
    description: "Survey with no responses",
    creatorId,
    status: "open",
    createdAt: now as any,
    updatedAt: now as any,
  });

  const pageId = randomUUID();
  await testDb.insert(surveyPages).values({
    id: pageId,
    surveyId,
    title: "Page 1",
    order: 0,
    createdAt: now as any,
  });

  const questionId = randomUUID();
  await testDb.insert(questions).values({
    id: questionId,
    pageId,
    type: "yes_no" as const,
    title: "Unanswered question?",
    required: false,
    order: 0,
    createdAt: now as any,
  });

  return { surveyId, pageId, questionId, creatorId };
}
