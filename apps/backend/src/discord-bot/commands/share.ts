/**
 * /share command
 * Share or reshare an event to the current channel
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
import { Config } from '../config.js';
import { prisma } from '../../seacalendar/prisma.js';

export const data = new SlashCommandBuilder()
  .setName('share')
  .setDescription('Share an event to this channel')
  .addStringOption((option) =>
    option.setName('event').setDescription('Event URL or ID to share').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString('event', true);

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

    // Get vote statistics
    const votes = await prisma.vote.findMany({
      where: { pollId: poll.id },
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

    // Create share embed
    const embed = new EmbedBuilder()
      .setColor(poll.status === 'VOTING' ? 0x0ea5e9 : 0x6b7280) // Blue if voting, gray if closed
      .setTitle(`${poll.title}`)
      .setDescription(poll.description || 'Vote on your availability!')
      .addFields(
        { name: '📈 Current Voters', value: `${totalVoters}`, inline: true },
        { name: '📅 Date Options', value: `${poll.options.length}`, inline: true }
      );

    // Add deadline if exists
    if (poll.votingDeadline) {
      embed.addFields({
        name: '⏰ Deadline',
        value: `<t:${Math.floor(poll.votingDeadline.getTime() / 1000)}:R>`,
        inline: true,
      });
    }

    // Add top dates if votes exist
    if (sortedOptions.length > 0 && totalVoters > 0) {
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
        name: '🗳️ Voting',
        value: 'No votes yet. Be the first!',
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

    // Add who created it
    embed.setFooter({ text: `Created by ${poll.creator.username}` });

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
      content: `<@${poll.creator.discordId}> created this event:`,
      embeds: [embed],
      components: [buttons],
    });
  } catch (_error) {
    console.error('Error in /share command:', _error);
    await interaction.editReply({
      content:
        '❌ **Error sharing event:**\n' +
        (_error instanceof Error ? _error.message : 'Unknown _error occurred'),
    });
  }
}
