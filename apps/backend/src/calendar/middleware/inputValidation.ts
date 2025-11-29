/**
 * Input validation and security middleware
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Validate date parsing input for security and relevance
 */
export function validateDateInput(req: Request, res: Response, next: NextFunction) {
  const input = req.body.input as string;

  if (!input || typeof input !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Input is required and must be a string',
    });
  }

  // Length check (already in Zod but double-check)
  if (input.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'Input too long (max 200 characters)',
    });
  }

  // Must contain date-related keywords or numbers
  const dateKeywords =
    /\b(today|tomorrow|yesterday|next|this|last|weekend|week|month|year|day|date|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|q[1-4]|\d{1,2}[/-]\d{1,2}|\d{4}|am|pm|morning|afternoon|evening|night|noon|midnight)\b/i;

  if (!dateKeywords.test(input)) {
    return res.status(400).json({
      success: false,
      message: 'Input must contain date or time-related information (e.g., dates, days, times)',
    });
  }

  // Block common prompt injection patterns
  const suspiciousPatterns = [
    // System manipulation
    /\b(ignore|disregard|forget|override)\s+(previous|above|prior|earlier|system|instructions?|prompts?|rules?)\b/i,
    // Role manipulation
    /\b(you\s+are\s+now|act\s+as|pretend\s+to\s+be|role\s*play|behave\s+like)\b/i,
    // Information extraction
    /\b(tell\s+me|show\s+me|reveal|expose|display)\s+(your|the)\s+(system|prompt|instructions?|api[_\s]?key|token|password|secret)\b/i,
    // Command injection
    /[;`$]|<script|javascript:|data:|vbscript:/i,
    // Excessive special characters (potential obfuscation)
    /([^\w\s]{5,})/,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      console.warn(
        `[SECURITY] Suspicious input detected from ${req.ip}: ${input.substring(0, 50)}`
      );
      return res.status(400).json({
        success: false,
        message: 'Invalid input format',
      });
    }
  }

  // Sanitize: trim and normalize whitespace
  req.body.input = input.trim().replace(/\s+/g, ' ');

  next();
}
