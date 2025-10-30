## Description
<!-- Provide a clear and concise description of your changes -->



## Type of Change
<!-- Mark the relevant option with an "x" -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🔧 Configuration change
- [ ] ♻️ Code refactoring
- [ ] 🧪 Test update
- [ ] 🚀 Performance improvement
- [ ] 🔒 Security fix

## Related Issue
<!-- Link to related issue(s) if applicable -->
Closes #(issue number)

## Quality Checklist
<!-- Verify all items before requesting review -->

### Code Quality
- [ ] Code follows project style guidelines (`npm run lint` passes)
- [ ] Code is formatted correctly (`npm run format:check` passes)
- [ ] No new linting warnings introduced
- [ ] Self-review of code completed

### Testing
- [ ] All existing tests pass (`npm test`)
- [ ] New tests added for new functionality/bug fixes
- [ ] Test coverage maintained or improved (≥88% statements)
- [ ] Edge cases considered and tested
- [ ] Smoke tests pass (`npm run smoke`)

### Documentation
- [ ] Code is self-documenting with clear variable/function names
- [ ] Complex logic includes explanatory comments
- [ ] README updated (if needed)
- [ ] API documentation updated (if endpoints changed)
- [ ] ENTERPRISE.md updated (if observability/security changes)

### Security & Performance
- [ ] No sensitive data exposed (API keys, passwords, tokens)
- [ ] Input validation added for new user inputs
- [ ] Security headers verified (if middleware changes)
- [ ] No performance regressions introduced
- [ ] Database queries optimized (if applicable)

### Deployment Readiness
- [ ] Environment variables documented in `.env.example` (if new ones added)
- [ ] Database migrations tested (if schema changes)
- [ ] Backward compatibility maintained (or breaking change documented)
- [ ] Feature flags used for risky changes (if applicable)
- [ ] Docker build succeeds (`docker build -t test .`)

## How Has This Been Tested?
<!-- Describe the testing approach -->

**Test Environment:**
- OS: 
- Node version: 
- PostgreSQL version: 

**Test Steps:**
1. 
2. 
3. 

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->


## Additional Context
<!-- Any other context, concerns, or notes for reviewers -->


## Deployment Notes
<!-- Special instructions for deployment, if any -->


---

### For Reviewers
- [ ] Code review completed
- [ ] Tests verified locally
- [ ] Documentation reviewed
- [ ] Security implications considered
- [ ] Performance implications assessed
