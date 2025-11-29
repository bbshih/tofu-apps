/**
 * Database Seed Script
 * Creates test data for development
 */

import { PrismaClient, PollType, PollStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const user1 = await prisma.user.upsert({
    where: { discordId: '123456789012345678' },
    update: {},
    create: {
      discordId: '123456789012345678',
      username: 'TestUser1',
      discriminator: '0001',
      email: 'user1@test.com',
      avatar: null,
      preferences: {
        create: {
          notifyViaDiscordDM: true,
          notifyViaEmail: false,
          wantVoteReminders: true,
          wantEventReminders: true,
        },
      },
    },
  });
  console.log('✅ Created user:', user1.username);

  const user2 = await prisma.user.upsert({
    where: { discordId: '234567890123456789' },
    update: {},
    create: {
      discordId: '234567890123456789',
      username: 'TestUser2',
      discriminator: '0002',
      email: 'user2@test.com',
      avatar: null,
    },
  });
  console.log('✅ Created user:', user2.username);

  const user3 = await prisma.user.upsert({
    where: { discordId: '345678901234567890' },
    update: {},
    create: {
      discordId: '345678901234567890',
      username: 'TestUser3',
      discriminator: '0003',
      email: 'user3@test.com',
      avatar: null,
    },
  });
  console.log('✅ Created user:', user3.username);

  // Create a test poll
  const poll1 = await prisma.poll.create({
    data: {
      title: 'Weekend Dinner Hangout',
      description: 'Let\'s grab dinner this weekend! Vote for your available times.',
      type: PollType.EVENT,
      status: PollStatus.VOTING,
      creatorId: user1.id,
      guildId: '987654321098765432',
      channelId: '876543210987654321',
      votingDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      options: {
        create: [
          {
            label: 'Saturday Evening',
            date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            timeStart: '18:00',
            timeEnd: '21:00',
            order: 0,
          },
          {
            label: 'Sunday Afternoon',
            date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            timeStart: '14:00',
            timeEnd: '17:00',
            order: 1,
          },
          {
            label: 'Sunday Evening',
            date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            timeStart: '18:00',
            timeEnd: '21:00',
            order: 2,
          },
        ],
      },
      invites: {
        create: [
          { userId: user2.id },
          { userId: user3.id },
        ],
      },
    },
    include: {
      options: true,
    },
  });
  console.log('✅ Created poll:', poll1.title);

  // Create votes for the poll
  await prisma.vote.create({
    data: {
      pollId: poll1.id,
      voterId: user2.id,
      availableOptionIds: [poll1.options[0].id, poll1.options[2].id],
      maybeOptionIds: [poll1.options[1].id],
      notes: 'Saturday works best for me!',
    },
  });
  console.log('✅ Created vote from user2');

  await prisma.vote.create({
    data: {
      pollId: poll1.id,
      voterId: user3.id,
      availableOptionIds: [poll1.options[1].id, poll1.options[2].id],
      maybeOptionIds: [],
      notes: 'Sunday is perfect!',
    },
  });
  console.log('✅ Created vote from user3');

  // Update invite status
  await prisma.pollInvite.updateMany({
    where: { pollId: poll1.id },
    data: { hasVoted: true },
  });

  // Create a generic poll
  const poll2 = await prisma.poll.create({
    data: {
      title: 'Next Game to Play',
      description: 'Vote for which game we should play next week!',
      type: PollType.GENERIC,
      status: PollStatus.VOTING,
      creatorId: user2.id,
      guildId: '987654321098765432',
      channelId: '876543210987654321',
      options: {
        create: [
          {
            label: 'Among Us',
            description: 'Classic social deduction game',
            order: 0,
          },
          {
            label: 'Minecraft',
            description: 'Survival mode on new server',
            order: 1,
          },
          {
            label: 'Valorant',
            description: 'Competitive matches',
            order: 2,
          },
        ],
      },
      invites: {
        create: [
          { userId: user1.id },
          { userId: user3.id },
        ],
      },
    },
  });
  console.log('✅ Created poll:', poll2.title);

  // Create a finalized poll
  const poll3 = await prisma.poll.create({
    data: {
      title: 'Last Week\'s Meetup (Finalized)',
      description: 'This poll has been finalized.',
      type: PollType.EVENT,
      status: PollStatus.FINALIZED,
      creatorId: user1.id,
      closedAt: new Date(),
      options: {
        create: [
          {
            label: 'Friday Night',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            timeStart: '19:00',
            timeEnd: '22:00',
            order: 0,
          },
        ],
      },
    },
    include: {
      options: true,
    },
  });

  await prisma.poll.update({
    where: { id: poll3.id },
    data: {
      finalizedOptionId: poll3.options[0].id,
    },
  });
  console.log('✅ Created finalized poll:', poll3.title);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
