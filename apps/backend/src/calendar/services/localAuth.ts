import bcrypt from 'bcrypt';
import { prisma } from '../prisma.js';
import { ErrorFactory } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 12;
const DISCORD_LINK_DAYS = 7; // Days to link Discord account

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface LoginData {
  username: string;
  password: string;
}

export const localAuthService = {
  /**
   * Register a new user with username/password
   * Requires Discord link within 7 days
   */
  async register(data: RegisterData) {
    const { username, email, password } = data;

    // Validate username format (alphanumeric, underscores, hyphens, 3-20 chars)
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      throw ErrorFactory.badRequest(
        'Invalid username format. Use 3-20 alphanumeric characters, underscores, or hyphens.'
      );
    }

    // Validate password strength (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      throw ErrorFactory.badRequest(
        'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.'
      );
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw ErrorFactory.badRequest('Username already taken');
    }

    // Check if email already exists
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email },
      });

      if (existingEmail) {
        throw ErrorFactory.badRequest('Email already registered');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user with Discord link deadline
    const discordLinkDeadline = new Date();
    discordLinkDeadline.setDate(discordLinkDeadline.getDate() + DISCORD_LINK_DAYS);

    const user = await prisma.user.create({
      data: {
        username,
        email: email || undefined,
        passwordHash,
        requireDiscordLink: true,
        discordLinkDeadline,
        preferences: {
          create: {}, // Default preferences
        },
        authProviders: {
          create: {
            provider: 'LOCAL',
            providerId: username, // Use username as provider ID for LOCAL auth
          },
        },
      },
      include: {
        preferences: true,
        authProviders: true,
      },
    });

    return user;
  },

  /**
   * Authenticate user with username/password
   */
  async login(data: LoginData) {
    const { username, password } = data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        preferences: true,
        authProviders: {
          where: { provider: 'LOCAL' },
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw ErrorFactory.unauthorized('Invalid username or password');
    }

    // Check if account is active
    if (!user.isActive) {
      throw ErrorFactory.forbidden('Account is disabled');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw ErrorFactory.unauthorized('Invalid username or password');
    }

    // Check Discord link deadline
    if (user.requireDiscordLink && user.discordLinkDeadline) {
      const now = new Date();
      if (now > user.discordLinkDeadline && !user.discordId) {
        throw ErrorFactory.forbidden(
          `Account requires Discord linking. Deadline was ${user.discordLinkDeadline.toLocaleDateString()}.`
        );
      }
    }

    return user;
  },

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw ErrorFactory.notFound('User not found or does not have password auth');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValid) {
      throw ErrorFactory.unauthorized('Current password is incorrect');
    }

    // Validate new password strength
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      throw ErrorFactory.badRequest(
        'New password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.'
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  },

  /**
   * Request password reset (generates a token)
   * TODO: Implement email sending in future
   */
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if email exists (security)
    if (!user) {
      return { success: true, message: 'If email exists, reset link sent' };
    }

    // TODO: Generate password reset token and send email
    // For now, return success message
    return { success: true, message: 'Password reset not yet implemented' };
  },
};
