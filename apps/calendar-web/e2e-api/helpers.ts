/**
 * E2E Test Helpers
 * Utilities for testing with real API backend
 */

import { Page } from '@playwright/test';

/**
 * Register a new user and return auth credentials
 */
export async function registerUser(page: Page, userSuffix: string = '') {
  const timestamp = Date.now();
  const username = `testuser${timestamp}${userSuffix}`;
  const email = `testuser${timestamp}${userSuffix}@example.com`;
  const password = 'SecurePass123!';

  const response = await page.request.post('http://localhost:3002/api/auth/local/register', {
    data: { username, email, password },
  });

  const data = await response.json();
  return {
    user: data.user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    credentials: { email, password },
  };
}

/**
 * Login user and set auth token in localStorage
 */
export async function loginUser(page: Page, email: string, password: string) {
  const response = await page.request.post('http://localhost:3002/api/auth/local/login', {
    data: { email, password },
  });

  const data = await response.json();

  // Set token in localStorage
  await page.evaluate((token) => {
    localStorage.setItem('seacalendar_access_token', token);
  }, data.accessToken);

  return data;
}

/**
 * Create a poll via API
 */
export async function createPoll(
  page: Page,
  accessToken: string,
  pollData: {
    title: string;
    description?: string;
    options: Array<{
      label: string;
      date: string;
      timeStart: string;
      timeEnd: string;
    }>;
  }
) {
  const response = await page.request.post('http://localhost:3002/api/polls', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    data: {
      ...pollData,
      guildId: 'test-guild',
      channelId: 'test-channel',
    },
  });

  return await response.json();
}

/**
 * Submit votes for a poll
 */
export async function submitVotes(
  page: Page,
  accessToken: string,
  pollId: string,
  votes: Array<{
    optionId: string;
    availability: 'AVAILABLE' | 'MAYBE';
  }>
) {
  const response = await page.request.post(
    `http://localhost:3002/api/polls/${pollId}/vote`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: { votes },
    }
  );

  return await response.json();
}

/**
 * Wait for element with custom timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options?: { timeout?: number }
) {
  return await page.waitForSelector(selector, {
    timeout: options?.timeout || 10000,
  });
}

/**
 * Reset test database via API
 */
export async function resetDatabase() {
  const { resetTestDatabase } = await import('@seacalendar/database');
  await resetTestDatabase();
}
