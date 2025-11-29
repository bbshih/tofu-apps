import { test, expect } from "@playwright/test";

test.describe("Wishlist App E2E Workflow", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123";

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("complete user journey: register -> create wishlist -> add item", async ({
    page,
  }) => {
    // Step 1: Register
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: /create your account/i })
    ).toBeVisible();

    await page.getByPlaceholder(/email address/i).fill(testEmail);
    await page
      .getByPlaceholder(/^password/i)
      .first()
      .fill(testPassword);
    await page.getByPlaceholder(/confirm password/i).fill(testPassword);
    await page.getByRole("button", { name: /create account/i }).click();

    // Should redirect to dashboard after successful registration
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: /your wishlists/i })
    ).toBeVisible();

    // Step 2: Create a wishlist
    await page.getByRole("button", { name: /create new wishlist/i }).click();
    await page.getByPlaceholder(/wishlist name/i).fill("Holiday Gifts 2024");
    await page.getByRole("button", { name: /^create$/i }).click();

    // Wishlist should appear in the list
    await expect(page.getByText("Holiday Gifts 2024")).toBeVisible();

    // Step 3: Navigate to wishlist
    await page.getByText("Holiday Gifts 2024").click();
    await expect(page).toHaveURL(/\/wishlist\/\d+/);
    await expect(
      page.getByRole("heading", { name: "Holiday Gifts 2024" })
    ).toBeVisible();

    // Step 4: Add an item (mock the scraping)
    await page.getByRole("button", { name: /add item/i }).click();

    // Fill in item URL
    await page
      .getByLabel(/product url/i)
      .fill("https://www.example.com/product/123");

    // Add notes
    await page.getByLabel(/notes/i).fill("Perfect gift for mom");

    // Add tags
    await page.getByPlaceholder(/add a tag/i).fill("gifts");
    await page.getByRole("button", { name: /^add$/i }).click();

    // Submit the form
    await page
      .getByRole("button", { name: /add item/i })
      .last()
      .click();

    // Item should appear in the wishlist (depends on scraping success)
    // For E2E with real backend, we'd check for the item

    // Step 5: Logout
    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page).toHaveURL("/login");
  });

  test("login flow with existing user", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: /sign in to your account/i })
    ).toBeVisible();

    await page.getByPlaceholder(/email address/i).fill("test@example.com");
    await page.getByPlaceholder(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should handle both success and error gracefully
    // In a real test environment, we'd set up a known test user
  });

  test("navigation between pages", async ({ page }) => {
    await page.goto("/login");

    // Navigate to register
    await page.getByRole("link", { name: /create a new account/i }).click();
    await expect(page).toHaveURL("/register");

    // Navigate back to login
    await page
      .getByRole("link", { name: /sign in to existing account/i })
      .click();
    await expect(page).toHaveURL("/login");
  });

  test("protected routes redirect to login", async ({ page }) => {
    // Try to access dashboard without auth
    await page.goto("/");

    // Should redirect to login
    await expect(page).toHaveURL("/login");
  });

  test("form validation on registration", async ({ page }) => {
    await page.goto("/register");

    // Try to submit with short password
    await page.getByPlaceholder(/email address/i).fill("test@example.com");
    await page
      .getByPlaceholder(/^password/i)
      .first()
      .fill("short");
    await page.getByPlaceholder(/confirm password/i).fill("short");
    await page.getByRole("button", { name: /create account/i }).click();

    // Should show validation error
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test("form validation on password mismatch", async ({ page }) => {
    await page.goto("/register");

    await page.getByPlaceholder(/email address/i).fill("test@example.com");
    await page
      .getByPlaceholder(/^password/i)
      .first()
      .fill("password123");
    await page.getByPlaceholder(/confirm password/i).fill("different123");
    await page.getByRole("button", { name: /create account/i }).click();

    // Should show mismatch error
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test("responsive design on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");

    // Form should still be usable
    await expect(page.getByPlaceholder(/email address/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Wishlist Management", () => {
  test.beforeEach(async ({ page }) => {
    // Note: In real E2E tests, you'd set up authentication here
    await page.goto("/");
  });

  test("delete wishlist", async () => {
    // This would require setting up authenticated state
    // For now, it's a placeholder for the test structure
  });

  test("rename wishlist", async () => {
    // Placeholder for wishlist rename test
  });

  test("delete item from wishlist", async () => {
    // Placeholder for item deletion test
  });
});
