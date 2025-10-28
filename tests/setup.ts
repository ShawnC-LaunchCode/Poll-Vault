import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";

/**
 * Global test setup file
 * Runs before all tests
 */

// Mock environment variables for tests
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://test:test@localhost:5432/poll_vault_test";
process.env.SESSION_SECRET = "test-secret-key-for-testing-only";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.VITE_GOOGLE_CLIENT_ID = "test-google-client-id";

// Global test hooks
beforeAll(async () => {
  // Setup test database
  console.log("🧪 Setting up test environment...");

  // TODO: Run database migrations for test DB
  // await db.migrate.latest();
});

afterAll(async () => {
  // Cleanup test database
  console.log("🧹 Cleaning up test environment...");

  // TODO: Teardown test database
  // await db.destroy();
});

beforeEach(async () => {
  // Reset mocks before each test
  vi.clearAllMocks();

  // TODO: Clear test database tables
  // await clearDatabase();
});

afterEach(async () => {
  // Cleanup after each test
  vi.restoreAllMocks();
});

// Mock external services
vi.mock("../server/services/sendgrid", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  sendInvitation: vi.fn().mockResolvedValue({ success: true }),
  sendReminder: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock Google OAuth
vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: vi.fn().mockResolvedValue({
      getPayload: () => ({
        email: "test@example.com",
        given_name: "Test",
        family_name: "User",
        picture: "https://example.com/avatar.jpg",
      }),
    }),
  })),
}));

// Mock file upload
vi.mock("multer", () => {
  const multer = () => ({
    single: () => (req: any, res: any, next: any) => next(),
    array: () => (req: any, res: any, next: any) => next(),
  });
  return { default: multer };
});

// Increase timeout for integration tests
if (process.env.TEST_TYPE === "integration") {
  vi.setConfig({ testTimeout: 30000 });
}
