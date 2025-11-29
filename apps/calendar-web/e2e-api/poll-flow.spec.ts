import { test, expect } from '@playwright/test';
import { registerUser, createPoll, resetDatabase } from './helpers';

/**
 * Poll Flow E2E Tests
 * Tests complete poll lifecycle with real API backend
 */

test.describe('Poll Flow E2E', () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test('user can create, vote, and view poll results', async ({ page }) => {
    // Setup: Register two users
    const organizer = await registerUser(page, '-organizer');
    const voter = await registerUser(page, '-voter');

    // Step 1: Organizer creates poll
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('seacalendar_access_token', token);
    }, organizer.accessToken);
    await page.reload();

    // Navigate to create poll
    await page.click('text=Create Poll');

    // Fill poll details
    await page.fill('input[name="title"]', 'Team Lunch');
    await page.fill('textarea[name="description"]', 'Where should we eat?');

    // Add date options
    await page.click('button:has-text("Add Date Option")');
    await page.fill('input[name="options[0].label"]', 'Friday 12pm');
    await page.fill('input[name="options[0].date"]', '2025-12-01');
    await page.fill('input[name="options[0].timeStart"]', '12:00');
    await page.fill('input[name="options[0].timeEnd"]', '14:00');

    await page.click('button:has-text("Add Date Option")');
    await page.fill('input[name="options[1].label"]', 'Saturday 1pm');
    await page.fill('input[name="options[1].date"]', '2025-12-02');
    await page.fill('input[name="options[1].timeStart"]', '13:00');
    await page.fill('input[name="options[1].timeEnd"]', '15:00');

    // Submit poll
    await page.click('button:has-text("Create Poll")');

    // Should see success message
    await expect(page.locator('text=Poll created successfully')).toBeVisible({
      timeout: 10000,
    });

    // Get poll URL from page
    const pollUrl = await page.url();
    const pollId = pollUrl.split('/').pop();

    // Step 2: Voter logs in and votes
    await page.evaluate((token) => {
      localStorage.setItem('seacalendar_access_token', token);
    }, voter.accessToken);
    await page.goto(`/polls/${pollId}`);

    // Select vote options
    await page.click('text=Friday 12pm');
    await page.click('text=Saturday 1pm');

    // Submit vote
    await page.click('button:has-text("Submit Vote")');

    // Should see confirmation
    await expect(page.locator('text=Vote submitted')).toBeVisible({ timeout: 10000 });

    // Step 3: View results
    await page.goto(`/polls/${pollId}/results`);

    // Should see vote tallies
    await expect(page.locator('text=Friday 12pm')).toBeVisible();
    await expect(page.locator('text=1 vote')).toBeVisible();
    await expect(page.locator('text=Saturday 1pm')).toBeVisible();
  });

  test('user can update their vote', async ({ page }) => {
    // Register user
    const user = await registerUser(page);

    // Create poll via API
    const poll = await createPoll(page, user.accessToken, {
      title: 'Test Poll',
      options: [
        {
          label: 'Option 1',
          date: '2025-12-01',
          timeStart: '12:00',
          timeEnd: '14:00',
        },
        {
          label: 'Option 2',
          date: '2025-12-02',
          timeStart: '12:00',
          timeEnd: '14:00',
        },
      ],
    });

    // Navigate to poll
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('seacalendar_access_token', token);
    }, user.accessToken);
    await page.goto(`/polls/${poll.id}`);

    // First vote
    await page.click('text=Option 1');
    await page.click('button:has-text("Submit Vote")');
    await expect(page.locator('text=Vote submitted')).toBeVisible();

    // Update vote
    await page.reload();
    await page.click('text=Option 2'); // Add second option
    await page.click('button:has-text("Update Vote")');

    // Should see update confirmation
    await expect(page.locator('text=Vote updated')).toBeVisible();

    // Verify in results
    await page.goto(`/polls/${poll.id}/results`);
    await expect(page.locator('text=Option 1')).toBeVisible();
    await expect(page.locator('text=Option 2')).toBeVisible();
  });

  test('poll creator can close poll', async ({ page }) => {
    // Register user and create poll
    const user = await registerUser(page);
    const poll = await createPoll(page, user.accessToken, {
      title: 'Test Poll',
      options: [
        {
          label: 'Option 1',
          date: '2025-12-01',
          timeStart: '12:00',
          timeEnd: '14:00',
        },
      ],
    });

    // Navigate to poll
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('seacalendar_access_token', token);
    }, user.accessToken);
    await page.goto(`/polls/${poll.id}`);

    // Close poll
    await page.click('button:has-text("Close Poll")');
    await page.click('button:has-text("Confirm")'); // Confirmation dialog

    // Should see closed status
    await expect(page.locator('text=Poll Closed')).toBeVisible({ timeout: 10000 });

    // Voting should be disabled
    await expect(page.locator('button:has-text("Submit Vote")')).toBeDisabled();
  });
});
