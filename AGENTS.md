# rolecraft — Development Guidelines

## Workflow
- After completing any task, run the tests: `node --test --test-concurrency=1`
- Never leave changes that break tests
- Write tests for new features
- Update documentation (README, CONTRIBUTING, docs/) when needed
- Test the `--dry-run` flag if the feature supports it

## Code style
- Keep the zero-dependency principle (don't add new dependencies to package.json)
- Use ES modules (`import`/`export`, no `require`)
- Prefer built-in modules like `node:fs`, `node:path`
- Tests are written with `node:test` and `node:assert`
