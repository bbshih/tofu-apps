import { test, expect } from '@playwright/test';

/**
 * Landing page E2E tests
 */

test.describe('Landing Page', () => {
  test('should display welcome content and navigation', async ({ page }) => {
    await page.goto('/');

    // Check main heading
    await expect(page.getByRole('heading', { name: /SeaCalendar/i })).toBeVisible();

    // Check for ocean theme elements
    await expect(page.locator('body')).toHaveClass(/bg-/); // Should have background color

    // Check for create event button/link
    const createButton = page.locator('a:has-text("Create Event"), button:has-text("Create Event")').first();
    await expect(createButton).toBeVisible();

    // Click create event and verify navigation
    await createButton.click();
    await expect(page).toHaveURL(/#\/create/);
  });

  test('should have ocean theme styling', async ({ page }) => {
    await page.goto('/');

    // Check for ocean-themed classes (these come from Tailwind ocean-* colors)
    const hasOceanTheme = await page.evaluate(() => {
      const html = document.documentElement.innerHTML;
      return html.includes('ocean-') || html.includes('coral-') || html.includes('seaweed-');
    });

    expect(hasOceanTheme).toBe(true);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should still be visible and functional
    await expect(page.getByRole('heading', { name: /SeaCalendar/i })).toBeVisible();

    const createButton = page.locator('a:has-text("Create Event"), button:has-text("Create Event")').first();
    await expect(createButton).toBeVisible();
  });
});
