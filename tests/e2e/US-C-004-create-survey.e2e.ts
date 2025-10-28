import { test, expect } from "@playwright/test";

/**
 * US-C-004: Create Survey End-to-End
 *
 * Tests the complete user journey from login to survey creation
 */
test.describe("US-C-004: Create New Survey (E2E)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto("http://localhost:5173");

    // Mock Google OAuth (in real tests, use test credentials)
    // For now, assume we're logged in
    await page.evaluate(() => {
      localStorage.setItem("user", JSON.stringify({
        id: "test-user-id",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "creator",
      }));
    });

    // Navigate to dashboard
    await page.goto("http://localhost:5173/dashboard");
  });

  test("should create a new survey through UI", async ({ page }) => {
    // Click "Create Survey" button
    await page.click("button:has-text('Create Survey')");

    // Should navigate to survey builder
    await expect(page).toHaveURL(/\/builder/);

    // Fill in survey title
    await page.fill('input[placeholder*="Survey Title"]', "Customer Feedback Survey");

    // Fill in description
    await page.fill('textarea[placeholder*="Description"]', "Help us improve our services");

    // Save survey
    await page.click("button:has-text('Save')");

    // Should show success notification
    await expect(page.locator("text=Survey saved")).toBeVisible();

    // Survey should appear in dashboard
    await page.goto("http://localhost:5173/dashboard");
    await expect(page.locator("text=Customer Feedback Survey")).toBeVisible();
  });

  test("should add questions to survey", async ({ page }) => {
    // Create survey
    await page.click("button:has-text('Create Survey')");
    await page.fill('input[placeholder*="Survey Title"]', "Product Feedback");
    await page.click("button:has-text('Save')");

    // Add question
    await page.click("button:has-text('Add Question')");

    // Select question type
    await page.click("select[name='questionType']");
    await page.selectOption("select[name='questionType']", "short_text");

    // Fill question title
    await page.fill('input[placeholder*="Question Title"]', "How would you rate our product?");

    // Mark as required
    await page.check('input[type="checkbox"][name="required"]');

    // Save question
    await page.click("button:has-text('Save Question')");

    // Question should appear in builder
    await expect(page.locator("text=How would you rate our product?")).toBeVisible();
    await expect(page.locator("text=Required")).toBeVisible();
  });

  test("should add multiple pages to survey", async ({ page }) => {
    // Create survey
    await page.click("button:has-text('Create Survey')");
    await page.fill('input[placeholder*="Survey Title"]', "Multi-Page Survey");
    await page.click("button:has-text('Save')");

    // Add first page
    await page.click("button:has-text('Add Page')");
    await page.fill('input[placeholder*="Page Title"]', "Personal Information");
    await page.click("button:has-text('Save Page')");

    // Add second page
    await page.click("button:has-text('Add Page')");
    await page.fill('input[placeholder*="Page Title"]', "Feedback");
    await page.click("button:has-text('Save Page')");

    // Both pages should be visible in page navigation
    await expect(page.locator("text=Personal Information")).toBeVisible();
    await expect(page.locator("text=Feedback")).toBeVisible();
  });

  test("should preview survey before publishing", async ({ page }) => {
    // Create survey with questions
    await page.click("button:has-text('Create Survey')");
    await page.fill('input[placeholder*="Survey Title"]', "Preview Test Survey");

    await page.click("button:has-text('Add Question')");
    await page.selectOption("select[name='questionType']", "short_text");
    await page.fill('input[placeholder*="Question Title"]', "Test Question");
    await page.click("button:has-text('Save Question')");

    // Click preview button
    await page.click("button:has-text('Preview')");

    // Should show preview modal or new page
    await expect(page.locator("text=Preview Test Survey")).toBeVisible();
    await expect(page.locator("text=Test Question")).toBeVisible();

    // Should not be able to submit in preview mode
    const submitButton = page.locator("button:has-text('Submit')");
    await expect(submitButton).toBeDisabled();
  });

  test("should publish survey and change status to open", async ({ page }) => {
    // Create survey
    await page.click("button:has-text('Create Survey')");
    await page.fill('input[placeholder*="Survey Title"]', "Ready to Publish");

    // Add at least one question (required for publishing)
    await page.click("button:has-text('Add Question')");
    await page.selectOption("select[name='questionType']", "yes_no");
    await page.fill('input[placeholder*="Question Title"]', "Do you like our product?");
    await page.click("button:has-text('Save Question')");

    // Publish survey
    await page.click("button:has-text('Publish')");

    // Confirm publication
    await page.click("button:has-text('Confirm')");

    // Should show success message
    await expect(page.locator("text=Survey published")).toBeVisible();

    // Status should change to "Open"
    await expect(page.locator("text=Status: Open")).toBeVisible();
  });

  test("should prevent publishing survey without questions", async ({ page }) => {
    // Create survey without questions
    await page.click("button:has-text('Create Survey')");
    await page.fill('input[placeholder*="Survey Title"]', "Empty Survey");
    await page.click("button:has-text('Save')");

    // Try to publish
    await page.click("button:has-text('Publish')");

    // Should show error message
    await expect(page.locator("text=cannot publish")).toBeVisible();
    await expect(page.locator("text=at least one question")).toBeVisible();
  });
});
