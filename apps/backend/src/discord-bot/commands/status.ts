/**
 * /status command
 * Show vote progress for an event
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
import { prisma } from '../../seacalendar/prisma.js';
import { Config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Check the status and vote count for an event')
  .addStringOption((option) =>
    option.setName('event_url').setDescription('The event/poll URL or ID').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString('event_url', true);

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

    // Check if poll is in this guild
    if (poll.guildId !== interaction.guildId) {
      await interaction.editReply({
        content: '❌ This event is from a different server.',
      });
      return;
    }

    // Get vote counts
    const votes = await prisma.vote.findMany({
      where: { pollId: poll.id },
      include: { voter: true },
    });

    const totalVoters = new Set(votes.map((v) => v.voterId)).size;

    // Calculate votes per option
    const voteCounts = new Map<string, number>();
    for (const vote of votes) {
      const available = vote.availableOptionIds as string[];
      for (const optionId of available) {
        voteCounts.set(optionId, (voteCounts.get(optionId) || 0) + 1);
      }
    }

    // Sort options by vote count
    const sortedOptions = poll.options
      .map((opt) => ({
        ...opt,
        votes: voteCounts.get(opt.id) || 0,
      }))
      .sort((a, b) => b.votes - a.votes);

    // Create status embed
    const embed = new EmbedBuilder()
      .setColor(poll.status === 'VOTING' ? 0x0ea5e9 : 0x6b7280) // Blue if voting, gray if closed
      .setTitle(`📊 ${poll.title}`)
      .setDescription(poll.description || 'Vote on the dates below!')
      .addFields(
        { name: '📈 Total Voters', value: `${totalVoters}`, inline: true },
        { name: '📅 Date Options', value: `${poll.options.length}`, inline: true },
        {
          name: '⏰ Deadline',
          value: poll.votingDeadline
            ? `<t:${Math.floor(poll.votingDeadline.getTime() / 1000)}:R>`
            : 'No deadline',
          inline: true,
        }
      );

    // Add top dates
    if (sortedOptions.length > 0) {
      const topDates = sortedOptions
        .slice(0, 5)
        .map(
          (opt) =>
            `${opt.votes > 0 ? '✅' : '⬜'} **${opt.label}** — ${opt.votes} vote${opt.votes !== 1 ? 's' : ''}`
        )
        .join('\n');

      embed.addFields({
        name: '🗳️ Top Dates',
        value:
          topDates + (sortedOptions.length > 5 ? `\n...and ${sortedOptions.length - 5} more` : ''),
        inline: false,
      });
    } else {
      embed.addFields({
        name: '🗳️ Votes',
        value: 'No votes yet. Be the first to vote!',
        inline: false,
      });
    }

    // Add status indicator
    const statusText =
      poll.status === 'VOTING'
        ? '🟢 Open for voting'
        : poll.status === 'FINALIZED'
          ? '✅ Finalized'
          : poll.status === 'CANCELLED'
            ? '❌ Cancelled'
            : '⏸️ Closed';

    embed.addFields({ name: '🎯 Status', value: statusText, inline: false });

    // Create action buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('🗳️ Vote Now')
        .setStyle(ButtonStyle.Link)
        .setURL(generateVotingUrl(poll.id)),
      new ButtonBuilder()
        .setLabel('📊 Full Results')
        .setStyle(ButtonStyle.Link)
        .setURL(`${Config.webAppUrl}/results/${poll.id}`)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [buttons],
    });
  } catch (_error) {
    console.error('Error in /status command:', _error);
    await interaction.editReply({
      content:
        '❌ **Error fetching event status:**\n' +
        (_error instanceof Error ? _error.message : 'Unknown _error occurred'),
    });
  }
}
