/**
 * /cancel command
 * Cancel an event (creator only)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { getPollWithDetails, cancelPoll } from '../services/pollService.js';

export const data = new SlashCommandBuilder()
  .setName('cancel')
  .setDescription('Cancel an event (creator only)')
  .addStringOption((option) =>
    option.setName('event_url').setDescription('The event/poll URL or ID').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString('event_url', true);

  await interaction.deferReply({ ephemeral: true }); // Private reply

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

    // Check if user is the creator
    if (poll.creator.discordId !== interaction.user.id) {
      await interaction.editReply({
        content: '❌ Only the event creator can cancel it.',
      });
      return;
    }

    // Check if already cancelled
    if (poll.status === 'CANCELLED') {
      await interaction.editReply({
        content: '⚠️ This event has already been cancelled.',
      });
      return;
    }

    // Check if finalized
    if (poll.status === 'FINALIZED') {
      await interaction.editReply({
        content:
          '⚠️ Cannot cancel a finalized event. Contact participants directly if you need to make changes.',
      });
      return;
    }

    // Create confirmation embed
    const embed = new EmbedBuilder()
      .setColor(0xf97316) // Warning orange
      .setTitle('⚠️ Confirm Cancellation')
      .setDescription(`Are you sure you want to cancel this event?`)
      .addFields(
        { name: '📋 Event', value: poll.title, inline: false },
        { name: '📅 Options', value: `${poll.options.length} dates`, inline: true },
        { name: '📊 Status', value: poll.status, inline: true }
      );

    // Create confirmation buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('cancel_confirm')
        .setLabel('⚠️ Yes, Cancel Event')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel_abort')
        .setLabel('Keep Event')
        .setStyle(ButtonStyle.Secondary)
    );

    const response = await interaction.editReply({
      embeds: [embed],
      components: [buttons],
    });

    // Wait for confirmation
    try {
      const confirmation = await response.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 30_000, // 30 seconds
        filter: (i) => i.user.id === interaction.user.id,
      });

      if (confirmation.customId === 'cancel_abort') {
        await confirmation.update({
          content: '✅ Cancellation aborted. Your event is still active.',
          embeds: [],
          components: [],
        });
        return;
      }

      // Cancel the poll
      await confirmation.deferUpdate();
      await cancelPoll(poll.id, interaction.user.id);

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor(0x6b7280) // Gray
        .setTitle('❌ Event Cancelled')
        .setDescription(`**${poll.title}** has been cancelled.`)
        .addFields({
          name: 'ℹ️ Note',
          value:
            'Participants will see the event as cancelled when they check the status or visit the link.',
          inline: false,
        });

      await confirmation.editReply({
        content: null,
        embeds: [successEmbed],
        components: [],
      });

      // TODO: Send notification to channel about cancellation
    } catch (_error) {
      if ((_error as Error).message.includes('time')) {
        await interaction.editReply({
          content: '⏰ Confirmation timed out. Event was not cancelled.',
          embeds: [],
          components: [],
        });
      } else {
        throw _error;
      }
    }
  } catch (_error) {
    console.error('Error in /cancel command:', _error);

    const errorMessage = {
      content:
        '❌ **Error cancelling event:**\n' +
        (_error instanceof Error ? _error.message : 'Unknown _error occurred'),
      embeds: [],
      components: [],
    };

    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}
