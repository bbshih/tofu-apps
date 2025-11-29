/**
 * Unit tests for /question command (QOTW)
 * Tests question management, security, and button interactions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  ComponentType,
  ButtonStyle,
} from 'discord.js';
import { execute } from './qotw.js';
import * as qotwService from '../services/qotwService.js';
import type { QotwQuestion } from '@seacalendar/database';

// Mock the service
vi.mock('../services/qotwService.js');

describe('/question command', () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;
  let mockDeferReply: ReturnType<typeof vi.fn>;
  let mockEditReply: ReturnType<typeof vi.fn>;
  let mockReply: ReturnType<typeof vi.fn>;
  let mockFollowUp: ReturnType<typeof vi.fn>;

  const mockGuildId = '987654321';
  const mockUserId = '123456789';
  const mockOtherUserId = '111111111';

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeferReply = vi.fn().mockResolvedValue(undefined);
    mockEditReply = vi.fn().mockResolvedValue({
      createMessageComponentCollector: vi.fn().mockReturnValue({
        on: vi.fn(),
        stop: vi.fn(),
      }),
    });
    mockReply = vi.fn().mockResolvedValue(undefined);
    mockFollowUp = vi.fn().mockResolvedValue(undefined);

    mockInteraction = {
      guildId: mockGuildId,
      user: {
        id: mockUserId,
        username: 'testuser',
        tag: 'testuser#0001',
      } as any,
      member: {
        permissions: {
          has: vi.fn().mockReturnValue(false),
        },
      } as any,
      options: {
        getSubcommand: vi.fn(),
        getString: vi.fn(),
        getInteger: vi.fn(),
      } as any,
      deferReply: mockDeferReply,
      editReply: mockEditReply,
      reply: mockReply,
      followUp: mockFollowUp,
    };
  });

  describe('Guild validation (CVE-4 fix)', () => {
    it('should reject commands used in DMs', async () => {
      mockInteraction.guildId = null;
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('submit');

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockReply).toHaveBeenCalledWith({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
      expect(mockDeferReply).not.toHaveBeenCalled();
    });

    it('should allow commands in guilds', async () => {
      mockInteraction.guildId = mockGuildId;
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('list');
      vi.mocked(qotwService.listQuestions).mockResolvedValue({
        questions: [],
        total: 0,
        page: 1,
        pages: 0,
      });

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockReply).not.toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('only be used in a server'),
        })
      );
      expect(mockDeferReply).toHaveBeenCalled();
    });
  });

  describe('/question mine', () => {
    it('should show user their own questions', async () => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('mine');

      const mockQuestions: QotwQuestion[] = [
        {
          id: 'q1',
          question: 'Test question 1',
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
        {
          id: 'q2',
          question: 'Test question 2',
          guildId: mockGuildId,
          submitterId: mockUserId,
          submitterUsername: 'testuser#0001',
          submittedAt: new Date('2025-01-02'),
          timesAsked: 1,
          lastAskedAt: new Date('2025-01-10'),
          isDeleted: false,
          createdAt: new Date('2025-01-02'),
          updatedAt: new Date('2025-01-02'),
        },
      ];

      vi.mocked(qotwService.listQuestions).mockResolvedValue({
        questions: [
          ...mockQuestions,
          // Add other user's question
          {
            ...mockQuestions[0],
            id: 'q3',
            submitterId: mockOtherUserId,
            submitterUsername: 'otheruser#0002',
          },
        ],
        total: 3,
        page: 1,
        pages: 1,
      });

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockDeferReply).toHaveBeenCalledWith({ ephemeral: true });
      expect(qotwService.listQuestions).toHaveBeenCalledWith(mockGuildId, 1, 1000);

      // Should only show user's questions
      const editCall = mockEditReply.mock.calls[0][0];
      expect(editCall.embeds[0].data.title).toContain('Your Questions');
      expect(editCall.embeds[0].data.footer.text).toBe('2 total');
      expect(editCall.embeds[0].data.description).toContain('Test question 1');
      expect(editCall.embeds[0].data.description).toContain('Test question 2');
      expect(editCall.embeds[0].data.description).not.toContain('q3');
    });

    it('should show delete buttons for user questions', async () => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('mine');

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

      vi.mocked(qotwService.listQuestions).mockResolvedValue({
        questions: [mockQuestion],
        total: 1,
        page: 1,
        pages: 1,
      });

      await execute(mockInteraction as ChatInputCommandInteraction);

      const editCall = mockEditReply.mock.calls[0][0];
      expect(editCall.components).toBeDefined();
      expect(editCall.components.length).toBeGreaterThan(0);

      const buttons = editCall.components[0].components;
      expect(buttons[0].data.label).toBe('Delete #1');
      expect(buttons[0].data.style).toBe(ButtonStyle.Danger);
      expect(buttons[0].data.custom_id).toBe('qotw_delete_mine_q1');
    });

    it('should show message when user has no questions', async () => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('mine');

      vi.mocked(qotwService.listQuestions).mockResolvedValue({
        questions: [],
        total: 0,
        page: 1,
        pages: 0,
      });

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith({
        content: expect.stringContaining("haven't submitted any questions"),
      });
    });
  });

  describe('/question list with delete buttons', () => {
    it("should show delete buttons only for user's own questions", async () => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('list');
      (mockInteraction.options!.getInteger as any).mockReturnValue(1);

      const mockQuestions: QotwQuestion[] = [
        {
          id: 'q1',
          question: 'My question',
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
        {
          id: 'q2',
          question: 'Someone else question',
          guildId: mockGuildId,
          submitterId: mockOtherUserId,
          submitterUsername: 'otheruser#0002',
          submittedAt: new Date('2025-01-02'),
          timesAsked: 0,
          lastAskedAt: null,
          isDeleted: false,
          createdAt: new Date('2025-01-02'),
          updatedAt: new Date('2025-01-02'),
        },
      ];

      vi.mocked(qotwService.listQuestions).mockResolvedValue({
        questions: mockQuestions,
        total: 2,
        page: 1,
        pages: 1,
      });

      await execute(mockInteraction as ChatInputCommandInteraction);

      const editCall = mockEditReply.mock.calls[0][0];

      // Should mark user's questions with ✏️
      expect(editCall.embeds[0].data.description).toContain('✏️');

      // Should only have 1 delete button (for user's question)
      expect(editCall.components).toBeDefined();
      expect(editCall.components.length).toBe(1);
      expect(editCall.components[0].components.length).toBe(1);
      expect(editCall.components[0].components[0].data.custom_id).toBe('qotw_delete_q1');
    });

    it('should not show delete buttons when user has no questions', async () => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('list');

      const mockQuestion: QotwQuestion = {
        id: 'q1',
        question: 'Someone else question',
        guildId: mockGuildId,
        submitterId: mockOtherUserId,
        submitterUsername: 'otheruser#0002',
        submittedAt: new Date('2025-01-01'),
        timesAsked: 0,
        lastAskedAt: null,
        isDeleted: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      vi.mocked(qotwService.listQuestions).mockResolvedValue({
        questions: [mockQuestion],
        total: 1,
        page: 1,
        pages: 1,
      });

      await execute(mockInteraction as ChatInputCommandInteraction);

      const editCall = mockEditReply.mock.calls[0][0];
      expect(editCall.components).toEqual([]);
    });
  });

  describe('Security: Delete button ownership validation (CVE-2 fix)', () => {
    it('should validate ownership before deleting in handleList', async () => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('list');

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

      vi.mocked(qotwService.listQuestions).mockResolvedValue({
        questions: [mockQuestion],
        total: 1,
        page: 1,
        pages: 1,
      });

      const mockCollector = {
        on: vi.fn(),
        stop: vi.fn(),
      };

      mockEditReply.mockResolvedValue({
        createMessageComponentCollector: vi.fn().mockReturnValue(mockCollector),
      });

      await execute(mockInteraction as ChatInputCommandInteraction);

      // Verify collector was created
      const responseValue = await mockEditReply.mock.results[0].value;
      expect(responseValue.createMessageComponentCollector).toHaveBeenCalledWith(
        expect.objectContaining({
          componentType: ComponentType.Button,
          time: 300_000,
        })
      );

      // Get the collector callback
      const collectorCallback = mockCollector.on.mock.calls[0][1];

      // Simulate button click from different user trying to delete
      const mockButtonInteraction: Partial<ButtonInteraction> = {
        customId: 'qotw_delete_q1',
        user: {
          id: mockOtherUserId, // Different user!
          username: 'attacker',
          tag: 'attacker#0003',
        } as any,
        deferUpdate: vi.fn().mockResolvedValue(undefined),
        followUp: vi.fn().mockResolvedValue(undefined),
      };

      // Mock getQuestion to return the question with original owner
      vi.mocked(qotwService.getQuestion).mockResolvedValue(mockQuestion);

      await collectorCallback(mockButtonInteraction);

      // Should reject deletion
      expect(mockButtonInteraction.followUp).toHaveBeenCalledWith({
        content: '❌ You can only delete your own questions',
        ephemeral: true,
      });
      expect(qotwService.deleteQuestion).not.toHaveBeenCalled();
    });

    it('should allow deletion when user owns the question', async () => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('mine');

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

      vi.mocked(qotwService.listQuestions).mockResolvedValue({
        questions: [mockQuestion],
        total: 1,
        page: 1,
        pages: 1,
      });

      const mockCollector = {
        on: vi.fn(),
        stop: vi.fn(),
      };

      mockEditReply.mockResolvedValue({
        createMessageComponentCollector: vi.fn().mockReturnValue(mockCollector),
      });

      await execute(mockInteraction as ChatInputCommandInteraction);

      const collectorCallback = mockCollector.on.mock.calls[0][1];

      const mockButtonInteraction: Partial<ButtonInteraction> = {
        customId: 'qotw_delete_mine_q1',
        user: {
          id: mockUserId, // Same user
          username: 'testuser',
          tag: 'testuser#0001',
        } as any,
        deferUpdate: vi.fn().mockResolvedValue(undefined),
        followUp: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(qotwService.getQuestion).mockResolvedValue(mockQuestion);
      vi.mocked(qotwService.deleteQuestion).mockResolvedValue();

      await collectorCallback(mockButtonInteraction);

      // Should allow deletion
      expect(qotwService.deleteQuestion).toHaveBeenCalledWith('q1', mockGuildId);
      expect(mockButtonInteraction.followUp).toHaveBeenCalledWith({
        content: '✅ Question deleted',
        ephemeral: true,
      });
    });
  });

  describe('Error handling (CVE-5 fix)', () => {
    it('should not expose internal error details', async () => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('list');

      // Simulate database error
      vi.mocked(qotwService.listQuestions).mockRejectedValue(
        new Error('Database connection failed: password incorrect for user postgres')
      );

      await execute(mockInteraction as ChatInputCommandInteraction);

      // Should show generic error, not database details
      expect(mockEditReply).toHaveBeenCalledWith({
        content: '❌ Error loading questions',
      });
    });
  });

  describe('Admin permission checks', () => {
    it('should block non-admin from admin commands', async () => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('setup');
      (mockInteraction.member!.permissions!.has as any).mockReturnValue(false);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockReply).toHaveBeenCalledWith({
        content: '❌ Only administrators can use this command.',
        ephemeral: true,
      });
    });

    it('should allow admin to use admin commands', async () => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('enable');
      (mockInteraction.member!.permissions!.has as any).mockReturnValue(true);

      vi.mocked(qotwService.updateConfig).mockResolvedValue({} as any);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockReply).not.toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Only administrators'),
        })
      );
      expect(mockDeferReply).toHaveBeenCalled();
    });
  });
});
