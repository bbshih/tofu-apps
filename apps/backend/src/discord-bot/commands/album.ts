/**
 * /album command
 * Manage Google Photos albums for events
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { prisma } from '../../seacalendar/prisma.js';
import * as googlePhotos from '../services/googlePhotosService.js';
import { DateTime } from 'luxon';

export const data = new SlashCommandBuilder()
  .setName('album')
  .setDescription('Manage photo albums for events')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('view')
      .setDescription('Get the photo album link for an event')
      .addStringOption((option) =>
        option.setName('event_url').setDescription('The event URL or ID').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('create')
      .setDescription('Create a photo album for an event (if not exists)')
      .addStringOption((option) =>
        option.setName('event_url').setDescription('The event URL or ID').setRequired(true)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'view') {
    await handleView(interaction);
  } else if (subcommand === 'create') {
    await handleCreate(interaction);
  }
}

async function handleView(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString('event_url', true);

  await interaction.deferReply();

  try {
    // Extract poll ID
    let pollId = input.trim();
    if (input.includes('/')) {
      const match = input.match(/\/(?:vote|results|event)\/([a-zA-Z0-9-]+)/);
      if (match) pollId = match[1];
    }

    // Get poll and followup
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll) {
      await interaction.editReply({
        content: '❌ Event not found. Please check the URL or ID.',
      });
      return;
    }

    // Check guild
    if (poll.guildId !== interaction.guildId) {
      await interaction.editReply({
        content: '❌ This event is from a different server.',
      });
      return;
    }

    // Get followup with album info
    const followup = await prisma.eventFollowup.findUnique({
      where: { pollId: poll.id },
    });

    if (!followup?.photoAlbumUrl) {
      await interaction.editReply({
        content: `📸 No photo album exists for **${poll.title}**.\n\nUse \`/album create\` to create one!`,
      });
      return;
    }

    // Build response
    const embed = new EmbedBuilder()
      .setColor('#00ff41')
      .setTitle(`📸 ${poll.title}`)
      .setDescription('Upload your photos to the shared album!')
      .addFields(
        { name: 'Album Link', value: followup.photoAlbumUrl, inline: false },
        { name: 'Event Status', value: poll.status, inline: true }
      )
      .setFooter({ text: 'Everyone can add photos and comment!' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (_error) {
    console.error('Error viewing album:', _error);
    await interaction.editReply({
      content: '❌ Failed to fetch album information.',
    });
  }
}

async function handleCreate(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString('event_url', true);

  await interaction.deferReply();

  try {
    // Check if Google Photos is configured
    if (!googlePhotos.isConfigured()) {
      await interaction.editReply({
        content:
          '❌ Google Photos integration is not configured on this server.\n\nContact the server admin to set up `GOOGLE_APPLICATION_CREDENTIALS`.',
      });
      return;
    }

    // Extract poll ID
    let pollId = input.trim();
    if (input.includes('/')) {
      const match = input.match(/\/(?:vote|results|event)\/([a-zA-Z0-9-]+)/);
      if (match) pollId = match[1];
    }

    // Get poll
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });

    if (!poll) {
      await interaction.editReply({
        content: '❌ Event not found. Please check the URL or ID.',
      });
      return;
    }

    // Check guild
    if (poll.guildId !== interaction.guildId) {
      await interaction.editReply({
        content: '❌ This event is from a different server.',
      });
      return;
    }

    // Get or create followup
    let followup = await prisma.eventFollowup.findUnique({
      where: { pollId: poll.id },
    });

    // If album already exists
    if (followup?.photoAlbumUrl) {
      const embed = new EmbedBuilder()
        .setColor('#00ff41')
        .setTitle(`📸 Album already exists!`)
        .setDescription(`**${poll.title}**`)
        .addFields({ name: 'Album Link', value: followup.photoAlbumUrl })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Create album
    const finalizedOption = poll.options.find((opt) => opt.id === poll.finalizedOptionId);
    const eventDate = finalizedOption?.date
      ? DateTime.fromJSDate(finalizedOption.date)
      : DateTime.now();

    const album = await googlePhotos.createSharedAlbum(
      `${poll.title} - ${eventDate.toFormat('MMM dd, yyyy')}`
    );

    // Update or create followup with album info
    if (followup) {
      await prisma.eventFollowup.update({
        where: { id: followup.id },
        data: {
          photoAlbumUrl: album.shareUrl,
          photoAlbumId: album.albumId,
        },
      });
    } else {
      // Create followup if doesn't exist (shouldn't happen but handle it)
      await prisma.eventFollowup.create({
        data: {
          pollId: poll.id,
          scheduledFor: new Date(),
          status: 'SENT',
          channelId: poll.channelId,
          photoAlbumUrl: album.shareUrl,
          photoAlbumId: album.albumId,
        },
      });
    }

    // Success response
    const embed = new EmbedBuilder()
      .setColor('#00ff41')
      .setTitle('✅ Photo Album Created!')
      .setDescription(`**${poll.title}**`)
      .addFields(
        { name: '📸 Album Link', value: album.shareUrl, inline: false },
        { name: 'Instructions', value: 'Anyone can add photos and comment!', inline: false }
      )
      .setFooter({ text: 'Share this link with everyone who attended!' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (_error) {
    console.error('Error creating album:', _error);
    await interaction.editReply({
      content: `❌ Failed to create album: ${_error instanceof Error ? _error.message : 'Unknown _error'}`,
    });
  }
}
