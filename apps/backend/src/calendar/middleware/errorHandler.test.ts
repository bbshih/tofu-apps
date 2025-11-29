/**
 * Error Handler Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  ApiError,
  ErrorFactory,
  asyncHandler,
  errorHandler,
  notFoundHandler,
} from './errorHandler';
import { ZodError, z } from 'zod';

describe('ErrorHandler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockReq = {
      method: 'GET',
      url: '/api/test',
      path: '/api/test',
    };

    mockRes = {
      status: statusMock as any,
      json: jsonMock,
    };

    mockNext = vi.fn();
  });

  describe('ApiError', () => {
    it('should create ApiError with correct properties', () => {
      const error = new ApiError(400, 'Bad request');

      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
      expect(error.isOperational).toBe(true);
    });

    it('should set isOperational to false when specified', () => {
      const error = new ApiError(500, 'Internal error', false);

      expect(error.isOperational).toBe(false);
    });

    it('should capture stack trace', () => {
      const error = new ApiError(404, 'Not found');

      expect(error.stack).toBeDefined();
    });
  });

  describe('ErrorFactory', () => {
    it('should create badRequest error (400)', () => {
      const error = ErrorFactory.badRequest('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('should create unauthorized error (401)', () => {
      const error = ErrorFactory.unauthorized();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    it('should create unauthorized error with custom message', () => {
      const error = ErrorFactory.unauthorized('Token expired');

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Token expired');
    });

    it('should create forbidden error (403)', () => {
      const error = ErrorFactory.forbidden();

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });

    it('should create notFound error (404)', () => {
      const error = ErrorFactory.notFound();

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
    });

    it('should create conflict error (409)', () => {
      const error = ErrorFactory.conflict('User already exists');

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('User already exists');
    });

    it('should create tooManyRequests error (429)', () => {
      const error = ErrorFactory.tooManyRequests();

      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Too many requests');
    });

    it('should create internal error (500)', () => {
      const error = ErrorFactory.internal();

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
      expect(error.isOperational).toBe(false);
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async function', async () => {
      const asyncFn = vi.fn(async () => {
        return 'success';
      });

      const handler = asyncHandler(asyncFn);
      await handler(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch errors and pass to next', async () => {
      const error = new Error('Test error');
      const asyncFn = vi.fn(async () => {
        throw error;
      });

      const handler = asyncHandler(asyncFn);
      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle ApiError in async function', async () => {
      const error = ErrorFactory.notFound('Poll not found');
      const asyncFn = vi.fn(async () => {
        throw error;
      });

      const handler = asyncHandler(asyncFn);
      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('errorHandler', () => {
    it('should handle ApiError correctly', () => {
      const error = new ApiError(404, 'Poll not found');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Poll not found',
        })
      );
    });

    it('should handle ZodError with validation details', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      try {
        schema.parse({ email: 'invalid', age: 10 });
      } catch (err) {
        errorHandler(err as ZodError, mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Validation error',
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: expect.any(String),
                message: expect.any(String),
              }),
            ]),
          })
        );
      }
    });

    it('should handle JWT errors', () => {
      const error = new Error('Invalid signature');
      error.name = 'JsonWebTokenError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid token',
        })
      );
    });

    it('should handle token expiration', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Token expired',
        })
      );
    });

    it('should handle generic errors as 500', () => {
      const error = new Error('Database connection failed');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error',
        })
      );
    });

    it('should not include stack trace in test environment', () => {
      // In test mode, Config.isDevelopment is false, so stack shouldn't be included
      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const callArg = jsonMock.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('stack');
      expect(callArg).toHaveProperty('success', false);
      expect(callArg).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 for unknown routes', () => {
      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Route GET /api/test not found',
      });
    });

    it('should handle different HTTP methods', () => {
      mockReq.method = 'POST';
      mockReq.path = '/api/unknown';

      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Route POST /api/unknown not found',
      });
    });
  });

  describe('error handling edge cases', () => {
    it('should handle errors without message', () => {
      const error = new Error();

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalled();
    });

    it('should handle non-Error objects', () => {
      const error = 'String error' as any;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalled();
    });

    it('should properly format Zod field paths', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1),
          }),
        }),
      });

      try {
        schema.parse({ user: { profile: { name: '' } } });
      } catch (err) {
        errorHandler(err as ZodError, mockReq as Request, mockRes as Response, mockNext);

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'user.profile.name',
              }),
            ]),
          })
        );
      }
    });
  });
});
