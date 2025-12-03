/**
 * /memory command
 * Share memories from a finalized event
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { createMemory, getEventMemories } from '../services/memoryService.js';
import { prisma } from '../../calendar/prisma.js';

export const data = new SlashCommandBuilder()
  .setName('memory')
  .setDescription('Share memories from a past event')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('add')
      .setDescription('Add a memory to an event')
      .addStringOption((option) =>
        option.setName('event_url').setDescription('The event URL or ID').setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('type')
          .setDescription('Type of memory')
          .setRequired(true)
          .addChoices(
            { name: 'Reflection - Share your thoughts', value: 'REFLECTION' },
            { name: 'Highlight - A memorable moment', value: 'HIGHLIGHT' },
            { name: 'Photo - Share a photo URL', value: 'PHOTO' }
          )
      )
      .addStringOption((option) =>
        option.setName('content').setDescription('Your memory text or photo URL').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('view')
      .setDescription('View all memories from an event')
      .addStringOption((option) =>
        option.setName('event_url').setDescription('The event URL or ID').setRequired(true)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'add') {
    await handleAdd(interaction);
  } else if (subcommand === 'view') {
    await handleView(interaction);
  }
}

async function handleAdd(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString('event_url', true);
  const type = interaction.options.getString('type', true) as 'REFLECTION' | 'HIGHLIGHT' | 'PHOTO';
  const content = interaction.options.getString('content', true);

  await interaction.deferReply();

  try {
    // Extract poll ID
    let pollId = input.trim();
    if (input.includes('/')) {
      const match = input.match(/\/(?:vote|results|event)\/([a-zA-Z0-9-]+)/);
      if (match) pollId = match[1];
    }

    // Get poll
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

    // Check if finalized
    if (poll.status !== 'FINALIZED') {
      await interaction.editReply({
        content: '❌ Can only add memories to finalized events. This event is still in voting.',
      });
      return;
    }

    // Create memory
    const userId = interaction.user.id;
    const memory = await createMemory({
      pollId: poll.id,
      userId,
      type,
      content: type === 'PHOTO' ? undefined : content,
      photoUrl: type === 'PHOTO' ? content : undefined,
    });

    // Send confirmation
    const embed = new EmbedBuilder()
      .setColor('#00ff41')
      .setTitle('✅ Memory Added!')
      .setDescription(`Your ${type.toLowerCase()} has been added to **${poll.title}**`)
      .addFields(
        { name: 'Type', value: type, inline: true },
        { name: 'Event', value: poll.title, inline: true }
      )
      .setFooter({ text: `Memory ID: ${memory.id}` })
      .setTimestamp();

    if (type === 'PHOTO' && memory.photoUrl) {
      embed.setImage(memory.photoUrl);
    } else if (memory.content) {
      embed.addFields({ name: 'Content', value: memory.content });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (_error) {
    console.error('Error adding memory:', _error);
    await interaction.editReply({
      content: `❌ Failed to add memory: ${_error instanceof Error ? _error.message : 'Unknown _error'}`,
    });
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

    // Get poll and memories
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll) {
      await interaction.editReply({
        content: '❌ Event not found.',
      });
      return;
    }

    const memories = await getEventMemories(pollId);

    if (memories.length === 0) {
      await interaction.editReply({
        content: `💭 No memories yet for **${poll.title}**. Be the first to share one with \`/memory add\`!`,
      });
      return;
    }

    // Build embed
    const embed = new EmbedBuilder()
      .setColor('#00ff41')
      .setTitle(`💭 Memories from ${poll.title}`)
      .setDescription(`${memories.length} ${memories.length === 1 ? 'memory' : 'memories'} shared`)
      .setTimestamp();

    // Add memories (limited to 10 fields)
    const displayMemories = memories.slice(0, 10);
    for (const memory of displayMemories) {
      const icon = memory.type === 'PHOTO' ? '📸' : memory.type === 'HIGHLIGHT' ? '⭐' : '💬';
      const displayContent = memory.content
        ? memory.content.substring(0, 100) + (memory.content.length > 100 ? '...' : '')
        : memory.photoUrl || 'Photo';

      embed.addFields({
        name: `${icon} ${memory.type}`,
        value: displayContent,
        inline: false,
      });
    }

    if (memories.length > 10) {
      embed.setFooter({
        text: `Showing 10 of ${memories.length} memories. View all at cal.billyeatstofu.com`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (_error) {
    console.error('Error viewing memories:', _error);
    await interaction.editReply({
      content: '❌ Failed to load memories.',
    });
  }
}
