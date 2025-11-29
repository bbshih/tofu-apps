import { test, expect } from '@playwright/test';

/**
 * Complete E2E flow test for SeaCalendar
 * Tests the entire workflow from event creation to calendar download
 *
 * This test uses route interception to mock GitHub Gist API calls
 */

// Mock event data
const mockEventId = 'test-event-123';
const mockGistId = 'abc123def456';
const mockEncryptionKey = 'mock-encryption-key-xyz';
const mockOrganizerKey = btoa(mockEventId).substring(0, 8);

// Mock Gist response
const createMockGist = (eventData: any) => ({
  id: mockGistId,
  files: {
    'seacalendar-event.enc': {
      content: JSON.stringify(eventData), // In real app this would be encrypted
    },
  },
  description: `SeaCalendar Event: ${eventData.title}`,
  public: false,
});

test.describe('SeaCalendar Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up a mock GitHub token in localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('seacalendar_github_token', 'mock-token-for-testing');
    });
  });

  test('complete event lifecycle: create → vote → finalize → download', async ({ page }) => {
    let mockEvent: any = null;

    // Step 1: Navigate to create page
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /SeaCalendar/i })).toBeVisible();

    // Click create event button
    await page.click('text=Create Event');
    await expect(page).toHaveURL(/#\/create/);

    // Step 2: Fill out event creation form
    await page.fill('input[placeholder*="Q1"]', 'Q1 2025 Hangout');
    await page.fill('input[placeholder*="Your name"]', 'Alice');

    // Add date options using the date selector
    // Add Jan 10, 2025
    await page.click('text=Add Date');
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2025-01-10');

    // Add Jan 17, 2025
    await page.click('text=Add Date');
    await dateInputs.nth(1).fill('2025-01-17');

    // Mock the GitHub Gist creation API call
    await page.route('https://api.github.com/gists', async (route) => {
      const _requestData = JSON.parse(route.request().postData() || '{}');

      // Extract event data from the request
      // In real app, this would be encrypted, but we'll parse it for testing
      mockEvent = {
        id: mockEventId,
        title: 'Q1 2025 Hangout',
        organizer: 'Alice',
        dateOptions: [
          { id: 'date-0', date: '2025-01-10', label: 'Fri Jan 10' },
          { id: 'date-1', date: '2025-01-17', label: 'Fri Jan 17' },
        ],
        votes: [],
        createdAt: new Date().toISOString(),
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockGist(mockEvent)),
      });
    });

    // Submit the event creation form
    await page.click('button:has-text("Create Poll")');

    // Wait for the links modal to appear
    await expect(page.locator('text=Voting Link')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Results Link')).toBeVisible();

    // Get the voting URL
    const votingLinkInput = page.locator('input[readonly]').first();
    const votingUrl = await votingLinkInput.inputValue();
    expect(votingUrl).toContain('vote');
    expect(votingUrl).toContain('gist=');

    // Step 3: Navigate to voting page
    // Mock the GET gist API call
    await page.route(`https://api.github.com/gists/${mockGistId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockGist(mockEvent)),
      });
    });

    await page.goto(`/#/vote?gist=${mockGistId}&key=${encodeURIComponent(mockEncryptionKey)}`);

    // Wait for page to load
    await expect(page.getByText('Q1 2025 Hangout')).toBeVisible({ timeout: 10000 });

    // Step 4: Submit first vote (Bob)
    await page.fill('input[placeholder*="name"]', 'Bob');

    // Select Jan 10
    await page.click('text=Fri Jan 10');

    // Mock the PATCH gist API call for voting
    await page.route(`https://api.github.com/gists/${mockGistId}`, async (route) => {
      if (route.request().method() === 'PATCH') {
        // Add Bob's vote
        mockEvent.votes.push({
          voterName: 'Bob',
          selectedDates: ['date-0'],
          timestamp: new Date().toISOString(),
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createMockGist(mockEvent)),
        });
      } else {
        // GET request
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createMockGist(mockEvent)),
        });
      }
    });

    await page.click('button:has-text("Submit Vote")');

    // Wait for success message
    await expect(page.getByText(/vote submitted/i)).toBeVisible({ timeout: 10000 });

    // Step 5: Submit second vote (Carol)
    await page.reload();
    await page.fill('input[placeholder*="name"]', 'Carol');
    await page.click('text=Fri Jan 10');
    await page.click('text=Fri Jan 17');

    // Update mock to include Carol's vote
    await page.route(`https://api.github.com/gists/${mockGistId}`, async (route) => {
      if (route.request().method() === 'PATCH') {
        mockEvent.votes.push({
          voterName: 'Carol',
          selectedDates: ['date-0', 'date-1'],
          timestamp: new Date().toISOString(),
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createMockGist(mockEvent)),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createMockGist(mockEvent)),
        });
      }
    });

    await page.click('button:has-text("Submit Vote")');
    await expect(page.getByText(/vote submitted/i)).toBeVisible({ timeout: 10000 });

    // Step 6: View results as organizer
    await page.goto(`/#/results?gist=${mockGistId}&key=${encodeURIComponent(mockEncryptionKey)}&org=${mockOrganizerKey}`);

    await expect(page.getByText('Q1 2025 Hangout - Results')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('2 people have voted')).toBeVisible();

    // Check vote tallies
    await expect(page.getByText('Fri Jan 10')).toBeVisible();
    await expect(page.getByText('2 votes')).toBeVisible();
    await expect(page.getByText('Bob')).toBeVisible();
    await expect(page.getByText('Carol')).toBeVisible();

    // Step 7: Select winning date (Jan 10)
    const selectButtons = page.locator('button:has-text("Select This Date")');
    await expect(selectButtons.first()).toBeVisible();
    await selectButtons.first().click();

    // Should navigate to venue selection
    await expect(page).toHaveURL(/\/venue/);
    await expect(page.getByText('Chart Your Course')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Planning for Fri Jan 10')).toBeVisible();

    // Step 8: Fill out venue details
    await page.fill('input[label*="Venue Name"]', "The Ocean's Table");
    await page.fill('input[label*="Address"]', '123 Seaside Ave, Beach City, CA 90210');
    await page.fill('input[label*="Time"]', '7:00 PM');
    await page.fill('input[label*="Website URL"]', 'https://oceanstable.com');
    await page.fill('input[label*="Menu URL"]', 'https://oceanstable.com/menu');
    await page.fill('textarea[placeholder*="special instructions"]', 'Casual upscale dress code');

    // Mock the finalization API call
    await page.route(`https://api.github.com/gists/${mockGistId}`, async (route) => {
      if (route.request().method() === 'PATCH') {
        mockEvent.finalizedEvent = {
          selectedDateId: 'date-0',
          venue: {
            name: "The Ocean's Table",
            address: '123 Seaside Ave, Beach City, CA 90210',
            time: '7:00 PM',
            websiteUrl: 'https://oceanstable.com',
            menuUrl: 'https://oceanstable.com/menu',
            notes: 'Casual upscale dress code',
          },
          attendees: ['Bob', 'Carol'],
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createMockGist(mockEvent)),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createMockGist(mockEvent)),
        });
      }
    });

    await page.click('button:has-text("Finalize Event")');

    // Step 9: View event summary
    await expect(page).toHaveURL(/\/event/, { timeout: 10000 });
    await expect(page.getByText('Your Crew is Ready to Set Sail!')).toBeVisible();
    await expect(page.getByText('Q1 2025 Hangout')).toBeVisible();
    await expect(page.getByText("The Ocean's Table")).toBeVisible();
    await expect(page.getByText('123 Seaside Ave')).toBeVisible();
    await expect(page.getByText('Fri Jan 10 at 7:00 PM')).toBeVisible();

    // Check attendees are displayed
    await expect(page.getByText('Attendees (2)')).toBeVisible();
    await expect(page.getByText('Bob')).toBeVisible();
    await expect(page.getByText('Carol')).toBeVisible();

    // Step 10: Test calendar download button exists
    const downloadButton = page.locator('button:has-text("Download Calendar File")');
    await expect(downloadButton).toBeVisible();

    // Step 11: Test share options
    await expect(page.getByText('Share Event')).toBeVisible();
    await expect(page.locator('button:has-text("Open Email Template")')).toBeVisible();

    // Test event link is displayed
    const eventLinkInput = page.locator('input[readonly]').first();
    const eventUrl = await eventLinkInput.inputValue();
    expect(eventUrl).toContain('event');
    expect(eventUrl).toContain('gist=');
  });
});
