/**
 * Rate limiting middleware
 */

import rateLimit from 'express-rate-limit';
import { Config } from '../config.js';

// General rate limiter (100 requests per minute)
export const generalLimiter = rateLimit({
  windowMs: Config.rateLimit.windowMs,
  max: Config.rateLimit.max,
  standardHeaders: Config.rateLimit.standardHeaders,
  legacyHeaders: Config.rateLimit.legacyHeaders,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
});

// Auth rate limiter (10 requests per minute)
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Poll creation rate limiter (10 per hour)
export const pollCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many polls created, please try again later',
  },
});

// Vote submission rate limiter (30 per minute)
export const voteLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many votes submitted, please slow down',
  },
});

// LLM parsing rate limiter (20 per hour to control API costs)
export const llmParsingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many parsing requests, please try again later',
  },
});
