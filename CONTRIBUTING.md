# Contributing to RoleCraft

Thanks for your interest in contributing! Here's how you can help.

## How to Contribute

### 1. Fork & Branch

- Fork the repo and create your branch from `main`
- Use a descriptive branch name: `feat/my-feature`, `fix/my-bug`, `docs/my-update`

### 2. Make Changes

- Keep changes focused on a single concern
- Follow existing code style (no semicolons, ES modules)
- Add or update tests for any new functionality

### 3. Test

```bash
npm test
```

Make sure all tests pass before submitting.

### 4. Commit

Use conventional commit messages:

```
feat: add new feature
fix: correct bug in parser
docs: update installation guide
chore: bump dependencies
```

### 5. Pull Request

- Push your branch and open a PR against `main`
- Write a clear title and description explaining what and why
- Link any related issues

### 6. Review & Merge

- Only the repository owner (`sametcelikbicak`) can review and merge PRs
- PRs are squash-merged to keep history clean
- After merge, CI automatically publishes to npm if a new version tag exists

## Release Process

Only maintainers can create releases:

1. Ensure all desired changes are merged to `main`
2. Create and push a version tag: `git tag v0.X.Y && git push origin v0.X.Y`
3. GitHub Actions handles the rest:
   - Changelog is generated automatically
   - A release PR is created
   - After PR merge, the package is published to npm

## Code of Conduct

Be respectful and constructive. Keep discussions focused on the code.
