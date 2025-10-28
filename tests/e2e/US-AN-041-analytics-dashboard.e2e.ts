import { test, expect } from "@playwright/test";

/**
 * US-AN-041: Analytics Dashboard
 *
 * Tests the complete analytics dashboard experience
 */
test.describe("US-AN-041: Analytics Dashboard", () => {
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

  test("should display survey analytics overview", async ({ page }) => {
    // Navigate to survey results (assumes survey with responses exists)
    await page.click("text=View Surveys");
    await page.click(".survey-card >> first");
    await page.click("button:has-text('View Results')");

    // Should display key metrics
    await expect(page.locator("text=Total Responses")).toBeVisible();
    await expect(page.locator("text=Completion Rate")).toBeVisible();
    await expect(page.locator("text=Average Time")).toBeVisible();

    // Metrics should have values
    const totalResponses = page.locator("[data-testid='total-responses']");
    await expect(totalResponses).not.toBeEmpty();

    const completionRate = page.locator("[data-testid='completion-rate']");
    await expect(completionRate).toContainText("%");
  });

  test("should display question-level analytics", async ({ page }) => {
    // Navigate to results page
    await page.goto("http://localhost:5173/surveys/test-survey-id/results");

    // Should show analytics for each question
    await expect(page.locator("text=Question Analytics")).toBeVisible();

    // Click on a question
    await page.click(".question-analytics-card >> first");

    // Should show detailed metrics
    await expect(page.locator("text=Answer Rate")).toBeVisible();
    await expect(page.locator("text=Time Spent")).toBeVisible();
    await expect(page.locator("text=Skip Rate")).toBeVisible();

    // Should show answer distribution
    await expect(page.locator(".answer-distribution")).toBeVisible();
  });

  test("should display completion funnel", async ({ page }) => {
    await page.goto("http://localhost:5173/surveys/test-survey-id/results");

    // Navigate to funnel tab
    await page.click("button:has-text('Funnel')");

    // Should show page-level drop-off
    await expect(page.locator("text=Completion Funnel")).toBeVisible();

    // Each page should have metrics
    const funnelSteps = page.locator(".funnel-step");
    await expect(funnelSteps).toHaveCount(3); // Assuming 3-page survey

    // First page should have highest views
    const firstPage = funnelSteps.nth(0);
    await expect(firstPage).toContainText("100%"); // Starting point

    // Drop-off should be visible
    await expect(page.locator("text=Drop-off Rate")).toBeVisible();
  });

  test("should filter responses by date range", async ({ page }) => {
    await page.goto("http://localhost:5173/surveys/test-survey-id/results");

    // Click date filter
    await page.click("button:has-text('Filter by Date')");

    // Select date range
    await page.fill('input[name="startDate"]', "2025-01-01");
    await page.fill('input[name="endDate"]', "2025-01-31");
    await page.click("button:has-text('Apply')");

    // Results should update
    await expect(page.locator("text=Showing results from")).toBeVisible();
    await expect(page.locator("text=Jan 1 - Jan 31")).toBeVisible();

    // Metrics should reflect filtered data
    const filteredCount = await page.locator("[data-testid='total-responses']").textContent();
    expect(filteredCount).toBeDefined();
  });

  test("should display response trends over time", async ({ page }) => {
    await page.goto("http://localhost:5173/surveys/test-survey-id/results");

    // Navigate to trends tab
    await page.click("button:has-text('Trends')");

    // Should show line chart
    await expect(page.locator(".response-trend-chart")).toBeVisible();

    // Should have data points
    const chartPoints = page.locator(".chart-data-point");
    await expect(chartPoints.count()).toBeGreaterThan(0);

    // Toggle grouping
    await page.click("button:has-text('Group by Day')");
    await page.click("text=Group by Hour");

    // Chart should update
    await expect(page.locator(".response-trend-chart")).toBeVisible();
  });

  test("should export analytics report", async ({ page }) => {
    await page.goto("http://localhost:5173/surveys/test-survey-id/results");

    // Click export button
    await page.click("button:has-text('Export Report')");

    // Should show export options
    await expect(page.locator("text=Export as CSV")).toBeVisible();
    await expect(page.locator("text=Export as PDF")).toBeVisible();

    // Start CSV download (mock the download)
    const downloadPromise = page.waitForEvent("download");
    await page.click("text=Export as CSV");
    const download = await downloadPromise;

    // Verify filename
    expect(download.suggestedFilename()).toContain(".csv");
  });

  test("should display individual response details", async ({ page }) => {
    await page.goto("http://localhost:5173/surveys/test-survey-id/results");

    // Navigate to responses tab
    await page.click("button:has-text('Responses')");

    // Should show response list
    const responseCards = page.locator(".response-card");
    await expect(responseCards.count()).toBeGreaterThan(0);

    // Click on a response
    await responseCards.nth(0).click();

    // Should show detailed view
    await expect(page.locator("text=Response Details")).toBeVisible();

    // Should show all answers
    await expect(page.locator(".answer-item")).toHaveCount(3); // Assuming 3 questions

    // Should show metadata
    await expect(page.locator("text=Submitted at")).toBeVisible();
    await expect(page.locator("text=Time taken")).toBeVisible();
  });

  test("should display text answer word cloud", async ({ page }) => {
    await page.goto("http://localhost:5173/surveys/test-survey-id/results");

    // Navigate to a long-text question
    await page.click("text=Question Analytics");
    await page.click("text=What did you think?"); // Long-text question

    // Should show word cloud
    await expect(page.locator(".word-cloud")).toBeVisible();

    // Common words should be larger
    const words = page.locator(".word-cloud-word");
    await expect(words.count()).toBeGreaterThan(5);

    // Click on a word to filter
    await words.nth(0).click();

    // Should show responses containing that word
    await expect(page.locator("text=Responses containing")).toBeVisible();
  });

  test("should compare responses across segments", async ({ page }) => {
    await page.goto("http://localhost:5173/surveys/test-survey-id/results");

    // Navigate to segments tab
    await page.click("button:has-text('Segments')");

    // Create segment based on answer
    await page.click("button:has-text('Create Segment')");
    await page.selectOption("select[name='segmentQuestion']", "Location");
    await page.selectOption("select[name='segmentAnswer']", "New York");
    await page.fill('input[name="segmentName"]', "NY Respondents");
    await page.click("button:has-text('Save Segment')");

    // Segment should appear
    await expect(page.locator("text=NY Respondents")).toBeVisible();

    // Select segment
    await page.click("text=NY Respondents");

    // Metrics should update for segment
    await expect(page.locator("text=Segment: NY Respondents")).toBeVisible();

    // Compare with another segment
    await page.click("button:has-text('Compare')");
    await page.selectOption("select[name='compareSegment']", "All Respondents");

    // Should show comparison view
    await expect(page.locator(".comparison-chart")).toBeVisible();
  });
});
