# First-Time Setup Optimization Plan

Goal: Reduce cognitive + command overhead for brand new users while keeping enterprise hardening.

## Current Friction Points
1. Multiple entry scripts: `quickstart.sh`, `setup.sh`, `smart-start.sh`, `auto-setup.sh`.
2. Interactive prompts (DB init confirmations) slow CI / unattended installs.
3. Repeated logic (env creation, DB existence checks) across scripts.
4. Health polling duplicated in quickstart and smart-start.
5. Manual password change reminder (could auto-generate with clear next steps).

## Proposed Consolidation

| Action | Change | Benefit |
|--------|--------|---------|
| Single bootstrap | Merge `setup.sh` + minimal path of `quickstart.sh` into `bootstrap.sh` (non-interactive by default) | One mental model |
| Guided mode flag | `./bootstrap.sh --interactive` enables prompts | Keeps simplicity for advanced users |
| Auto password | Generate secure `DB_PASSWORD` if missing | Removes weakest default |
| Fast DB init | Attempt schema load silently; warn only on failure | Less noise |
| Health check util | Extract small function `scripts/lib/health.sh` used by start scripts | DRY |
| Env caching | Skip reinstall if `node_modules` already present and version matches | Faster repeat starts |
| Optional tests | Add flag `--with-tests` (default skip) for first-time speed | Avoid long initial run |

## New Flow
```bash
git clone <repo>
cd To-Be-Read-Exchange-Hub
./bootstrap.sh              # auto env + deps + db + start
# or
./bootstrap.sh --docker     # prefers docker compose path
./bootstrap.sh --interactive # asks user choices
```

## Script Sketch
Key responsibilities:
- Detect Docker availability if `--docker` passed.
- Create `.env` if absent (secure random password).
- Install dependencies (skip if `node_modules` + lock present).
- Initialize DB (silent, log summary).
- Run health check polling (shared lib).
- Launch server (`npm start`).

## Low-Risk Immediate Improvements (without full merge)
1. Add password auto-generation to `setup.sh` when creating `.env`.
2. Remove test run from default setup; move behind `npm run verify` (keeps speed, tests still accessible).
3. Shorten output messaging (less vertical space).
4. In `quickstart.sh`, reduce wait loop max from 30s to 20s; success majority within first 10–12s.

## Future Enhancements
- Cache layer for enrichment (ISBN lookups) on first import to accelerate demo.
- Pre-warmed DB seed option `--seed-demo` (sample books to showcase features).
- OpenTelemetry tracing toggle via `TRACE_ENABLED=1` in `.env`.

## Acceptance Criteria
- New user reaches running UI in ≤ 25 seconds on typical dev laptop.
- Only one clearly recommended command in README.
- No interactive blockers in automated environments (CI, dev containers).
- Security baseline improved (no shipped weak DB password).

## Next Steps
1. Implement low-risk changes in existing scripts.
2. Add `bootstrap.sh` prototype alongside current scripts (non-breaking).
3. Update README to prefer `./bootstrap.sh` once stable.

Feedback welcome—open an issue with tag `setup-optimization`.
