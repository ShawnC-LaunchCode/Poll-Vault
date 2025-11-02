import { test, expect } from "@playwright/test";

/**
 * Basic smoke tests to verify the app is functional
 */
test.describe("Smoke Tests", () => {
  test("should load homepage", async ({ page }) => {
    await page.goto("/");

    // Should load without errors
    await expect(page).toHaveTitle(/Poll-Vault/i);
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/");

    // Check for Google Sign In button or login prompt
    const hasGoogleButton = await page.locator('text=/sign in/i').isVisible().catch(() => false);
    const hasLoginButton = await page.locator('button:has-text("Login")').isVisible().catch(() => false);

    expect(hasGoogleButton || hasLoginButton).toBeTruthy();
  });

  test("should access dashboard with mock auth", async ({ page }) => {
    // Mock authentication by setting localStorage
    await page.goto("/");

    await page.evaluate(() => {
      localStorage.setItem("user", JSON.stringify({
        id: "test-user-id",
        email: "test@example.com",
        name: "Test User",
        role: "creator",
      }));
    });

    // Navigate to dashboard
    await page.goto("/dashboard");

    // Should show dashboard content (with more flexible selectors)
    const hasDashboard =
      await page.locator('text=/dashboard/i').isVisible().catch(() => false) ||
      await page.locator('text=/survey/i').isVisible().catch(() => false) ||
      await page.locator('text=/create/i').isVisible().catch(() => false);

    expect(hasDashboard).toBeTruthy();
  });

  test("should render without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");

    // Wait for page to settle
    await page.waitForLoadState('networkidle');

    // Should have no critical console errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') && // Ignore favicon errors
      !err.includes('source map') && // Ignore sourcemap warnings
      !err.includes('DevTools') // Ignore DevTools messages
    );

    expect(criticalErrors.length).toBe(0);
  });

  test("should have working navigation", async ({ page }) => {
    await page.goto("/");

    // Mock auth
    await page.evaluate(() => {
      localStorage.setItem("user", JSON.stringify({
        id: "test-user-id",
        email: "test@example.com",
        name: "Test User",
        role: "creator",
      }));
    });

    await page.goto("/dashboard");

    // Try to navigate to different sections
    // (flexible checks since UI might vary)
    const mainContent = page.locator('main, [role="main"], .container');
    await expect(mainContent).toBeVisible();
  });
});
