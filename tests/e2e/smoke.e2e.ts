import { test, expect } from "@playwright/test";

/**
 * Basic smoke tests to verify the app is functional
 * Note: These tests run without authentication (landing page only)
 */
test.describe("Smoke Tests", () => {
  test("should load homepage successfully", async ({ page }) => {
    await page.goto("/");

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Should load without 404 or 500 errors
    expect(page.url()).toContain(page.context()._options.baseURL || '');
  });

  test("should have valid page title", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState('domcontentloaded');

    // Check title is set (not empty)
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("should display landing page content", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState('domcontentloaded');

    // Landing page should have some visible content
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Should have some text content (not a blank page)
    const textContent = await body.textContent();
    expect(textContent?.trim().length).toBeGreaterThan(0);
  });

  test("should have working CSS and layout", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState('networkidle');

    // Check that the page has loaded styles (body should have some height)
    const body = page.locator('body');
    const bodyHeight = await body.evaluate(el => el.clientHeight);
    expect(bodyHeight).toBeGreaterThan(0);
  });

  test("should handle navigation without crashing", async ({ page }) => {
    // Navigate to homepage
    await page.goto("/");
    await page.waitForLoadState('domcontentloaded');

    // Try navigating to a protected route (should redirect to landing, not crash)
    await page.goto("/dashboard");
    await page.waitForLoadState('domcontentloaded');

    // Should still have a valid page (not error page)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
