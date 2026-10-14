---
description: A migration guide for teams moving from Vercel's skills CLI to rolecraft, covering command equivalents and behavior differences.
---

# Migrating from Vercel skills to rolecraft

If you're using [Vercel's `skills` CLI](https://github.com/vercel-labs/skills) and considering a switch, here's everything you need to know.

## Why switch?

| Reason | rolecraft | Vercel skills |
|---|---|---|
| Dependencies | **0** (zero-dep) | 1 (`supports-color`) |
| Agent targets | **90** | 72 |
| Telemetry | **None** | Anonymous telemetry |
| Offline installs | **Fully supported** | Requires network |
| Shell completions | bash, zsh, fish | Not available |
| System health check | `rolecraft doctor` | Not available |
| Self-upgrade | `rolecraft upgrade` | Not available |

## Quick migration

```bash
# 1. Install rolecraft
npm install -g rolecraft

# 2. List your currently installed skills
npx skills list

# 3. Reinstall each skill with rolecraft
rolecraft install user/repo --all

# 4. Verify everything is in place
rolecraft list
rolecraft doctor

# 5. (Optional) Drop the old lockfile — both tools share the same file,
#    so only do this once rolecraft has everything installed.
rm ~/.skills-lock.json
```

## Command mapping

| Vercel skills | rolecraft equivalent |
|---|---|
| `npx skills add user/repo` | `rolecraft install user/repo` |
| `npx skills list` | `rolecraft list` |
| `npx skills remove slug` | `rolecraft remove slug` |
| `npx skills init` | `rolecraft init` |
| `npx skills find` | `rolecraft search` |
| `--yes` / `-y` | `--yes` / `-y` |
| `--copy` | default (copy mode) |
| `--symlink` | `--symlink` |
| `--cursor` / `--claude` etc. | `--cursor` / `--claude` etc. |

## What rolecraft does differently

### More agent targets
rolecraft supports **90 agents** vs Vercel's 72. This includes newer agents like `augment`, `kilo`, `openhands`, `junie`, `factory`, `command-code`, `oh-my-pi (omp)`, and more.

### Any source, not just GitHub
Install from local folders, GitLab, Bitbucket, SSH URLs, or even npm packages — not just GitHub repos.

### Health checks
```bash
rolecraft doctor
```
Diagnoses Node.js version, agent directories, lockfile integrity, and skill health in one command.

### No vendor lock-in
rolecraft doesn't require a marketplace, a signup, or any external service. It works fully offline and stores everything locally.

## Rollback

If you need to go back to Vercel skills:

```bash
# Uninstall the skills you migrated in, one at a time.
rolecraft list
rolecraft remove <slug>

# Then reinstall with Vercel
npx skills add user/repo --all
```

Both tools read the same `~/.agents/skills/` directory and write the same lockfile format, so skills installed by one are discoverable by the other.

> **Do not `rm -rf ~/.agents`.** That path is the global skills directory for a dozen or more agents, so deleting it wipes every skill they have — including ones you never migrated. Use `rolecraft remove <slug>`, or `rolecraft rollback --list` to restore a snapshot taken before the migration.

## See also

- [`rolecraft install`](commands/install.md) — reinstall your skills under rolecraft.
- [`rolecraft remove`](commands/remove.md) — take skills back out.
- [`rolecraft rollback`](commands/rollback.md) — undo a migration in one command.
- [Feature Comparison](comparison.md) — what you gain by switching.
