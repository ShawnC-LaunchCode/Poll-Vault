import { test, expect } from "@playwright/test";

/**
 * US-S-013: Nested Loop Builder
 *
 * Tests the ability to create nested loop questions (e.g., family members with children)
 */
test.describe("US-S-013: Nested Loop Builder", () => {
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

    // Create a new survey
    await page.click("button:has-text('Create Survey')");
    await page.fill('input[placeholder*="Survey Title"]', "Family Information Survey");
    await page.click("button:has-text('Save')");
  });

  test("should create a loop group question", async ({ page }) => {
    // Add question
    await page.click("button:has-text('Add Question')");

    // Select loop_group type
    await page.selectOption("select[name='questionType']", "loop_group");

    // Fill question details
    await page.fill('input[placeholder*="Question Title"]', "Tell us about your children");
    await page.fill('textarea[placeholder*="Description"]', "Add details for each child");

    // Configure loop
    await page.fill('input[name="loopIterationLabel"]', "Child");
    await page.fill('input[name="minIterations"]', "1");
    await page.fill('input[name="maxIterations"]', "10");

    // Save question
    await page.click("button:has-text('Save Question')");

    // Loop group should appear
    await expect(page.locator("text=Tell us about your children")).toBeVisible();
    await expect(page.locator("text=Loop Group")).toBeVisible();
  });

  test("should add subquestions to loop group", async ({ page }) => {
    // Create loop group
    await page.click("button:has-text('Add Question')");
    await page.selectOption("select[name='questionType']", "loop_group");
    await page.fill('input[placeholder*="Question Title"]', "Family Members");
    await page.click("button:has-text('Save Question')");

    // Add subquestion
    await page.click("button:has-text('Add Subquestion')");

    // Fill subquestion details
    await page.selectOption("select[name='subquestionType']", "short_text");
    await page.fill('input[placeholder*="Subquestion Title"]', "What is their name?");
    await page.check('input[type="checkbox"][name="required"]');

    await page.click("button:has-text('Save Subquestion')");

    // Add another subquestion
    await page.click("button:has-text('Add Subquestion')");
    await page.selectOption("select[name='subquestionType']", "date_time");
    await page.fill('input[placeholder*="Subquestion Title"]', "Date of birth");
    await page.click("button:has-text('Save Subquestion')");

    // Both subquestions should be visible
    await expect(page.locator("text=What is their name?")).toBeVisible();
    await expect(page.locator("text=Date of birth")).toBeVisible();
  });

  test("should create nested loop within loop group", async ({ page }) => {
    // Create parent loop group
    await page.click("button:has-text('Add Question')");
    await page.selectOption("select[name='questionType']", "loop_group");
    await page.fill('input[placeholder*="Question Title"]', "Children");
    await page.fill('input[name="loopIterationLabel"]', "Child");
    await page.click("button:has-text('Save Question')");

    // Add name subquestion
    await page.click("button:has-text('Add Subquestion')");
    await page.selectOption("select[name='subquestionType']", "short_text");
    await page.fill('input[placeholder*="Subquestion Title"]', "Child's name");
    await page.click("button:has-text('Save Subquestion')");

    // Add nested loop for school years
    await page.click("button:has-text('Add Nested Loop')");
    await page.fill('input[placeholder*="Nested Loop Title"]', "School Years");
    await page.fill('input[name="nestedLoopLabel"]', "Year");
    await page.fill('input[name="nestedMinIterations"]', "1");
    await page.fill('input[name="nestedMaxIterations"]', "12");

    await page.click("button:has-text('Save Nested Loop')");

    // Verify nested structure
    await expect(page.locator("text=Children")).toBeVisible();
    await expect(page.locator("text=Child's name")).toBeVisible();
    await expect(page.locator("text=School Years")).toBeVisible();

    // Nested loop should be indented or visually distinct
    const nestedLoop = page.locator("text=School Years").locator("..");
    await expect(nestedLoop).toHaveClass(/nested-loop|indented/);
  });

  test("should preview loop behavior", async ({ page }) => {
    // Create loop group with subquestions
    await page.click("button:has-text('Add Question')");
    await page.selectOption("select[name='questionType']", "loop_group");
    await page.fill('input[placeholder*="Question Title"]', "Team Members");
    await page.fill('input[name="loopIterationLabel"]', "Member");
    await page.click("button:has-text('Save Question')");

    await page.click("button:has-text('Add Subquestion')");
    await page.selectOption("select[name='subquestionType']", "short_text");
    await page.fill('input[placeholder*="Subquestion Title"]', "Name");
    await page.click("button:has-text('Save Subquestion')");

    // Click preview
    await page.click("button:has-text('Preview')");

    // Should show "Add Another Member" button
    await expect(page.locator("button:has-text('Add Another Member')")).toBeVisible();

    // Click to add iteration
    await page.click("button:has-text('Add Another Member')");

    // Should show second iteration
    await expect(page.locator("text=Member 1")).toBeVisible();
    await expect(page.locator("text=Member 2")).toBeVisible();

    // Both should have name input
    const nameInputs = page.locator('input[placeholder*="Name"]');
    await expect(nameInputs).toHaveCount(2);
  });

  test("should reorder subquestions within loop", async ({ page }) => {
    // Create loop with multiple subquestions
    await page.click("button:has-text('Add Question')");
    await page.selectOption("select[name='questionType']", "loop_group");
    await page.fill('input[placeholder*="Question Title"]', "Products");
    await page.click("button:has-text('Save Question')");

    // Add three subquestions
    for (let i = 1; i <= 3; i++) {
      await page.click("button:has-text('Add Subquestion')");
      await page.selectOption("select[name='subquestionType']", "short_text");
      await page.fill('input[placeholder*="Subquestion Title"]', `Question ${i}`);
      await page.click("button:has-text('Save Subquestion')");
    }

    // Drag Question 3 to first position
    const question3 = page.locator("text=Question 3").locator("..");
    const question1 = page.locator("text=Question 1").locator("..");

    await question3.dragTo(question1);

    // Order should change
    const subquestions = page.locator(".subquestion-list .subquestion");
    await expect(subquestions.nth(0)).toContainText("Question 3");
    await expect(subquestions.nth(1)).toContainText("Question 1");
    await expect(subquestions.nth(2)).toContainText("Question 2");
  });

  test("should validate loop configuration", async ({ page }) => {
    // Create loop
    await page.click("button:has-text('Add Question')");
    await page.selectOption("select[name='questionType']", "loop_group");
    await page.fill('input[placeholder*="Question Title"]', "Invalid Loop");

    // Set invalid min/max
    await page.fill('input[name="minIterations"]', "10");
    await page.fill('input[name="maxIterations"]', "5");

    // Try to save
    await page.click("button:has-text('Save Question')");

    // Should show error
    await expect(page.locator("text=Maximum must be greater than minimum")).toBeVisible();
  });
});
