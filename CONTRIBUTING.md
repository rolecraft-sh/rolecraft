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

### 1. Prerequisites — GPG Key in CI

The release workflow re-signs the tag when moving it to the changelog commit. For the tag to show a **Verified** badge on GitHub, the GPG private key must be added as a GitHub secret.

First, find your GPG key ID:
```bash
gpg --list-secret-keys --keyid-format=long | grep sec
# e.g. sec   ed25519/3AA5C34371567BD2  ...
# Key ID: 3AA5C34371567BD2
```

Export the private key (you'll be prompted for your passphrase):
```bash
gpg --armor --export-secret-keys 3AA5C34371567BD2 | pbcopy
# or on Linux:  gpg --armor --export-secret-keys 3AA5C34371567BD2 | xclip -sel clip
```

Add these secrets to the repository at `https://github.com/sametcelikbicak/rolecraft/settings/secrets/actions`:

| Secret | Value |
|--------|-------|
| `GPG_PRIVATE_KEY` | The armored private key (starts with `-----BEGIN PGP PRIVATE KEY BLOCK-----`) |
| `GPG_KEY_ID` | Your key ID, e.g. `3AA5C34371567BD2` |

### 2. Create and Push a Signed Tag

```bash
git tag -s v0.X.Y -m "chore: release v0.X.Y"
git push origin v0.X.Y
```

> ⚠️ Always use `git tag -s` (signed tag) instead of `git tag`. Unsigned tags will not show a "Verified" badge on GitHub. See [GitHub's signing guide](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-tags) if GPG is not configured.

### 3. CI Handles the Rest

GitHub Actions:
- Generates the changelog and bumps the version
- Re-signs the tag on the new commit (uses the GPG key from secrets)
- Creates a release PR
- After the PR is merged, the package is published to npm

## Code of Conduct

Be respectful and constructive. Keep discussions focused on the code.
