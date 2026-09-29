# Release Process

Only maintainers can create releases. This process is automated via GitHub Actions.

## Prerequisites — Signing Key in CI

The release workflow re-signs the tag when moving it to the changelog commit. For the tag to show a **Verified** badge on GitHub, a signing key must be added as a GitHub secret.

The workflow supports both **SSH** and **GPG** signing keys. SSH is recommended if you already have it configured.

### Option A: SSH (recommended)

Use your existing SSH private key. First verify you have one:

```bash
ls ~/.ssh/id_ed25519   # or ~/.ssh/id_rsa
```

If you already sign commits (check with `git config --global gpg.format`), use that same key. Export the private key:

```bash
cat ~/.ssh/id_ed25519 | pbcopy
# or on Linux: cat ~/.ssh/id_ed25519 | xclip -sel clip
```

Add these secrets to the repository at `https://github.com/rolecraft-sh/rolecraft/settings/secrets/actions`:

| Secret | Value |
|--------|-------|
| `SSH_PRIVATE_KEY` | The SSH private key (starts with `-----BEGIN OPENSSH PRIVATE KEY-----`) |

Also add your SSH **public** key (`~/.ssh/id_ed25519.pub`) to GitHub as a **Signing Key** at `https://github.com/settings/ssh/new` — select "Signing Key" as the key type.

### Option B: GPG

If you prefer GPG, find your key ID and export it:

```bash
gpg --list-secret-keys --keyid-format=long | grep sec
# e.g. sec   ed25519/3AA5C34371567BD2  ...
# Key ID: 3AA5C34371567BD2
gpg --armor --export-secret-keys 3AA5C34371567BD2 | pbcopy
```

| Secret | Value |
|--------|-------|
| `GPG_PRIVATE_KEY` | The armored private key (starts with `-----BEGIN PGP PRIVATE KEY BLOCK-----`) |
| `GPG_KEY_ID` | Your key ID, e.g. `3AA5C34371567BD2` |

## Create and Push a Signed Tag

```bash
git tag -s v0.X.Y -m "chore: release v0.X.Y"
git push origin v0.X.Y
```

> ⚠️ Always use `git tag -s` (signed tag) instead of `git tag`. Unsigned tags will not show a "Verified" badge on GitHub. See [GitHub's signing guide](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-tags) if GPG is not configured.

## CI Handles the Rest

GitHub Actions:
- Generates the changelog and bumps the version
- Re-signs the tag on the new commit (uses the SSH or GPG key from secrets)
- Creates a release PR
- After the PR is merged, the package is published to npm

## Contributors

Every changelog entry is credited to the author of the commit it came from:

```
- fix: align header logo with sidebar nav icons by @makifbaysal in [#65](https://github.com/rolecraft-sh/rolecraft/pull/65)
```

`release-prep.sh` resolves the GitHub login from the commit author email — inline for `12345+login@users.noreply.github.com`, via the API for real addresses — and skips anyone whose login ends in `[bot]`, so Dependabot bumps are listed without a name.

The @mention is load-bearing, not decoration. GitHub builds the release's **Contributors** avatar list from the @mentions in the release body, and the release body is the changelog section verbatim. A changelog that never mentions anyone produces a release with no Contributors section at all. Writing a `### Contributors` list by hand would be redundant — the mention is the only thing that has to be there.

