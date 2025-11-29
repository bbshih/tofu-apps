/**
 * @seacalendar/shared
 * Shared types, utilities, and validation for SeaCalendar
 */

// Export types
export * from './types/index.js';

// Export utilities (client-safe only)
export * from './utils/dateHelpers';

// Server-only utilities - exported for API/bot use
export {
  parseDateFromNaturalLanguage,
  parseEventDescriptionSmart,
  parseEventDescriptionAdvanced,
  parseEventDescription,
  formatDateOption,
  validateParsedEvent,
  type ParsedEvent,
} from './utils/nlpDateParser.js';

// Export validation schemas (will add later with Zod)
// export * from './validation';
