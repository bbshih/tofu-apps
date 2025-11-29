/**
 * PM2 Ecosystem Configuration
 * Manages unified backend server and Discord bot as separate processes
 */

module.exports = {
  apps: [
    {
      name: 'unified-backend',
      script: './apps/backend/dist/server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '384M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--max-old-space-size=384',
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      time: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'discord-bot',
      script: './apps/backend/dist/discord-bot/bot.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=256',
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      time: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      // Restart bot daily to prevent memory leaks
      cron_restart: '0 4 * * *',
    },
  ],
};
