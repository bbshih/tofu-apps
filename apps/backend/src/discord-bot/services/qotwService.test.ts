/**
 * Unit tests for QOTW service
 * Tests security fixes and core functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@seacalendar/database';
import * as qotwService from './qotwService.js';
import type { QotwQuestion } from '@seacalendar/database';

// Mock Prisma
vi.mock('@seacalendar/database', () => ({
  prisma: {
    qotwQuestion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    qotwConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('QotwService Security', () => {
  const mockGuildId = '987654321';
  const mockOtherGuildId = '111111111';
  const mockQuestionId = 'q1';
  const mockUserId = '123456789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateQuestion - Guild isolation (CVE-1 fix)', () => {
    it('should validate guild ownership before updating', async () => {
      const mockQuestion: QotwQuestion = {
        id: mockQuestionId,
        question: 'Original question',
        guildId: mockGuildId,
        submitterId: mockUserId,
        submitterUsername: 'testuser#0001',
        submittedAt: new Date('2025-01-01'),
        timesAsked: 0,
        lastAskedAt: null,
        isDeleted: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      // Mock getQuestion to return null (not found in other guild)
      vi.mocked(prisma.qotwQuestion.findFirst).mockResolvedValue(null);

      // Try to update from different guild
      await expect(
        qotwService.updateQuestion(mockQuestionId, mockOtherGuildId, 'Hacked question')
      ).rejects.toThrow('Question not found');

      // Should have called findFirst with guild validation
      expect(prisma.qotwQuestion.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockQuestionId,
          guildId: mockOtherGuildId,
          isDeleted: false,
        },
      });

      // Should NOT have called update
      expect(prisma.qotwQuestion.update).not.toHaveBeenCalled();
    });

    it('should allow update when guild matches', async () => {
      const mockQuestion: QotwQuestion = {
        id: mockQuestionId,
        question: 'Original question',
        guildId: mockGuildId,
        submitterId: mockUserId,
        submitterUsername: 'testuser#0001',
        submittedAt: new Date('2025-01-01'),
        timesAsked: 0,
        lastAskedAt: null,
        isDeleted: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      const updatedQuestion = { ...mockQuestion, question: 'Updated question' };

      vi.mocked(prisma.qotwQuestion.findFirst).mockResolvedValue(mockQuestion);
      vi.mocked(prisma.qotwQuestion.update).mockResolvedValue(updatedQuestion);

      const result = await qotwService.updateQuestion(
        mockQuestionId,
        mockGuildId,
        'Updated question'
      );

      expect(result.question).toBe('Updated question');
      expect(prisma.qotwQuestion.update).toHaveBeenCalledWith({
        where: { id: mockQuestionId },
        data: { question: 'Updated question' },
      });
    });

    it('should reject empty questions', async () => {
      await expect(qotwService.updateQuestion(mockQuestionId, mockGuildId, '')).rejects.toThrow(
        'Question cannot be empty'
      );

      await expect(qotwService.updateQuestion(mockQuestionId, mockGuildId, '   ')).rejects.toThrow(
        'Question cannot be empty'
      );

      expect(prisma.qotwQuestion.findFirst).not.toHaveBeenCalled();
    });

    it('should reject questions that are too long', async () => {
      const longQuestion = 'a'.repeat(1001);

      await expect(
        qotwService.updateQuestion(mockQuestionId, mockGuildId, longQuestion)
      ).rejects.toThrow('Question must be 1000 characters or less');

      expect(prisma.qotwQuestion.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('deleteQuestion - Guild isolation', () => {
    it('should validate guild ownership before deleting', async () => {
      const mockQuestion: QotwQuestion = {
        id: mockQuestionId,
        question: 'Test question',
        guildId: mockGuildId,
        submitterId: mockUserId,
        submitterUsername: 'testuser#0001',
        submittedAt: new Date('2025-01-01'),
        timesAsked: 0,
        lastAskedAt: null,
        isDeleted: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      // Mock getQuestion to return null (question not found in other guild)
      vi.mocked(prisma.qotwQuestion.findFirst).mockResolvedValue(null);

      await expect(qotwService.deleteQuestion(mockQuestionId, mockOtherGuildId)).rejects.toThrow(
        'Question not found'
      );

      expect(prisma.qotwQuestion.update).not.toHaveBeenCalled();
    });

    it('should perform soft delete when guild matches', async () => {
      const mockQuestion: QotwQuestion = {
        id: mockQuestionId,
        question: 'Test question',
        guildId: mockGuildId,
        submitterId: mockUserId,
        submitterUsername: 'testuser#0001',
        submittedAt: new Date('2025-01-01'),
        timesAsked: 0,
        lastAskedAt: null,
        isDeleted: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      vi.mocked(prisma.qotwQuestion.findFirst).mockResolvedValue(mockQuestion);
      vi.mocked(prisma.qotwQuestion.update).mockResolvedValue({
        ...mockQuestion,
        isDeleted: true,
      });

      await qotwService.deleteQuestion(mockQuestionId, mockGuildId);

      expect(prisma.qotwQuestion.update).toHaveBeenCalledWith({
        where: { id: mockQuestionId },
        data: { isDeleted: true },
      });
    });
  });

  describe('getQuestion - Guild isolation', () => {
    it('should only return questions from the specified guild', async () => {
      vi.mocked(prisma.qotwQuestion.findFirst).mockResolvedValue(null);

      const result = await qotwService.getQuestion(mockQuestionId, mockOtherGuildId);

      expect(result).toBeNull();
      expect(prisma.qotwQuestion.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockQuestionId,
          guildId: mockOtherGuildId,
          isDeleted: false,
        },
      });
    });

    it('should return question when guild matches', async () => {
      const mockQuestion: QotwQuestion = {
        id: mockQuestionId,
        question: 'Test question',
        guildId: mockGuildId,
        submitterId: mockUserId,
        submitterUsername: 'testuser#0001',
        submittedAt: new Date('2025-01-01'),
        timesAsked: 0,
        lastAskedAt: null,
        isDeleted: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      vi.mocked(prisma.qotwQuestion.findFirst).mockResolvedValue(mockQuestion);

      const result = await qotwService.getQuestion(mockQuestionId, mockGuildId);

      expect(result).toEqual(mockQuestion);
      expect(prisma.qotwQuestion.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockQuestionId,
          guildId: mockGuildId,
          isDeleted: false,
        },
      });
    });
  });

  describe('listQuestions - Guild isolation', () => {
    it('should only return questions from the specified guild', async () => {
      const mockQuestions: QotwQuestion[] = [
        {
          id: 'q1',
          question: 'Guild 1 question',
          guildId: mockGuildId,
          submitterId: mockUserId,
          submitterUsername: 'testuser#0001',
          submittedAt: new Date('2025-01-01'),
          timesAsked: 0,
          lastAskedAt: null,
          isDeleted: false,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      ];

      // Mock $transaction to return both results
      vi.mocked(prisma.$transaction).mockResolvedValue([mockQuestions, 1]);

      const result = await qotwService.listQuestions(mockGuildId, 1, 10);

      expect(result.questions).toEqual(mockQuestions);
      expect(result.total).toBe(1);
    });
  });

  describe('submitQuestion - Input validation', () => {
    it('should validate question length', async () => {
      await expect(
        qotwService.submitQuestion({
          question: '',
          guildId: mockGuildId,
          submitterId: mockUserId,
          submitterUsername: 'testuser#0001',
        })
      ).rejects.toThrow('Question cannot be empty');

      const longQuestion = 'a'.repeat(1001);
      await expect(
        qotwService.submitQuestion({
          question: longQuestion,
          guildId: mockGuildId,
          submitterId: mockUserId,
          submitterUsername: 'testuser#0001',
        })
      ).rejects.toThrow('Question must be 1000 characters or less');
    });

    it('should trim whitespace from questions', async () => {
      const mockQuestion: QotwQuestion = {
        id: 'q1',
        question: 'Test question',
        guildId: mockGuildId,
        submitterId: mockUserId,
        submitterUsername: 'testuser#0001',
        submittedAt: new Date('2025-01-01'),
        timesAsked: 0,
        lastAskedAt: null,
        isDeleted: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      vi.mocked(prisma.qotwQuestion.create).mockResolvedValue(mockQuestion);

      await qotwService.submitQuestion({
        question: '  Test question  ',
        guildId: mockGuildId,
        submitterId: mockUserId,
        submitterUsername: 'testuser#0001',
      });

      expect(prisma.qotwQuestion.create).toHaveBeenCalledWith({
        data: {
          question: 'Test question', // Trimmed
          guildId: mockGuildId,
          submitterId: mockUserId,
          submitterUsername: 'testuser#0001',
        },
      });
    });
  });

  describe('canModifyQuestion - Permission checks', () => {
    it('should allow owner to modify', () => {
      const question = {
        submitterId: mockUserId,
      } as QotwQuestion;

      expect(qotwService.canModifyQuestion(question, mockUserId, false)).toBe(true);
    });

    it('should allow admin to modify', () => {
      const question = {
        submitterId: 'other-user',
      } as QotwQuestion;

      expect(qotwService.canModifyQuestion(question, mockUserId, true)).toBe(true);
    });

    it('should deny non-owner non-admin', () => {
      const question = {
        submitterId: 'other-user',
      } as QotwQuestion;

      expect(qotwService.canModifyQuestion(question, mockUserId, false)).toBe(false);
    });
  });
});
