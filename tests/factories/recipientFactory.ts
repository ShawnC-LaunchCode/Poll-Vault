import { v4 as uuid } from "uuid";
import type { Recipient, GlobalRecipient } from "../../shared/schema";

export interface TestRecipientOptions {
  id?: string;
  surveyId?: string;
  name?: string;
  email?: string;
  token?: string;
  sentAt?: Date | null;
  createdAt?: Date;
}

/**
 * Create a test recipient with sensible defaults
 */
export function createTestRecipient(overrides: TestRecipientOptions = {}): Recipient {
  return {
    id: uuid(),
    surveyId: uuid(),
    name: "Test Recipient",
    email: `recipient_${Date.now()}@example.com`,
    token: uuid(),
    sentAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create multiple test recipients
 */
export function createTestRecipients(count: number, surveyId: string, baseOverrides: TestRecipientOptions = {}): Recipient[] {
  return Array.from({ length: count }, (_, i) =>
    createTestRecipient({
      surveyId,
      name: `Recipient ${i + 1}`,
      email: `recipient_${Date.now()}_${i}@example.com`,
      ...baseOverrides,
    })
  );
}

/**
 * Create a global recipient
 */
export function createTestGlobalRecipient(creatorId: string, overrides: Partial<GlobalRecipient> = {}): GlobalRecipient {
  const timestamp = new Date();
  return {
    id: uuid(),
    creatorId,
    name: "Test Global Recipient",
    email: `global_${Date.now()}@example.com`,
    tags: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

/**
 * Create multiple global recipients with tags
 */
export function createTestGlobalRecipients(
  count: number,
  creatorId: string,
  tags: string[] = []
): GlobalRecipient[] {
  return Array.from({ length: count }, (_, i) =>
    createTestGlobalRecipient(creatorId, {
      name: `Global Recipient ${i + 1}`,
      email: `global_${Date.now()}_${i}@example.com`,
      tags: tags.length > 0 ? [tags[i % tags.length]] : [],
    })
  );
}

/**
 * Create a recipient that has been sent an invitation
 */
export function createTestSentRecipient(surveyId: string, overrides: TestRecipientOptions = {}): Recipient {
  return createTestRecipient({
    surveyId,
    sentAt: new Date(Date.now() - 3600000), // 1 hour ago
    ...overrides,
  });
}
