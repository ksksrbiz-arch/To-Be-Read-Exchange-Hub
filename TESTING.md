# Testing Strategy

This document describes the testing approach for the To-Be-Read Exchange Hub.

## Goals
- High confidence in core inventory, enrichment, sync, and validation logic.
- Fast feedback (tests run <5s locally).
- Clear separation of unit vs integration concerns.
- Explicitly document intentionally skipped client-only behaviors.

## Current Coverage Summary
(Generated via `npm test` - as of test-hardening phase)
- Statements: 88.28%
- Branches: 82.69%
- Functions: 95.65%
- Lines: 88.08%

**Coverage thresholds enforced**: 80/70/90/80 (statements/branches/functions/lines)

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

Updated in `jest.config.js` after test-hardening phase:

```js
coverageThreshold: {
  global: { statements: 80, branches: 70, functions: 90, lines: 80 }
}
```

**Rationale**: Achieved coverage (88.28/82.69/95.65/88.08) significantly exceeds thresholds. Set thresholds conservatively below achieved levels to allow refactoring headroom while enforcing quality floor.

## Test Additions (test-hardening phase)

### Validation Edge Cases
- Extremely long title (>500 chars) → 400
- Invalid ISBN formats (too short, non-numeric) → 400
- Zero quantity → 400
- Missing required quantity → 400

### Operational Negative Cases
- DELETE non-existent book → 404/error response
- Rate limit enforcement (attempts to exceed configured max)

### Enrichment Partial/Fallback
- Open Library partial data (missing authors/publishers)
- Google Books-only enrichment (Open Library empty)

### Sync History Edge Cases
- Empty history (no rows) → empty array
- Database error → 500 response

### Error Middleware
- Thrown errors caught and standardized to JSON error responses

### Enhanced Validation Middleware
- ISBN regex validation (10 or 13 digits)
- Title max length (500 chars)
- Quantity minimum (≥1)

## Skipped Scenarios (with rationale)

**Bulk Create Endpoint**: Not currently implemented. Future implementation will include tests for:
- Partial failures (some books succeed, others fail)
- Transaction rollback semantics
- Enrichment batching optimization

**Rate Limit Stress**: Basic enforcement tested. High-volume concurrent stress testing deferred (requires load testing framework; covered by production monitoring).

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

- [x] Rate limit tests (basic enforcement added)
- [x] Error middleware test (standardized JSON error response)
- [x] Validation extreme edge cases (long title, invalid ISBN, zero/missing quantity)
- [x] Sync history empty result test
- [x] Negative enrichment partial data test (no publisher, Google fallback)

Future enhancements:
- High-concurrency rate limit stress testing (requires load framework)
- Browser-based UI automation (Playwright/Cypress) for search/filter/export
- Bulk create endpoint + transactional failure tests


## Conclusion
Backend test coverage is strong and focused. Documented exclusions prevent ambiguity about missing areas. Incrementally expanding into rate limiting and error middleware will further harden reliability.
