/**
 * Core types for SeaCalendar
 * Used across web, API, and Discord bot
 */

// ============================================================================
// Poll Types (Generic - supports events and future poll types)
// ============================================================================

export type PollType = 'EVENT' | 'GENERIC';
export type PollStatus = 'DRAFT' | 'VOTING' | 'FINALIZED' | 'CANCELLED' | 'EXPIRED';

export interface Poll {
  id: string;
  type: PollType;
  title: string;
  description?: string;

  // Ownership
  creatorId: string;
  creatorName: string;

  // Discord context
  guildId?: string;
  channelId?: string;
  messageId?: string;

  // Timing
  createdAt: string;
  votingDeadline?: string;
  closedAt?: string;

  // Status
  status: PollStatus;

  // Relations
  options: PollOption[];
  votes: Vote[];
  invites: PollInvite[];

  // Event-specific (null for generic polls)
  finalizedOptionId?: string;
  venue?: VenueDetails;
}

export interface PollOption {
  id: string;
  pollId: string;
  label: string;
  description?: string;
  order: number;

  // Event-specific (null for generic polls)
  date?: string; // ISO date: "2025-01-10"
  timeStart?: string; // "19:00"
  timeEnd?: string; // "21:00"
}

export interface Vote {
  id: string;
  pollId: string;
  voterId: string;
  voterName: string;

  // Voting data
  availableOptions: string[]; // Option IDs voter is available for
  maybeOptions: string[]; // Maybe/unsure options
  notes?: string;

  votedAt: string;
  updatedAt: string;
}

export interface PollInvite {
  id: string;
  pollId: string;
  userId: string;
  userName: string;

  invitedAt: string;
  hasVoted: boolean;

  // Reminder tracking
  remindersSent: number;
  lastReminderAt?: string;
}

// ============================================================================
// Date Utilities
// ============================================================================

export interface DateOption {
  id: string;
  date: string; // ISO date format: "2025-01-10"
  label: string; // Display format: "Fri Jan 10"
}

// ============================================================================
// User & Identity
// ============================================================================

export interface User {
  id: string;
  discordId: string;
  discordUsername: string;
  discordAvatar?: string;
  email?: string;
  phone?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  notifyViaDiscordDM: boolean;
  notifyViaEmail: boolean;
  notifyViaSMS: boolean;
  wantVoteReminders: boolean;
  wantEventReminders: boolean;
  showInStats: boolean;
}

// ============================================================================
// Venue
// ============================================================================

export interface VenueDetails {
  name: string;
  address: string;
  time?: string; // "7:00 PM"
  googleMapsUrl?: string;
  websiteUrl?: string;
  menuUrl?: string;
  notes?: string;
}

export interface Venue {
  id: string;
  name: string;
  address?: string;
  googleMapsUrl?: string;
  notes?: string;
  guildId: string;
  addedById: string;
  createdAt: string;
}

// ============================================================================
// Templates
// ============================================================================

export interface PollTemplate {
  id: string;
  name: string;
  description?: string;
  templateData: any; // JSON - Poll structure
  creatorId: string;
  guildId: string;
  timesUsed: number;
  lastUsedAt?: string;
  createdAt: string;
}

// ============================================================================
// Reminders
// ============================================================================

export type ReminderType =
  | 'VOTE_REMINDER_3DAY'
  | 'VOTE_REMINDER_1DAY'
  | 'EVENT_REMINDER_1WEEK'
  | 'EVENT_REMINDER_1DAY'
  | 'EVENT_REMINDER_2HOUR';

export type ReminderStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface EventReminder {
  id: string;
  pollId: string;
  type: ReminderType;
  scheduledFor: string;
  sentAt?: string;
  status: ReminderStatus;
}

// ============================================================================
// Analytics
// ============================================================================

export interface VoteTally {
  option: PollOption;
  voteCount: number;
  voters: string[];
  percentage: number;
}

export interface PollResults {
  poll: Poll;
  tallies: VoteTally[];
  totalVotes: number;
  responseRate: number; // percentage
  winningOption?: PollOption;
}

export interface GuildStats {
  guildId: string;
  totalPolls: number;
  activePolls: number;
  averageResponseRate: number;
  mostActiveOrganizer: {
    userId: string;
    userName: string;
    pollCount: number;
  };
  mostPopularDay?: string;
  mostPopularTime?: string;
  topVenue?: {
    name: string;
    visitCount: number;
  };
}

export interface UserStats {
  userId: string;
  pollsCreated: number;
  pollsVotedOn: number;
  responseRate: number; // percentage
  attendanceRate: number; // percentage
}

// ============================================================================
// Audit Log
// ============================================================================

export interface AuditLog {
  id: string;
  action: string; // 'poll.create', 'vote.submit', 'poll.finalize', etc.
  entityType: string; // 'poll', 'vote', 'user', etc.
  entityId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}
