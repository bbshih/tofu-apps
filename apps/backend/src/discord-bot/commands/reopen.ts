/**
 * /reopen command
 * Reopen a finalized or cancelled event for more voting
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getPollWithDetails, generateVotingUrl } from '../services/pollService.js';
import { prisma } from '../../calendar/prisma.js';
import { Config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('reopen')
  .setDescription('Reopen a closed event for more voting')
  .addStringOption((option) =>
    option.setName('event').setDescription('Event URL or ID to reopen').setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('days')
      .setDescription('Number of days to extend voting deadline (default: 7)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(60)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString('event', true);
  const extensionDays = interaction.options.getInteger('days') || 7;

  await interaction.deferReply();

  try {
    // Extract poll ID from URL or use as-is
    let pollId = input.trim();

    if (input.includes('/')) {
      const match = input.match(/\/(?:vote|results|event)\/([a-zA-Z0-9-]+)/);
      if (match) {
        pollId = match[1];
      }
    }

    // Get poll details
    const poll = await getPollWithDetails(pollId);

    if (!poll) {
      await interaction.editReply({
        content: '❌ Event not found. Please check the URL or ID.',
      });
      return;
    }

    // Check if user is the creator
    if (poll.creator.discordId !== interaction.user.id) {
      await interaction.editReply({
        content: '❌ Only the event creator can reopen it.',
      });
      return;
    }

    // Check if poll is already open
    if (poll.status === 'VOTING') {
      await interaction.editReply({
        content: '✅ This event is already open for voting!',
      });
      return;
    }

    // Calculate new deadline
    const newDeadline = new Date(Date.now() + extensionDays * 24 * 60 * 60 * 1000);

    // Reopen the poll
    await prisma.poll.update({
      where: { id: poll.id },
      data: {
        status: 'VOTING',
        votingDeadline: newDeadline,
        closedAt: null,
        finalizedOptionId: null, // Clear finalized option if any
      },
    });

    // Create success embed
    const embed = new EmbedBuilder()
      .setColor(0x10b981) // Success green
      .setTitle('🔓 Event Reopened!')
      .setDescription(`**${poll.title}**`)
      .addFields(
        { name: '🎯 Status', value: '🟢 Open for voting', inline: false },
        {
          name: '⏰ New Deadline',
          value: `<t:${Math.floor(newDeadline.getTime() / 1000)}:R>`,
          inline: true,
        },
        { name: '📅 Options', value: `${poll.options.length} dates`, inline: true }
      )
      .setFooter({ text: 'Votes from before remain saved' });

    // Create action buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('🗳️ Vote Now')
        .setStyle(ButtonStyle.Link)
        .setURL(generateVotingUrl(poll.id)),
      new ButtonBuilder()
        .setLabel('📊 View Results')
        .setStyle(ButtonStyle.Link)
        .setURL(`${Config.webAppUrl}/results/${poll.id}`)
    );

    await interaction.editReply({
      content: `<@${interaction.user.id}> reopened voting for this event!`,
      embeds: [embed],
      components: [buttons],
    });
  } catch (_error) {
    console.error('Error in /reopen command:', _error);
    await interaction.editReply({
      content:
        '❌ **Error reopening event:**\n' +
        (_error instanceof Error ? _error.message : 'Unknown _error occurred'),
    });
  }
}
