# Calendar E2E Tests

End-to-end tests using Playwright.

## Quick Start

```bash
# First time
npx playwright install

# Run tests
npm run test:e2e

# UI mode
npm run test:e2e:ui

# Headed mode (see browser)
npx playwright test --headed

# Debug
npx playwright test --debug
```

## Test Files

- **complete-flow.spec.ts** - Full flow: create → vote → finalize → download
- **landing-page.spec.ts** - Landing page + responsive design
- **error-scenarios.spec.ts** - Error handling + edge cases

## What's Tested

**Complete Flow:**
- Event creation, voting, results, venue details, finalization, calendar download

**Error Scenarios:**
- Missing keys, 404s, empty events, validation errors

## Reports

```bash
npx playwright show-report
```

Screenshots saved to `test-results/` on failure.
