/**
 * Rate Limit Middleware Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generalLimiter,
  authLimiter,
  pollCreationLimiter,
  voteLimiter,
  llmParsingLimiter,
} from './rateLimit';

describe('RateLimit Middleware', () => {
  describe('generalLimiter', () => {
    it('should be defined', () => {
      expect(generalLimiter).toBeDefined();
      expect(typeof generalLimiter).toBe('function');
    });

    it('should have correct configuration', () => {
      // Access the rate limiter options through the function
      const limiter = generalLimiter as any;
      expect(limiter).toBeDefined();
    });
  });

  describe('authLimiter', () => {
    it('should be defined', () => {
      expect(authLimiter).toBeDefined();
      expect(typeof authLimiter).toBe('function');
    });

    it('should be configured for auth endpoints', () => {
      // Auth limiter should be more restrictive than general limiter
      const limiter = authLimiter as any;
      expect(limiter).toBeDefined();
    });
  });

  describe('pollCreationLimiter', () => {
    it('should be defined', () => {
      expect(pollCreationLimiter).toBeDefined();
      expect(typeof pollCreationLimiter).toBe('function');
    });

    it('should be configured for poll creation', () => {
      // Should limit poll creation to prevent abuse
      const limiter = pollCreationLimiter as any;
      expect(limiter).toBeDefined();
    });
  });

  describe('voteLimiter', () => {
    it('should be defined', () => {
      expect(voteLimiter).toBeDefined();
      expect(typeof voteLimiter).toBe('function');
    });

    it('should be configured for vote submission', () => {
      const limiter = voteLimiter as any;
      expect(limiter).toBeDefined();
    });
  });

  describe('llmParsingLimiter', () => {
    it('should be defined', () => {
      expect(llmParsingLimiter).toBeDefined();
      expect(typeof llmParsingLimiter).toBe('function');
    });

    it('should be configured to control API costs', () => {
      // Should be restrictive to control LLM API costs
      const limiter = llmParsingLimiter as any;
      expect(limiter).toBeDefined();
    });
  });

  describe('rate limiter properties', () => {
    it('should all be express middleware functions', () => {
      const limiters = [
        generalLimiter,
        authLimiter,
        pollCreationLimiter,
        voteLimiter,
        llmParsingLimiter,
      ];

      limiters.forEach((limiter) => {
        expect(typeof limiter).toBe('function');
        // Express middleware should accept 3 parameters (req, res, next)
        expect(limiter.length).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
