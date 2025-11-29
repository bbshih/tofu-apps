import { test, expect } from '@playwright/test';

/**
 * Error scenarios and edge cases E2E tests
 */

test.describe('Error Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Set up a mock GitHub token
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('seacalendar_github_token', 'mock-token');
    });
  });

  test('should show error when accessing results without organizer key', async ({ page }) => {
    const mockGistId = 'test-gist-123';
    const mockEncryptionKey = 'test-key';

    // Mock the API response
    await page.route(`https://api.github.com/gists/${mockGistId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockGistId,
          files: {
            'seacalendar-event.enc': {
              content: JSON.stringify({
                id: 'event-123',
                title: 'Test Event',
                organizer: 'Alice',
                dateOptions: [],
                votes: [],
                createdAt: new Date().toISOString(),
              }),
            },
          },
        }),
      });
    });

    // Navigate to results without organizer key
    await page.goto(`/#/results?gist=${mockGistId}&key=${encodeURIComponent(mockEncryptionKey)}`);

    // Should show error message
    await expect(page.getByText(/organizer link/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show error when event not found (404)', async ({ page }) => {
    const mockGistId = 'non-existent-gist';
    const mockEncryptionKey = 'test-key';

    // Mock 404 response
    await page.route(`https://api.github.com/gists/${mockGistId}`, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Not Found',
        }),
      });
    });

    await page.goto(`/#/vote?gist=${mockGistId}&key=${encodeURIComponent(mockEncryptionKey)}`);

    // Should show error message
    await expect(page.getByText(/not found|deleted/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle empty event (no dates)', async ({ page }) => {
    await page.goto('/#/create');

    await page.fill('input[placeholder*="Q1"]', 'Empty Event');
    await page.fill('input[placeholder*="Your name"]', 'Alice');

    // Try to create event without adding any dates
    // The button should be disabled or show validation error
    const createButton = page.locator('button:has-text("Create Poll"), button:has-text("Create Event")').first();

    // Check if button is disabled or shows error after click
    const isDisabled = await createButton.isDisabled();
    if (!isDisabled) {
      await createButton.click();
      // Should show validation message
      await expect(page.getByText(/at least.*date/i)).toBeVisible({ timeout: 2000 });
    } else {
      expect(isDisabled).toBe(true);
    }
  });

  test('should handle voting without entering name', async ({ page }) => {
    const mockGistId = 'test-gist-456';
    const mockEncryptionKey = 'test-key';

    await page.route(`https://api.github.com/gists/${mockGistId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockGistId,
          files: {
            'seacalendar-event.enc': {
              content: JSON.stringify({
                id: 'event-456',
                title: 'Test Event',
                organizer: 'Alice',
                dateOptions: [
                  { id: 'date-1', date: '2025-01-10', label: 'Fri Jan 10' },
                ],
                votes: [],
                createdAt: new Date().toISOString(),
              }),
            },
          },
        }),
      });
    });

    await page.goto(`/#/vote?gist=${mockGistId}&key=${encodeURIComponent(mockEncryptionKey)}`);

    await expect(page.getByText('Test Event')).toBeVisible({ timeout: 5000 });

    // Try to select a date without entering name
    await page.click('text=Fri Jan 10');

    // Submit button should be disabled or show error
    const submitButton = page.locator('button:has-text("Submit Vote")');
    const isDisabled = await submitButton.isDisabled();

    if (!isDisabled) {
      await submitButton.click();
      // Should show validation message
      await expect(page.getByText(/enter.*name/i)).toBeVisible({ timeout: 2000 });
    } else {
      expect(isDisabled).toBe(true);
    }
  });

  test('should show message when no votes exist in results', async ({ page }) => {
    const mockGistId = 'test-gist-789';
    const mockEncryptionKey = 'test-key';
    const mockEventId = 'event-789';
    const mockOrganizerKey = btoa(mockEventId).substring(0, 8);

    await page.route(`https://api.github.com/gists/${mockGistId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockGistId,
          files: {
            'seacalendar-event.enc': {
              content: JSON.stringify({
                id: mockEventId,
                title: 'Empty Event',
                organizer: 'Alice',
                dateOptions: [
                  { id: 'date-1', date: '2025-01-10', label: 'Fri Jan 10' },
                ],
                votes: [], // No votes
                createdAt: new Date().toISOString(),
              }),
            },
          },
        }),
      });
    });

    await page.goto(`/#/results?gist=${mockGistId}&key=${encodeURIComponent(mockEncryptionKey)}&org=${mockOrganizerKey}`);

    await expect(page.getByText('Empty Event')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/no votes/i)).toBeVisible();
    await expect(page.getByText('0 people have voted')).toBeVisible();
  });

  test('should handle venue selection without finalizing', async ({ page }) => {
    const mockGistId = 'test-gist-venue';
    const mockEncryptionKey = 'test-key';
    const mockEventId = 'event-venue';
    const mockOrganizerKey = btoa(mockEventId).substring(0, 8);

    await page.route(`https://api.github.com/gists/${mockGistId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockGistId,
          files: {
            'seacalendar-event.enc': {
              content: JSON.stringify({
                id: mockEventId,
                title: 'Test Event',
                organizer: 'Alice',
                dateOptions: [
                  { id: 'date-1', date: '2025-01-10', label: 'Fri Jan 10' },
                ],
                votes: [
                  { voterName: 'Bob', selectedDates: ['date-1'], timestamp: new Date().toISOString() },
                ],
                createdAt: new Date().toISOString(),
              }),
            },
          },
        }),
      });
    });

    await page.goto(`/#/venue?gist=${mockGistId}&key=${encodeURIComponent(mockEncryptionKey)}&org=${mockOrganizerKey}&dateId=date-1`);

    await expect(page.getByText('Chart Your Course')).toBeVisible({ timeout: 5000 });

    // Try to finalize without filling required fields
    const finalizeButton = page.locator('button:has-text("Finalize Event")');

    await finalizeButton.click();

    // Should show validation errors
    await expect(page.getByText(/required/i)).toBeVisible({ timeout: 2000 });
  });

  test('should show error when accessing non-finalized event summary', async ({ page }) => {
    const mockGistId = 'test-gist-summary';
    const mockEncryptionKey = 'test-key';

    await page.route(`https://api.github.com/gists/${mockGistId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockGistId,
          files: {
            'seacalendar-event.enc': {
              content: JSON.stringify({
                id: 'event-summary',
                title: 'Incomplete Event',
                organizer: 'Alice',
                dateOptions: [
                  { id: 'date-1', date: '2025-01-10', label: 'Fri Jan 10' },
                ],
                votes: [],
                createdAt: new Date().toISOString(),
                // No finalizedEvent
              }),
            },
          },
        }),
      });
    });

    await page.goto(`/#/event?gist=${mockGistId}&key=${encodeURIComponent(mockEncryptionKey)}`);

    // Should show error that event is not finalized
    await expect(page.getByText(/not finalized/i)).toBeVisible({ timeout: 5000 });
  });
});
