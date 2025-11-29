/**
 * /event command
 * Create a new event with natural language parsing
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
} from 'discord.js';
import {
  parseEventDescriptionSmart,
  validateParsedEvent,
  formatDateOption,
} from '@seacalendar/shared';
import {
  createEventPoll,
  generateVotingUrl,
  canUseDiscordVoting,
} from '../services/pollService.js';
import { Config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('event')
  .setDescription('Create a new event with date options')
  .addStringOption((option) =>
    option
      .setName('description')
      .setDescription(
        'Event description with dates (e.g., "Q1 Hangout - Fridays in January at 7pm")'
      )
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const description = interaction.options.getString('description', true);

  // Show thinking indicator (ephemeral - only visible to user)
  await interaction.deferReply({ ephemeral: true });

  try {
    // Parse the natural language description with smart LLM fallback
    const parsed = await parseEventDescriptionSmart(description);

    // Debug logging
    console.log('📝 Parsed event:', {
      title: parsed.title,
      dateCount: parsed.dates.length,
      firstDate: parsed.dates[0]?.toISOString(),
      lastDate: parsed.dates[parsed.dates.length - 1]?.toISOString(),
    });

    // Validate the parsed event
    const validation = validateParsedEvent(parsed);
    if (!validation.valid) {
      await interaction.editReply({
        content: `❌ **Could not parse event description:**\n${validation.errors.map((e) => `• ${e}`).join('\n')}`,
      });
      return;
    }

    // Create confirmation embed
    const embed = new EmbedBuilder()
      .setColor(0x0ea5e9) // Ocean blue
      .setTitle('Event Preview')
      .addFields(
        { name: '📋 Title', value: parsed.title, inline: false },
        {
          name: '📅 Dates',
          value:
            parsed.dates
              .slice(0, 10)
              .map((d) => `• ${formatDateOption(d)}`)
              .join('\n') +
            (parsed.dates.length > 10 ? `\n...and ${parsed.dates.length - 10} more` : ''),
          inline: false,
        }
      );

    if (parsed.times.length > 0) {
      embed.addFields({
        name: '🕐 Times',
        value: parsed.times.join(', '),
        inline: false,
      });
    }

    if (parsed.description) {
      embed.addFields({
        name: '📝 Notes',
        value: parsed.description.substring(0, 500),
        inline: false,
      });
    }

    embed.setFooter({
      text: `${parsed.dates.length} date option${parsed.dates.length !== 1 ? 's' : ''}`,
    });

    // Create confirmation buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('event_confirm')
        .setLabel('✅ Create Event')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('event_cancel')
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    // Send confirmation message
    const response = await interaction.editReply({
      content: '**Review your event:**',
      embeds: [embed],
      components: [buttons],
    });

    // Wait for button interaction
    try {
      const confirmation = await response.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 60_000, // 60 seconds
        filter: (i) => i.user.id === interaction.user.id,
      });

      if (confirmation.customId === 'event_cancel') {
        await confirmation.update({
          content: '❌ Event creation cancelled.',
          embeds: [],
          components: [],
        });
        return;
      }

      // Create the event
      await confirmation.deferUpdate();

      const poll = await createEventPoll({
        title: parsed.title,
        description: parsed.description,
        guildId: interaction.guildId!,
        channelId: interaction.channelId!,
        creatorDiscordId: interaction.user.id,
        dateOptions: parsed.dates,
        times: parsed.times,
      });

      // Generate voting URL
      const votingUrl = generateVotingUrl(poll.id);

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor(0x10b981) // Success green
        .setTitle('✅ Event Created!')
        .setDescription(`**${poll.title}**`)
        .addFields(
          { name: '🔗 Voting Link', value: votingUrl, inline: false },
          { name: '📊 Status', value: 'Open for voting', inline: true },
          {
            name: '📅 Options',
            value: `${poll.options.length} dates`,
            inline: true,
          },
          {
            name: '⏰ Deadline',
            value: poll.votingDeadline
              ? `<t:${Math.floor(poll.votingDeadline.getTime() / 1000)}:R>`
              : 'No deadline',
            inline: true,
          }
        );

      // Add voting instructions
      if (canUseDiscordVoting(poll)) {
        successEmbed.addFields({
          name: '🗳️ How to Vote',
          value:
            '• Click the link above to vote on the web\n• Or react with emojis below (coming soon)',
          inline: false,
        });
      } else {
        successEmbed.addFields({
          name: '🗳️ How to Vote',
          value: `• Click the link above to vote\n• Web voting required (${poll.options.length} options)`,
          inline: false,
        });
      }

      // Create action buttons
      const actionButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setLabel('🗳️ Vote Now').setStyle(ButtonStyle.Link).setURL(votingUrl),
        new ButtonBuilder()
          .setLabel('📊 View Results')
          .setStyle(ButtonStyle.Link)
          .setURL(`${Config.webAppUrl}/results/${poll.id}`)
      );

      // Delete ephemeral message and send public announcement
      await confirmation.deleteReply();
      if (interaction.channel && 'send' in interaction.channel) {
        await interaction.channel.send({
          content: `<@${interaction.user.id}> created an event!`,
          embeds: [successEmbed],
          components: [actionButtons],
        });
      }

      // TODO: If ≤5 options, set up emoji voting
    } catch (_error) {
      // Timeout or _error
      if ((_error as Error).message.includes('time')) {
        await interaction.editReply({
          content: '⏰ Event creation timed out. Please try again.',
          embeds: [],
          components: [],
        });
      } else {
        throw _error;
      }
    }
  } catch (_error) {
    console.error('Error in /event command:', _error);

    const errorMessage = {
      content:
        '❌ **Error creating event:**\n' +
        (_error instanceof Error ? _error.message : 'Unknown _error occurred'),
      embeds: [],
      components: [],
    };

    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ ...errorMessage, ephemeral: true });
    }
  }
}
