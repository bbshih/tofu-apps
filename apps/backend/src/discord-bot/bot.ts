/**
 * SeaCalendar Discord Bot
 * Main entry point for the Discord bot
 */

import { Client, GatewayIntentBits, Collection, Events, type TextChannel } from 'discord.js';
import { Config } from './config.js';
import { Command } from './types/command.js';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../../seacalendar/prisma.js';
import cron from 'node-cron';
import { DateTime } from 'luxon';
import * as qotwService from './services/qotwService.js';
import * as memoryService from './services/memoryService.js';
import { postQuestion, postSelectionPoll } from './commands/qotw.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ],
});

// Commands collection
client.commands = new Collection<string, Command>();

/**
 * Load all commands from the commands directory
 */
async function loadCommands() {
  const commandsPath = join(__dirname, 'commands');
  let commandFiles: string[] = [];

  try {
    const files = await readdir(commandsPath);
    commandFiles = files.filter(
      (file) =>
        (file.endsWith('.js') || file.endsWith('.ts')) &&
        !file.includes('.test.') &&
        !file.includes('.e2e.')
    );
  } catch (_error) {
    console.warn('⚠️  No commands directory found. Creating placeholder...');
    return;
  }

  console.log(`📦 Loading ${commandFiles.length} commands...`);

  for (const file of commandFiles) {
    try {
      const filePath = join(commandsPath, file);
      const command = await import(filePath);

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`  ✅ Loaded command: ${command.data.name}`);
      } else {
        console.warn(`  ⚠️  Command ${file} is missing required "data" or "execute" property`);
      }
    } catch (_error) {
      console.error(`  ❌ Failed to load command ${file}:`, _error);
    }
  }
}

/**
 * Load all event handlers
 */
async function loadEvents() {
  const eventsPath = join(__dirname, 'events');
  let eventFiles: string[] = [];

  try {
    const files = await readdir(eventsPath);
    eventFiles = files.filter((file) => file.endsWith('.js') || file.endsWith('.ts'));
  } catch (_error) {
    console.warn('⚠️  No events directory found. Using default handlers...');
    return;
  }

  console.log(`📦 Loading ${eventFiles.length} event handlers...`);

  for (const file of eventFiles) {
    try {
      const filePath = join(eventsPath, file);
      const event = await import(filePath);

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }

      console.log(`  ✅ Loaded event: ${event.name}`);
    } catch (_error) {
      console.error(`  ❌ Failed to load event ${file}:`, _error);
    }
  }
}

/**
 * Default event handlers (used if no event files exist)
 */
function setupDefaultHandlers() {
  // Ready event
  client.once(Events.ClientReady, (c) => {
    console.log(`✅ Discord bot ready! Logged in as ${c.user.tag}`);
  });

  // Interaction handler
  client.on(Events.InteractionCreate, async (interaction) => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (_error) {
        console.error(`Error executing ${interaction.commandName}:`, _error);

        const errorMessage = {
          content: '❌ There was an _error executing this command!',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }

    // Handle autocomplete
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);

      if (!command || !command.autocomplete) {
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (_error) {
        console.error(`Error in autocomplete for ${interaction.commandName}:`, _error);
      }
    }
  });

  // Error handling
  client.on(Events.Error, (_error) => {
    console.error('Discord client _error:', _error);
  });

  // Warnings
  client.on(Events.Warn, (info) => {
    console.warn('Discord client warning:', info);
  });
}

/**
 * Initialize cron jobs for reminders and QOTW
 */
async function initializeCronJobs() {
  console.log('⏰ Initializing cron jobs...');

  // QOTW: Check every minute if questions need to be posted
  // Each guild has its own schedule configuration
  cron.schedule('* * * * *', async () => {
    try {
      const configs = await prisma.qotwConfig.findMany({
        where: { enabled: true },
      });

      for (const config of configs) {
        if (!config.channelId) continue;

        // Parse cron schedule and check if it's time
        const now = DateTime.now().setZone(config.timezone);
        const [minute, hour, , , dayOfWeek] = config.cronSchedule.split(' ');

        // Check if current time matches schedule
        const matchesMinute = minute === '*' || parseInt(minute) === now.minute;
        const matchesHour = hour === '*' || parseInt(hour) === now.hour;
        const matchesDayOfWeek = dayOfWeek === '*' || parseInt(dayOfWeek) === now.weekday % 7;

        if (matchesMinute && matchesHour && matchesDayOfWeek) {
          // Check if we already posted today
          if (config.lastAskedAt) {
            const lastAsked = DateTime.fromJSDate(config.lastAskedAt).setZone(config.timezone);
            if (lastAsked.hasSame(now, 'day')) {
              continue; // Already posted today
            }
          }

          // Post question
          try {
            const guild = await client.guilds.fetch(config.guildId);
            const channel = (await guild.channels.fetch(config.channelId)) as TextChannel;
            await postQuestion(config.guildId, channel);
            console.log(`✅ Posted QOTW for guild ${config.guildId}`);
          } catch (_error) {
            console.error(`❌ Failed to post QOTW for guild ${config.guildId}:`, _error);
          }
        }
      }
    } catch (_error) {
      console.error('❌ Error in QOTW cron job:', _error);
    }
  });

  // QOTW: Check daily if selection polls need to be posted (3 days after last question)
  cron.schedule('0 * * * *', async () => {
    try {
      const configs = await prisma.qotwConfig.findMany({
        where: { enabled: true },
      });

      for (const config of configs) {
        if (!config.channelId) continue;

        const shouldPost = await qotwService.shouldPostSelectionPoll(config.guildId);
        if (shouldPost) {
          try {
            const guild = await client.guilds.fetch(config.guildId);
            const channel = (await guild.channels.fetch(config.channelId)) as TextChannel;
            await postSelectionPoll(config.guildId, channel);
            console.log(`✅ Posted selection poll for guild ${config.guildId}`);
          } catch (_error) {
            console.error(`❌ Failed to post selection poll for guild ${config.guildId}:`, _error);
          }
        }
      }
    } catch (_error) {
      console.error('❌ Error in selection poll cron job:', _error);
    }
  });

  // Event Memories: Check every 5 minutes for pending followups
  cron.schedule('*/5 * * * *', async () => {
    try {
      const followups = await memoryService.getPendingFollowups();

      for (const followup of followups) {
        try {
          const poll = await memoryService.getPollWithFollowup(followup.pollId);
          if (!poll || !followup.channelId) {
            await memoryService.skipFollowup(followup.id);
            continue;
          }

          // Get guild and channel
          const guild = await client.guilds.fetch(poll.guildId || '');
          const channel = (await guild.channels.fetch(followup.channelId)) as TextChannel;

          // Build followup message
          let content = `## 💭 How was "${poll.title}"?\n\n`;

          if (followup.photoAlbumUrl) {
            content += `📸 **Upload photos:** ${followup.photoAlbumUrl}\n_(Everyone can add photos to the shared album!)_\n\n`;
          }

          content += `Share your thoughts:\n`;
          content += `• Use \`/memory add\` for text reflections\n`;
          content += `• Upload photos to the album above\n\n`;
          content += `🔗 Event: https://cal.billyeatstofu.com/events/${poll.id}`;

          // Send followup message
          const message = await channel.send({ content });

          await memoryService.markFollowupSent(followup.id, message.id);
          console.log(`✅ Sent followup for poll ${poll.id}`);
        } catch (_error) {
          console.error(`❌ Failed to send followup ${followup.id}:`, _error);
          await memoryService.markFollowupFailed(followup.id);
        }
      }
    } catch (_error) {
      console.error('❌ Error in memory followup cron job:', _error);
    }
  });

  console.log('✅ Cron jobs initialized');
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('\n🛑 Shutting down bot...');

  try {
    // Destroy Discord client
    client.destroy();

    // Disconnect Prisma
    await prisma.$disconnect();

    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (_error) {
    console.error('❌ Error during shutdown:', _error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * Main function to start the bot
 */
async function main() {
  try {
    console.log('Starting SeaCalendar Discord Bot...\n');

    // Test database connection
    console.log('📊 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // Load commands and events
    await loadCommands();
    await loadEvents();

    // If no event handlers were loaded, use defaults
    if (client.listenerCount(Events.ClientReady) === 0) {
      console.log('📦 Using default event handlers...');
      setupDefaultHandlers();
    }

    // Initialize cron jobs
    await initializeCronJobs();

    // Login to Discord
    console.log('\n🔐 Logging in to Discord...');
    await client.login(Config.discord.token);
  } catch (_error) {
    console.error('❌ Failed to start bot:', _error);
    process.exit(1);
  }
}

// Start the bot
main();

// TypeScript declaration to add commands property to Client
declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, Command>;
  }
}
