/**
 * Question of the Week (QOTW) service
 * Handles question submission, selection, and posting
 */

import { prisma, QotwQuestion, QotwConfig, QotwHistory } from '../../seacalendar/prisma.js';

const MAX_QUESTION_LENGTH = 1000;
const DEFAULT_QUESTION = 'What are you looking forward to?';
const POLL_DURATION_DAYS = 3;

export interface SubmitQuestionInput {
  question: string;
  guildId: string;
  submitterId: string;
  submitterUsername: string;
}

export interface QuestionWithHistory extends QotwQuestion {
  history: QotwHistory[];
}

/**
 * Submit a new question
 */
export async function submitQuestion(input: SubmitQuestionInput): Promise<QotwQuestion> {
  if (!input.question || input.question.trim().length === 0) {
    throw new Error('Question cannot be empty');
  }

  if (input.question.length > MAX_QUESTION_LENGTH) {
    throw new Error(`Question must be ${MAX_QUESTION_LENGTH} characters or less`);
  }

  return prisma.qotwQuestion.create({
    data: {
      question: input.question.trim(),
      guildId: input.guildId,
      submitterId: input.submitterId,
      submitterUsername: input.submitterUsername,
    },
  });
}

/**
 * Get or create QOTW config for a guild
 */
export async function getOrCreateConfig(guildId: string): Promise<QotwConfig> {
  let config = await prisma.qotwConfig.findUnique({
    where: { guildId },
  });

  if (!config) {
    config = await prisma.qotwConfig.create({
      data: { guildId },
    });
  }

  return config;
}

/**
 * Update QOTW config
 */
export async function updateConfig(
  guildId: string,
  updates: Partial<Omit<QotwConfig, 'id' | 'guildId' | 'createdAt' | 'updatedAt'>>
): Promise<QotwConfig> {
  return prisma.qotwConfig.upsert({
    where: { guildId },
    update: updates,
    create: {
      guildId,
      ...updates,
    },
  });
}

/**
 * Get next question to ask
 * Priority: manual override > oldest unasked > oldest least-recently-asked
 */
export async function getNextQuestion(guildId: string): Promise<QotwQuestion | null> {
  const config = await getOrCreateConfig(guildId);

  // Check for manual override
  if (config.nextQuestionId) {
    const question = await prisma.qotwQuestion.findFirst({
      where: {
        id: config.nextQuestionId,
        guildId,
        isDeleted: false,
      },
    });
    if (question) return question;
  }

  // Get oldest unasked question
  const unasked = await prisma.qotwQuestion.findFirst({
    where: {
      guildId,
      isDeleted: false,
      timesAsked: 0,
    },
    orderBy: {
      submittedAt: 'asc',
    },
  });

  if (unasked) return unasked;

  // Get least-recently-asked question
  return prisma.qotwQuestion.findFirst({
    where: {
      guildId,
      isDeleted: false,
    },
    orderBy: [{ lastAskedAt: 'asc' }, { submittedAt: 'asc' }],
  });
}

/**
 * Get next N questions for selection poll
 * Prioritizes unasked, fills with least-recently-asked
 */
export async function getQuestionsForPoll(
  guildId: string,
  count: number = 5
): Promise<QotwQuestion[]> {
  const unasked = await prisma.qotwQuestion.findMany({
    where: {
      guildId,
      isDeleted: false,
      timesAsked: 0,
    },
    orderBy: {
      submittedAt: 'asc',
    },
    take: count,
  });

  if (unasked.length >= count) {
    return unasked;
  }

  // Fill remaining with least-recently-asked
  const remaining = count - unasked.length;
  const asked = await prisma.qotwQuestion.findMany({
    where: {
      guildId,
      isDeleted: false,
      timesAsked: { gt: 0 },
    },
    orderBy: [{ lastAskedAt: 'asc' }, { submittedAt: 'asc' }],
    take: remaining,
  });

  return [...unasked, ...asked];
}

/**
 * Mark question as asked and record history
 */
export async function markQuestionAsked(
  questionId: string,
  guildId: string,
  channelId: string,
  messageId: string
): Promise<void> {
  await prisma.$transaction([
    // Update question stats
    prisma.qotwQuestion.update({
      where: { id: questionId },
      data: {
        timesAsked: { increment: 1 },
        lastAskedAt: new Date(),
      },
    }),
    // Record history
    prisma.qotwHistory.create({
      data: {
        questionId,
        guildId,
        channelId,
        messageId,
      },
    }),
    // Clear manual override and update lastAskedAt
    prisma.qotwConfig.update({
      where: { guildId },
      data: {
        lastAskedAt: new Date(),
        nextQuestionId: null,
      },
    }),
  ]);
}

/**
 * List questions with pagination
 */
export async function listQuestions(
  guildId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ questions: QuestionWithHistory[]; total: number; pages: number }> {
  const skip = (page - 1) * limit;

  const [questions, total] = await prisma.$transaction([
    prisma.qotwQuestion.findMany({
      where: {
        guildId,
        isDeleted: false,
      },
      include: {
        history: true,
      },
      orderBy: {
        submittedAt: 'asc',
      },
      skip,
      take: limit,
    }),
    prisma.qotwQuestion.count({
      where: {
        guildId,
        isDeleted: false,
      },
    }),
  ]);

  return {
    questions,
    total,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Get a single question by ID
 */
export async function getQuestion(
  questionId: string,
  guildId: string
): Promise<QotwQuestion | null> {
  return prisma.qotwQuestion.findFirst({
    where: {
      id: questionId,
      guildId,
      isDeleted: false,
    },
  });
}

/**
 * Update a question
 */
export async function updateQuestion(
  questionId: string,
  guildId: string,
  newQuestion: string
): Promise<QotwQuestion> {
  if (!newQuestion || newQuestion.trim().length === 0) {
    throw new Error('Question cannot be empty');
  }

  if (newQuestion.length > MAX_QUESTION_LENGTH) {
    throw new Error(`Question must be ${MAX_QUESTION_LENGTH} characters or less`);
  }

  // Verify question belongs to this guild before updating
  const existing = await getQuestion(questionId, guildId);
  if (!existing) {
    throw new Error('Question not found');
  }

  return prisma.qotwQuestion.update({
    where: { id: questionId },
    data: { question: newQuestion.trim() },
  });
}

/**
 * Soft delete a question
 */
export async function deleteQuestion(questionId: string, guildId: string): Promise<void> {
  // Verify question belongs to this guild
  const question = await getQuestion(questionId, guildId);
  if (!question) {
    throw new Error('Question not found');
  }

  await prisma.qotwQuestion.update({
    where: { id: questionId },
    data: { isDeleted: true },
  });
}

/**
 * Check if user can modify question (submitter or admin)
 */
export function canModifyQuestion(
  question: QotwQuestion,
  userId: string,
  isAdmin: boolean
): boolean {
  return question.submitterId === userId || isAdmin;
}

/**
 * Set next question manually
 */
export async function setNextQuestion(
  guildId: string,
  questionId: string | null
): Promise<QotwConfig> {
  // If questionId provided, verify it exists and is not deleted
  if (questionId) {
    const question = await getQuestion(questionId, guildId);
    if (!question) {
      throw new Error('Question not found or deleted');
    }
  }

  return prisma.qotwConfig.update({
    where: { guildId },
    data: { nextQuestionId: questionId },
  });
}

/**
 * Get default question text
 */
export function getDefaultQuestion(): string {
  return DEFAULT_QUESTION;
}

/**
 * Check if there are any questions available
 */
export async function hasQuestions(guildId: string): Promise<boolean> {
  const count = await prisma.qotwQuestion.count({
    where: {
      guildId,
      isDeleted: false,
    },
  });
  return count > 0;
}

/**
 * Update poll timestamp
 */
export async function updatePollTimestamp(guildId: string): Promise<void> {
  await prisma.qotwConfig.update({
    where: { guildId },
    data: { lastPollAt: new Date() },
  });
}

/**
 * Check if it's time to post selection poll (3 days after last question)
 */
export async function shouldPostSelectionPoll(guildId: string): Promise<boolean> {
  const config = await getOrCreateConfig(guildId);

  if (!config.enabled || !config.lastAskedAt) {
    return false;
  }

  // Don't post another poll if we just posted one
  if (config.lastPollAt) {
    const hoursSincePoll = (Date.now() - config.lastPollAt.getTime()) / (1000 * 60 * 60);
    if (hoursSincePoll < 24) {
      return false;
    }
  }

  const daysSinceAsked = (Date.now() - config.lastAskedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceAsked >= POLL_DURATION_DAYS;
}

export { MAX_QUESTION_LENGTH, DEFAULT_QUESTION, POLL_DURATION_DAYS };
