/**
 * Utility Routes
 * Shared utility endpoints like date parsing
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  parseDateFromNaturalLanguage,
  parseEventDescriptionSmart,
  parseEventDescriptionAdvanced,
} from '@seacalendar/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { llmParsingLimiter } from '../middleware/rateLimit.js';
import { validateDateInput } from '../middleware/inputValidation.js';
import { format } from 'date-fns';

const router = Router();

// Validation schema
const parseDateSchema = z.object({
  input: z.string().min(1).max(200),
});

/**
 * POST /api/utils/parse-dates
 * Parse natural language date input into ISO date strings (legacy)
 * Public endpoint - no auth required
 */
router.post(
  '/parse-dates',
  asyncHandler(async (req, res) => {
    const { input } = parseDateSchema.parse(req.body);

    const dates = parseDateFromNaturalLanguage(input);

    res.json({
      success: true,
      data: {
        input,
        dates,
      },
    });
  })
);

/**
 * POST /api/utils/parse-event
 * Parse natural language event description with smart LLM fallback
 * Public endpoint - no auth required
 * Rate limited to prevent API cost abuse
 */
router.post(
  '/parse-event',
  llmParsingLimiter,
  validateDateInput,
  asyncHandler(async (req, res) => {
    const { input } = parseDateSchema.parse(req.body);

    const parsed = await parseEventDescriptionSmart(input);

    res.json({
      success: true,
      data: {
        title: parsed.title,
        dates: parsed.dates.map((d) => format(d, 'yyyy-MM-dd')),
        times: parsed.times,
        description: parsed.description,
      },
    });
  })
);

/**
 * POST /api/utils/parse-event-advanced
 * Parse with LLM and return structured date ranges (advanced)
 * Public endpoint - no auth required
 * Rate limited to prevent API cost abuse
 */
router.post(
  '/parse-event-advanced',
  llmParsingLimiter,
  validateDateInput,
  asyncHandler(async (req, res) => {
    const { input } = parseDateSchema.parse(req.body);

    const parsed = await parseEventDescriptionAdvanced(input);

    res.json({
      success: true,
      data: parsed,
    });
  })
);

export default router;
