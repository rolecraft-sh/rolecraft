# rolecraft — Development Guidelines

## Workflow
- Before starting any task, ensure you're on `main` with latest changes (`git checkout main && git pull`), then create a new branch specific to the task (`git checkout -b feat/my-feature` or `fix/my-bug`)
- Complete all work on the feature branch
- After completing the work, run the tests: `node --test --test-concurrency=1`
- Never leave changes that break tests
- Write tests for new features
- Update documentation (README, CONTRIBUTING, docs/) when needed
- Test the `--dry-run` flag if the feature supports it
- After tests pass, commit the changes, push the branch, and open a PR

## Code style
- Keep the zero-dependency principle (don't add new dependencies to package.json)
- Use ES modules (`import`/`export`, no `require`)
- Prefer built-in modules like `node:fs`, `node:path`
- Tests are written with `node:test` and `node:assert`
