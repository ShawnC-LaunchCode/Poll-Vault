import { test as base, type Page } from "@playwright/test";
import { randomUUID } from "crypto";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "creator";
};

/**
 * Create authenticated session by directly calling the auth API
 * This bypasses Google OAuth for testing purposes
 */
async function createAuthenticatedSession(page: Page): Promise<AuthUser> {
  // For e2e tests, we'll use a mock Google token approach
  // In a real scenario, you'd set up a test Google OAuth account or mock the OAuth endpoint

  // Navigate to the app first to establish cookies
  await page.goto("/");

  // Create a test user via session manipulation
  // Since we can't easily mock Google OAuth in e2e tests, we'll use localStorage
  // and a test user endpoint (if available) or direct session setup

  const testUser: AuthUser = {
    id: `test-user-${randomUUID()}`,
    email: "e2e-test@example.com",
    firstName: "E2E",
    lastName: "Test",
    role: "creator",
  };

  // Set up session via direct API call with a test token
  // Note: This requires a test endpoint or mocked auth in test mode
  // For now, we'll inject the session directly via page evaluation
  await page.evaluate((user) => {
    // Store user in sessionStorage (frontend will check this)
    sessionStorage.setItem("user", JSON.stringify(user));

    // Also set a flag that we're in test mode
    sessionStorage.setItem("testMode", "true");
  }, testUser);

  return testUser;
}

type AuthFixtures = {
  authenticatedPage: Page;
  testUser: AuthUser;
};

/**
 * Extended Playwright test with authentication fixtures
 *
 * Usage:
 * import { test, expect } from './fixtures/auth';
 *
 * test('my test', async ({ authenticatedPage, testUser }) => {
 *   await authenticatedPage.goto('/dashboard');
 *   // ... test code
 * });
 */
export const test = base.extend<AuthFixtures>({
  testUser: async ({ page }, use) => {
    const user = await createAuthenticatedSession(page);
    await use(user);
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    // Session is already set up from testUser fixture
    await use(page);
  },
});

export { expect } from "@playwright/test";
