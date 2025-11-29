import { test, expect } from '@playwright/test';
import { registerUser, resetDatabase } from './helpers';

/**
 * Authentication Flow E2E Tests
 * Tests user authentication with real API backend
 */

test.describe('Authentication Flow E2E', () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test('user can register and login', async ({ page }) => {
    const timestamp = Date.now();
    const email = `user${timestamp}@example.com`;
    const password = 'SecurePass123!';

    // Navigate to app
    await page.goto('/');

    // Click register/login button
    await page.click('text=Sign In');

    // Fill registration form
    await page.fill('input[name="username"]', `user${timestamp}`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button:has-text("Register")');

    // Should be logged in and see dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });

    // Verify user menu shows username
    await expect(page.locator('text=user')).toBeVisible();
  });

  test('user can logout and login again', async ({ page }) => {
    // Register user via API
    const { credentials } = await registerUser(page);

    // Navigate and login
    await page.goto('/');
    await page.click('text=Sign In');
    await page.fill('input[name="email"]', credentials.email);
    await page.fill('input[name="password"]', credentials.password);
    await page.click('button:has-text("Login")');

    // Should be logged in
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });

    // Logout
    await page.click('[aria-label="User menu"]');
    await page.click('text=Logout');

    // Should be back to landing page
    await expect(page.locator('text=Sign In')).toBeVisible();
  });

  test('login fails with wrong password', async ({ page }) => {
    const { credentials } = await registerUser(page);

    await page.goto('/');
    await page.click('text=Sign In');
    await page.fill('input[name="email"]', credentials.email);
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('button:has-text("Login")');

    // Should show error
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('registration fails with weak password', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Sign In');

    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123'); // Weak password
    await page.click('button:has-text("Register")');

    // Should show error
    await expect(page.locator('text=Password must be')).toBeVisible();
  });
});
