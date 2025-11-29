/**
 * Deploy slash commands to Discord
 * Run this script to register/update slash commands
 */

import { REST, Routes } from 'discord.js';
import { Config } from './config.js';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function deployCommands() {
  const commands: any[] = [];

  // Load all command files
  const commandsPath = join(__dirname, 'commands');
  let commandFiles: string[] = [];

  try {
    const files = await readdir(commandsPath);
    commandFiles = files.filter(
      (file) =>
        (file.endsWith('.js') || file.endsWith('.ts')) &&
        !file.includes('.test.') &&
        !file.includes('.spec.')
    );
  } catch (_error) {
    console.error('❌ Commands directory not found');
    process.exit(1);
  }

  // Gather command data
  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(filePath);

    if ('data' in command) {
      commands.push(command.data.toJSON());
      console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
      console.warn(`⚠️  Command ${file} is missing "data" property`);
    }
  }

  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(Config.discord.token);

  try {
    console.log(`\nStarted refreshing ${commands.length} application (/) commands...`);

    // Deploy commands
    if (Config.discord.testGuildId && Config.isDevelopment) {
      // Deploy to test guild only (faster for development)
      console.log(`📍 Deploying to test guild: ${Config.discord.testGuildId}`);

      const data = await rest.put(
        Routes.applicationGuildCommands(Config.discord.clientId, Config.discord.testGuildId),
        { body: commands }
      );

      console.log(`✅ Successfully reloaded ${(data as any).length} guild commands`);
    } else {
      // Deploy globally (takes up to 1 hour to propagate)
      console.log('🌍 Deploying commands globally...');

      const data = await rest.put(Routes.applicationCommands(Config.discord.clientId), {
        body: commands,
      });

      console.log(`✅ Successfully reloaded ${(data as any).length} global commands`);
      console.log('⏳ Note: Global commands may take up to 1 hour to update');
    }
  } catch (_error) {
    console.error('❌ Failed to deploy commands:', _error);
    process.exit(1);
  }
}

// Run deployment
deployCommands();
