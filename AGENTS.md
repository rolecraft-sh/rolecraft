# rolecraft — Development Guidelines

## ⚠️ STARTUP CHECKLIST (read before every task)

1. `git checkout main && git pull` — start from latest main
2. `git checkout -b feat/my-feature` or `fix/my-bug` — create branch
3. Do all work on the feature branch (never on main)
4. `npm run lint` — check syntax before pushing
5. `npm test` — run tests
6. Never leave changes that break tests
7. Write tests for new features
8. Update docs (README, CONTRIBUTING, docs/) when needed
9. Test `--dry-run` flag if the feature supports it
10. `git add ... && git commit -m "type: message"` — commit
11. `git push -u origin <branch>` — push
12. `gh pr create` — open PR
13. Before merging, wait for all GitHub Actions checks to pass (`gh run watch` or check PR status). Never merge while checks are running.

## Workflow
- Before starting any task, ensure you're on `main` with latest changes (`git checkout main && git pull`), then create a new branch specific to the task (`git checkout -b feat/my-feature` or `fix/my-bug`)
- Complete all work on the feature branch
- After completing the work, run `npm run lint` and the tests: `node --test --test-concurrency=1`
- Never leave changes that break tests
- Write tests for new features
- Update documentation (README, CONTRIBUTING, docs/) when needed
- Test the `--dry-run` flag if the feature supports it
- After tests pass, commit the changes, push the branch, and open a PR
- Before merging, wait for all GitHub Actions checks to pass (`gh run watch` or check PR status). Never merge while checks are running.

## Code style
- Keep the zero-dependency principle (don't add new dependencies to package.json)
- Use ES modules (`import`/`export`, no `require`)
- Prefer built-in modules like `node:fs`, `node:path`
- Tests are written with `node:test` and `node:assert`
