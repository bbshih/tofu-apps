/**
 * Discord OAuth Service
 * Handles Discord OAuth2 flow and user data fetching
 */

import { Config } from '../config.js';
import { ErrorFactory } from '../middleware/errorHandler.js';
import { logger } from '../middleware/logger.js';

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  verified?: boolean;
}

/**
 * Exchange OAuth code for access token
 */
export const exchangeCodeForToken = async (code: string): Promise<DiscordTokenResponse> => {
  try {
    const params = new URLSearchParams({
      client_id: Config.discord.clientId,
      client_secret: Config.discord.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: Config.discord.redirectUri,
    });

    const response = await fetch(Config.discord.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('Discord token exchange failed', { error });
      throw ErrorFactory.unauthorized('Failed to exchange Discord code for token');
    }

    const data = (await response.json()) as DiscordTokenResponse;
    return data;
  } catch (_error) {
    logger.error('Discord OAuth _error', { _error });
    throw ErrorFactory.internal('Discord OAuth failed');
  }
};

/**
 * Fetch Discord user profile using access token
 */
export const fetchDiscordUser = async (accessToken: string): Promise<DiscordUser> => {
  try {
    const response = await fetch(Config.discord.userUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const _error = await response.json();
      logger.error('Discord user fetch failed', { _error });
      throw ErrorFactory.unauthorized('Failed to fetch Discord user');
    }

    const user = (await response.json()) as DiscordUser;
    return user;
  } catch (_error) {
    logger.error('Discord user fetch _error', { _error });
    throw ErrorFactory.internal('Failed to fetch Discord user');
  }
};

/**
 * Refresh Discord access token
 */
export const refreshDiscordToken = async (refreshToken: string): Promise<DiscordTokenResponse> => {
  try {
    const params = new URLSearchParams({
      client_id: Config.discord.clientId,
      client_secret: Config.discord.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch(Config.discord.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const _error = await response.json();
      logger.error('Discord token refresh failed', { _error });
      throw ErrorFactory.unauthorized('Failed to refresh Discord token');
    }

    const data = (await response.json()) as DiscordTokenResponse;
    return data;
  } catch (_error) {
    logger.error('Discord token refresh _error', { _error });
    throw ErrorFactory.internal('Discord token refresh failed');
  }
};

/**
 * Build Discord OAuth authorization URL
 */
export const getAuthorizationUrl = (state?: string): string => {
  const params = new URLSearchParams({
    client_id: Config.discord.clientId,
    redirect_uri: Config.discord.redirectUri,
    response_type: 'code',
    scope: Config.discord.scopes.join(' '),
  });

  if (state) {
    params.append('state', state);
  }

  return `${Config.discord.authUrl}?${params.toString()}`;
};

/**
 * Post event announcement to Discord channel
 */
export interface EventAnnouncementData {
  pollId: string;
  title: string;
  description?: string;
  optionsCount: number;
  votingDeadline?: Date;
  creatorDiscordId: string;
}

export const postEventToDiscord = async (
  channelId: string,
  eventData: EventAnnouncementData
): Promise<void> => {
  if (!Config.discord.botToken) {
    logger.warn('Discord bot token not configured, skipping Discord announcement');
    return;
  }

  try {
    const votingUrl = `${Config.webAppUrl}/vote/${eventData.pollId}`;
    const resultsUrl = `${Config.webAppUrl}/results/${eventData.pollId}`;

    // Create Discord embed
    const embed = {
      type: 'rich',
      color: 0x10b981, // Success green
      title: '✅ Event Created!',
      description: `**${eventData.title}**${eventData.description ? `\n\n${eventData.description}` : ''}`,
      fields: [
        {
          name: '🔗 Voting Link',
          value: votingUrl,
          inline: false,
        },
        {
          name: '📊 Status',
          value: 'Open for voting',
          inline: true,
        },
        {
          name: '📅 Options',
          value: `${eventData.optionsCount} dates`,
          inline: true,
        },
        {
          name: '⏰ Deadline',
          value: eventData.votingDeadline
            ? `<t:${Math.floor(eventData.votingDeadline.getTime() / 1000)}:R>`
            : 'No deadline',
          inline: true,
        },
        {
          name: '🗳️ How to Vote',
          value: `• Click the button below to vote\n• Select when you're available`,
          inline: false,
        },
      ],
    };

    // Create action buttons
    const components = [
      {
        type: 1, // Action row
        components: [
          {
            type: 2, // Button
            style: 5, // Link button
            label: '🗳️ Vote Now',
            url: votingUrl,
          },
          {
            type: 2, // Button
            style: 5, // Link button
            label: '📊 View Results',
            url: resultsUrl,
          },
        ],
      },
    ];

    // Post message to Discord
    const response = await fetch(`${Config.discord.apiUrl}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${Config.discord.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: `<@${eventData.creatorDiscordId}> created an event!`,
        embeds: [embed],
        components,
      }),
    });

    if (!response.ok) {
      const _error = await response.json();
      logger.error('Discord message post failed', { _error, channelId });
      throw ErrorFactory.internal('Failed to post event to Discord');
    }

    logger.info('Event posted to Discord', {
      pollId: eventData.pollId,
      channelId,
    });
  } catch (_error) {
    logger.error('Discord event posting _error', {
      _error,
      pollId: eventData.pollId,
    });
    // Don't throw - posting to Discord is optional and shouldn't fail the API request
  }
};
