/**
 * /engagement command
 * View friendship health and engagement stats for the server
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import * as engagementService from '../services/engagementService.js';

export const data = new SlashCommandBuilder()
  .setName('engagement')
  .setDescription('View friendship health and engagement stats')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Admin only
  .setDMPermission(false) // Server only, not in DMs
  .addSubcommand((subcommand) =>
    subcommand
      .setName('stats')
      .setDescription('View server engagement statistics')
      .addRoleOption((option) =>
        option
          .setName('role')
          .setDescription('Filter by role (e.g., "Local" or "Remote")')
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('leaderboard')
      .setDescription('View most engaged members')
      .addRoleOption((option) =>
        option.setName('role').setDescription('Filter by role').setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('drifting')
      .setDescription('See members who might be drifting away')
      .addRoleOption((option) =>
        option.setName('role').setDescription('Filter by role').setRequired(false)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  if (!interaction.guildId) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  if (subcommand === 'stats') {
    await handleStats(interaction);
  } else if (subcommand === 'leaderboard') {
    await handleLeaderboard(interaction);
  } else if (subcommand === 'drifting') {
    await handleDrifting(interaction);
  }
}

async function handleStats(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const role = interaction.options.getRole('role');
    const roleFilter = role?.id;

    const stats = await engagementService.getGuildEngagementStats(interaction.guildId!, roleFilter);

    const activePercent =
      stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0;

    const embed = new EmbedBuilder()
      .setColor('#00ff41')
      .setTitle(role ? `📊 Engagement: @${role.name}` : '📊 Server Engagement Stats')
      .setDescription(
        role ? `Stats for members with @${role.name} role` : 'How engaged is your friend group?'
      )
      .addFields(
        {
          name: '👥 Total Members',
          value: stats.totalUsers.toString(),
          inline: true,
        },
        {
          name: '✅ Active (30 days)',
          value: `${stats.activeUsers} (${activePercent}%)`,
          inline: true,
        },
        {
          name: '⚠️ Drifting (30-60 days)',
          value: stats.driftingUsers.toString(),
          inline: true,
        },
        {
          name: '❌ Inactive (60+ days)',
          value: stats.inactiveUsers.toString(),
          inline: true,
        }
      )
      .setFooter({ text: 'Use /engagement leaderboard or /engagement drifting for more details' })
      .setTimestamp();

    if (stats.needsAttention.length > 0) {
      embed.addFields({
        name: '🚨 Needs Attention',
        value: `${stats.needsAttention.length} members might be drifting. Use \`/engagement drifting\` to see who.`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (_error) {
    console.error('Error getting engagement stats:', _error);
    await interaction.editReply({
      content: '❌ Failed to load engagement stats.',
    });
  }
}

async function handleLeaderboard(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const role = interaction.options.getRole('role');
    const roleFilter = role?.id;

    const stats = await engagementService.getGuildEngagementStats(interaction.guildId!, roleFilter);

    if (stats.topEngaged.length === 0) {
      await interaction.editReply({
        content: '📊 No engagement data yet. Start organizing events!',
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#00ff41')
      .setTitle(role ? `🏆 Leaderboard: @${role.name}` : '🏆 Most Engaged Members')
      .setDescription(role ? `Top @${role.name} members` : 'Your most active community members')
      .setTimestamp();

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

    for (let i = 0; i < stats.topEngaged.length; i++) {
      const user = stats.topEngaged[i];
      const medal = medals[i] || `${i + 1}️⃣`;

      embed.addFields({
        name: `${medal} ${user.username}`,
        value: [
          `📅 Events Attended: ${user.totalEventsAttended}`,
          `🗳️ Votes Cast: ${user.totalVotesCast}`,
          `📝 Events Created: ${user.totalEventsCreated}`,
        ].join('\n'),
        inline: true,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (_error) {
    console.error('Error getting leaderboard:', _error);
    await interaction.editReply({
      content: '❌ Failed to load leaderboard.',
    });
  }
}

async function handleDrifting(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const role = interaction.options.getRole('role');
    const roleFilter = role?.id;

    const stats = await engagementService.getGuildEngagementStats(interaction.guildId!, roleFilter);

    if (stats.needsAttention.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#00ff41')
        .setTitle('✅ Everyone is Engaged!')
        .setDescription('All members are active. Great job keeping the friendship alive! 🎉')
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#ff6b6b')
      .setTitle(role ? `⚠️ Drifting: @${role.name}` : '⚠️ Members Who Might Be Drifting')
      .setDescription(
        role
          ? `@${role.name} members who need attention`
          : 'Consider reaching out to these friends!'
      )
      .setTimestamp();

    for (const user of stats.needsAttention) {
      const riskEmoji = user.driftRisk === 'high' ? '🔴' : '🟡';

      const lastVote =
        user.daysSinceLastVote !== null
          ? `${Math.round(user.daysSinceLastVote)} days ago`
          : 'Never';

      const lastAttended =
        user.daysSinceLastAttended !== null
          ? `${Math.round(user.daysSinceLastAttended)} days ago`
          : 'Never';

      embed.addFields({
        name: `${riskEmoji} ${user.username}`,
        value: [
          `Last voted: ${lastVote}`,
          `Last attended: ${lastAttended}`,
          `Total events attended: ${user.totalEventsAttended}`,
        ].join('\n'),
        inline: true,
      });
    }

    embed.setFooter({
      text: '💡 Tip: Create an event and @ mention these members to re-engage them!',
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (_error) {
    console.error('Error getting drifting members:', _error);
    await interaction.editReply({
      content: '❌ Failed to load drifting members.',
    });
  }
}
