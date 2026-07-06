# rolecraft — Development Guidelines

## ⚠️ STARTUP CHECKLIST (read before every task)

1. `git checkout main && git pull` — start from latest main
2. `git checkout -b feat/my-feature` or `fix/my-bug` — create branch
3. Do all work on the feature branch (never on main)
4. `node --test --test-concurrency=1` — run tests
5. Never leave changes that break tests
6. Write tests for new features
7. Update docs (README, CONTRIBUTING, docs/) when needed
8. Test `--dry-run` flag if the feature supports it
9. `git add ... && git commit -m "type: message"` — commit
10. `git push -u origin <branch>` — push
11. `gh pr create` — open PR

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
