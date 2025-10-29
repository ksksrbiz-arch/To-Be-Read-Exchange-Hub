# Testing Strategy

This document describes the testing approach for the To-Be-Read Exchange Hub.

## Goals
- High confidence in core inventory, enrichment, sync, and validation logic.
- Fast feedback (tests run <5s locally).
- Clear separation of unit vs integration concerns.
- Explicitly document intentionally skipped client-only behaviors.

## Current Coverage Summary
(Generated via `npm test`)
- Statements: ~86%
- Branches: ~79%
- Functions: ~95%
- Lines: ~86%

## Test Types
| Type | Scope | Tools | Examples |
|------|-------|-------|----------|
| Unit | Pure functions, isolated service logic | Jest + mocks | `enrichment.test.js`, `inventory.test.js` |
| Integration | Express routes with middleware orchestration | Supertest | `api.test.js`, `sync.test.js` |
| Defensive | Error paths, null/edge handling | Jest | `guards.test.js` |
| Health | System readiness endpoints | Supertest | `health.test.js` |

## Intentional Exclusions
Some functionality lives purely in the browser (client-side only) and is not covered by the Node/Jest suite:
- Dynamic search/filter/sort (implemented in `public/js/app.js`)
- Export (CSV/JSON) generation client-side
- Modal open/close UI state logic

These would require a browser automation tool (Playwright/Cypress) to validate. For now they are excluded to keep backend test suite lean.

## Adding Browser Tests (Future)
If/when end-to-end coverage is desired:
1. Introduce Playwright.
2. Spin up server via `docker-compose` in CI.
3. Run UI flows (add book, search, filter, export).

## Rate Limiting Tests (Planned)
Will exercise exceeding configured limits (e.g., >100 requests within window) and assert 429 response plus message.

## Error Middleware Tests (Planned)
Trigger a thrown error inside a dummy route and assert standardized JSON shape: `{ error: 'Something went wrong!' }` plus message.

## Coverage Thresholds
Located in `jest.config.js`:
```js
coverageThreshold: {
  global: { statements: 60, branches: 40, functions: 40, lines: 60 }
}
```
Roadmap:
- Raise to 70% after adding rate limit + error middleware tests.
- Target 80% once frontend logic is server-abstracted (if ever).

## Test Data Strategy
- Mock DB interactions via `pool.query = jest.fn()`.
- Avoid mutating real PostgreSQL state during unit tests.
- Use simple deterministic payloads and explicit ISBN samples.

## Performance Note
Full suite completes in ~4.5s. If time rises >10s, investigate parallelization or heavy I/O in tests.

## How To Write a New Test
1. Identify layer (service vs route).
2. Mock external dependencies (DB, HTTP clients).
3. Keep assertions focused (one concern per test).
4. Name test clearly ("should X when Y").

## Maintenance Guidelines
- When adding a new route, add at least: happy path + 1 failure path test.
- Keep mocks local to each test for isolation.
- Avoid relying on execution order.

## Open Items
- [ ] Rate limit tests
- [ ] Error middleware test
- [ ] Validation extreme edge cases
- [ ] Sync history empty result test
- [ ] Negative enrichment partial data test (no publisher, only Google fallback)

## Conclusion
Backend test coverage is strong and focused. Documented exclusions prevent ambiguity about missing areas. Incrementally expanding into rate limiting and error middleware will further harden reliability.
