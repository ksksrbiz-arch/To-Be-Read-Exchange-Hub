# Contributing Guide

Thank you for considering contributing to To-Be-Read Exchange Hub! This guide outlines the workflow, standards, and tooling to help you make effective contributions.

## 📜 Code of Conduct

Please be respectful and foster an inclusive environment. Harassment or discrimination of any kind is not tolerated.

## 🛠 Development Workflow

1. Fork the repository (if external) or create a feature branch (if internal):
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/your-feature-name
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development mode:
   ```bash
   npm run dev
   ```
4. Keep tests green while coding:
   ```bash
   npm run test:watch
   ```
5. Before committing ensure quality gates pass:
   ```bash
   npm run verify
   ```
6. Commit with a clear conventional message:
   ```bash
   git add .
   git commit -m "feat(bulk): add batch validation improvements"
   ```
7. Push and open a Pull Request:
   ```bash
   git push origin feat/your-feature-name
   ```

## 🧪 Testing Standards

We maintain high test coverage thresholds (Statements ≥80%, Branches ≥70%, Functions ≥90%, Lines ≥80%). New features should include:

- Unit tests for pure logic (services, utils)
- Integration tests for routes/controllers
- Negative/edge case tests (validation failures, partial successes)

Run full test suite:
```bash
npm test
```

Watch mode for rapid iteration:
```bash
npm run test:watch
```

## 🐞 Debugging

Debug configurations are provided in `.vscode/launch.json`:

- `Launch Server (Local)`: Starts `src/server.js` with inspector
- `Attach to Docker App`: Attach to running container (ensure port 9229 mapped)
- `Jest Tests (Debug)`: Step through tests using `--inspect-brk`

Start debug server quickly:
```bash
npm run debug
```

Set breakpoints in:
- `src/controllers/bulkController.js` (bulk import/update)
- `src/services/enrichment.js` (API merge logic)
- `src/services/inventory.js` (location determination)

## 📦 Tasks Automation

Common tasks are available via VS Code (Command Palette → Run Task):
- `lint`: ESLint static analysis
- `test`: Run full test suite
- `test:watch`: Watch mode
- `debug-run`: Start server with inspector

## 🧹 Code Style & Linting

Enforced via ESLint and Prettier.
- Run lint: `npm run lint`
- Format code: `npm run format`
- Check formatting: `npm run format:check`

No lint warnings are allowed (CI will fail). Fix issues before pushing.

## 🗃 Database & Environment

Initialize DB:
```bash
npm run db:init
```

Copy and edit environment variables:
```bash
cp .env.example .env
```

## 🔐 Security Considerations

- Never commit secrets or real credentials
- Validate all inputs (use existing validation middleware)
- Avoid adding new external dependencies without review
- Prefer parameterized queries (use `pg` placeholders) for DB safety

## 🧾 Commit Message Conventions

Follow Conventional Commits:
- `feat(scope): summary` — New feature
- `fix(scope): summary` — Bug fix
- `docs(scope): summary` — Documentation changes
- `test(scope): summary` — Test additions/updates
- `refactor(scope): summary` — Code improvement without behavior change
- `chore(scope): summary` — Maintenance tasks

Example:
```bash
git commit -m "fix(inventory): correct section allocation when shelf full"
```

## ✅ Pull Request Checklist

Before marking ready for review:
- [ ] Branch up to date with `main`
- [ ] Added/updated tests passing locally
- [ ] No lint errors & formatting applied
- [ ] Updated README/Swagger docs if public API changed
- [ ] No sensitive info committed

## 🤖 Continuous Integration (CI)

A GitHub Actions workflow runs on pushes and PRs:
- Installs dependencies (`npm ci`)
- Runs linting
- Executes tests with coverage
- Uploads coverage report artifact
- Opens an issue automatically if pipeline fails

You can view runs under the Actions tab.

## 📄 Documentation Updates

If you add or modify endpoints:
- Update Swagger annotations in route files
- Re-run server and verify `/api-docs`
- Reflect changes in README under relevant API sections

## 🐘 Large Changes Strategy

For broad modifications (e.g., schema changes, architectural refactors):
1. Open an issue describing rationale, impact, migration steps
2. Propose phased approach (migration scripts, backward compatibility)
3. Seek feedback before implementation

## 💬 Getting Help

Open an issue with:
- Clear title
- Steps to reproduce (if bug)
- Expected vs actual behavior
- Logs or error messages
- Environment details (Node version, OS)

## 🙏 Thanks

Your contributions help build a robust platform for book exchange communities. Thank you for improving To-Be-Read Exchange Hub!
