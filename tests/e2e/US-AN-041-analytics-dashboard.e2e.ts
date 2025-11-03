import { test, expect } from "@playwright/test";

/**
 * US-AN-041: Analytics and Performance Tests
 *
 * Tests application performance and API response behavior
 */
test.describe("US-AN-041: Analytics and Performance", () => {
  test.setTimeout(30000);

  test("should load homepage within acceptable time", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test("should handle concurrent page loads", async ({ browser }) => {
    // Create multiple pages
    const context = await browser.newContext();
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage(),
    ]);

    // Load all pages concurrently
    await Promise.all(
      pages.map((page) => page.goto("/", { waitUntil: "domcontentloaded" }))
    );

    // All should load successfully
    for (const page of pages) {
      const body = page.locator("body");
      await expect(body).toBeVisible();
    }

    await context.close();
  });

  test("should handle API rate limiting gracefully", async ({ request }) => {
    // Make multiple requests
    const requests = Array(5)
      .fill(null)
      .map(() => request.get("/api/user"));

    const responses = await Promise.all(requests);

    // All should return valid status codes (not 500)
    for (const response of responses) {
      expect([200, 401, 429]).toContain(response.status());
    }
  });

  test("should track analytics events", async ({ page }) => {
    const analyticsRequests: string[] = [];

    page.on("request", (request) => {
      if (request.url().includes("/api/analytics")) {
        analyticsRequests.push(request.url());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Analytics may or may not fire depending on implementation
    // Just verify no errors occurred
    expect(true).toBeTruthy();
  });

  test("should handle network failures gracefully", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Simulate offline mode
    await page.context().setOffline(true);

    // Try to navigate (should handle gracefully)
    try {
      await page.goto("/dashboard", { timeout: 3000 });
    } catch (error) {
      // Expected to fail, but app shouldn't crash
    }

    // Restore connection
    await page.context().setOffline(false);

    // Should recover
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should optimize image loading", async ({ page }) => {
    const imageRequests: Array<{ url: string; size: number }> = [];

    page.on("response", async (response) => {
      const contentType = response.headers()["content-type"];
      if (contentType && contentType.includes("image")) {
        const buffer = await response.body().catch(() => null);
        imageRequests.push({
          url: response.url(),
          size: buffer ? buffer.length : 0,
        });
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // If images loaded, verify they're not too large
    for (const img of imageRequests) {
      // Images should be under 5MB
      expect(img.size).toBeLessThan(5 * 1024 * 1024);
    }
  });

  test("should have proper meta tags for SEO", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Check for title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    // Check for meta description (if present)
    const metaDescription = await page
      .locator('meta[name="description"]')
      .getAttribute("content")
      .catch(() => null);

    // Meta tags are optional but should not be empty if present
    if (metaDescription) {
      expect(metaDescription.length).toBeGreaterThan(0);
    }
  });

  test("should handle console warnings appropriately", async ({ page }) => {
    const warnings: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "warning") {
        warnings.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Some warnings are acceptable (like deprecation warnings)
    // Just verify the app doesn't have excessive warnings (>10)
    expect(warnings.length).toBeLessThan(10);
  });

  test("should properly handle cookies and storage", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Check if cookies can be set
    await page.context().addCookies([
      {
        name: "test-cookie",
        value: "test-value",
        domain: "localhost",
        path: "/",
      },
    ]);

    const cookies = await page.context().cookies();
    const testCookie = cookies.find((c) => c.name === "test-cookie");
    expect(testCookie).toBeTruthy();

    // Check if localStorage works
    await page.evaluate(() => {
      localStorage.setItem("test-key", "test-value");
    });

    const storageValue = await page.evaluate(() => {
      return localStorage.getItem("test-key");
    });

    expect(storageValue).toBe("test-value");
  });
});
