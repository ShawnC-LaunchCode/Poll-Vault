import { test, expect, devices } from "@playwright/test";

/**
 * US-UX-060: Mobile Survey Builder
 *
 * Tests the mobile-responsive survey builder experience
 */
test.describe("US-UX-060: Mobile Survey Builder", () => {
  test.use({
    ...devices["iPhone 12"],
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem("user", JSON.stringify({
        id: "test-user-id",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "creator",
      }));
    });

    await page.goto("http://localhost:5173/dashboard");
  });

  test("should display mobile-optimized dashboard", async ({ page }) => {
    // Hamburger menu should be visible on mobile
    await expect(page.locator("button[aria-label='Menu']")).toBeVisible();

    // Click menu
    await page.click("button[aria-label='Menu']");

    // Navigation drawer should open
    await expect(page.locator("nav.mobile-menu")).toBeVisible();
    await expect(page.locator("text=Dashboard")).toBeVisible();
    await expect(page.locator("text=My Surveys")).toBeVisible();
  });

  test("should create survey on mobile", async ({ page }) => {
    // FAB (Floating Action Button) for creating survey
    await page.click("button[aria-label='Create Survey']");

    // Should navigate to builder
    await expect(page).toHaveURL(/\/builder/);

    // Input should be touch-friendly (min 44x44px)
    const titleInput = page.locator('input[placeholder*="Survey Title"]');
    const boundingBox = await titleInput.boundingBox();
    expect(boundingBox?.height).toBeGreaterThanOrEqual(44);

    // Fill survey details
    await page.fill('input[placeholder*="Survey Title"]', "Mobile Survey");
    await page.fill('textarea[placeholder*="Description"]', "Created on mobile");

    // Save button should be accessible
    await page.click("button:has-text('Save')");

    // Success toast should appear
    await expect(page.locator(".toast-success")).toBeVisible();
  });

  test("should add questions with mobile UI", async ({ page }) => {
    // Create survey
    await page.click("button[aria-label='Create Survey']");
    await page.fill('input[placeholder*="Survey Title"]', "Mobile Test");
    await page.click("button:has-text('Save')");

    // Add question - should open bottom sheet
    await page.click("button:has-text('Add Question')");

    // Bottom sheet should slide up
    await expect(page.locator(".bottom-sheet")).toBeVisible();

    // Question type picker should be touch-friendly
    await page.click("text=Short Text");

    // Fill question
    await page.fill('input[placeholder*="Question Title"]', "What is your name?");

    // Toggle should be large enough for touch
    const requiredToggle = page.locator('label:has-text("Required")');
    await requiredToggle.click();

    // Save question
    await page.click("button:has-text('Save Question')");

    // Question should appear in list
    await expect(page.locator("text=What is your name?")).toBeVisible();
  });

  test("should reorder questions with touch gestures", async ({ page }) => {
    // Create survey with multiple questions
    await page.click("button[aria-label='Create Survey']");
    await page.fill('input[placeholder*="Survey Title"]', "Reorder Test");
    await page.click("button:has-text('Save')");

    // Add three questions
    for (let i = 1; i <= 3; i++) {
      await page.click("button:has-text('Add Question')");
      await page.click("text=Short Text");
      await page.fill('input[placeholder*="Question Title"]', `Question ${i}`);
      await page.click("button:has-text('Save Question')");
    }

    // Long press to enter reorder mode
    const question1 = page.locator("text=Question 1").locator("..");
    await question1.tap({ timeout: 1000 });

    // Should show reorder handles
    await expect(page.locator(".drag-handle")).toBeVisible();

    // Drag Question 3 to first position
    const question3 = page.locator("text=Question 3").locator("..");
    await question3.dragTo(question1);

    // Order should change
    const questions = page.locator(".question-list .question-item");
    await expect(questions.nth(0)).toContainText("Question 3");
  });

  test("should preview survey on mobile", async ({ page }) => {
    // Create survey
    await page.click("button[aria-label='Create Survey']");
    await page.fill('input[placeholder*="Survey Title"]', "Mobile Preview");
    await page.click("button:has-text('Save')");

    await page.click("button:has-text('Add Question')");
    await page.click("text=Yes/No");
    await page.fill('input[placeholder*="Question Title"]', "Do you like our app?");
    await page.click("button:has-text('Save Question')");

    // Open menu
    await page.click("button[aria-label='More options']");

    // Click preview
    await page.click("text=Preview");

    // Preview should fill screen
    await expect(page.locator(".preview-container")).toBeVisible();

    // Questions should be readable
    const questionText = page.locator("text=Do you like our app?");
    const fontSize = await questionText.evaluate((el) =>
      window.getComputedStyle(el).fontSize
    );
    expect(parseInt(fontSize)).toBeGreaterThanOrEqual(16);

    // Yes/No buttons should be large
    const yesButton = page.locator("button:has-text('Yes')");
    const box = await yesButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(48);
  });

  test("should use mobile keyboard appropriately", async ({ page }) => {
    await page.click("button[aria-label='Create Survey']");
    await page.click("button:has-text('Add Question')");
    await page.click("text=Short Text");

    // Short text should use text keyboard
    const shortInput = page.locator('input[placeholder*="Type your answer"]');
    await expect(shortInput).toHaveAttribute("inputmode", "text");

    // Create number question
    await page.click("button:has-text('Add Question')");
    await page.click("text=Number");

    // Number input should use numeric keyboard
    const numberInput = page.locator('input[type="number"]');
    await expect(numberInput).toHaveAttribute("inputmode", "numeric");
  });

  test("should handle page navigation on mobile", async ({ page }) => {
    // Create multi-page survey
    await page.click("button[aria-label='Create Survey']");
    await page.fill('input[placeholder*="Survey Title"]', "Multi-Page Mobile");
    await page.click("button:has-text('Save')");

    // Add pages
    await page.click("button:has-text('Add Page')");
    await page.fill('input[placeholder*="Page Title"]', "Page 1");
    await page.click("button:has-text('Save Page')");

    await page.click("button:has-text('Add Page')");
    await page.fill('input[placeholder*="Page Title"]', "Page 2");
    await page.click("button:has-text('Save Page')");

    // Page tabs should be horizontally scrollable
    const pageTabs = page.locator(".page-tabs");
    await expect(pageTabs).toHaveCSS("overflow-x", "auto");

    // Swipe between pages
    await page.locator("text=Page 2").click();

    // Page 2 should be active
    await expect(page.locator(".page-tab.active")).toContainText("Page 2");
  });

  test("should support pull-to-refresh", async ({ page }) => {
    // On dashboard
    await page.goto("http://localhost:5173/dashboard");

    // Simulate pull down gesture
    await page.mouse.move(200, 100);
    await page.mouse.down();
    await page.mouse.move(200, 300);
    await page.mouse.up();

    // Should show loading indicator
    await expect(page.locator(".refresh-indicator")).toBeVisible();

    // Should reload surveys
    await page.waitForLoadState("networkidle");
  });
});
