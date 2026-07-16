# Migrating from Vercel skills to rolecraft

If you're using [Vercel's `skills` CLI](https://github.com/vercel-labs/skills) and considering a switch, here's everything you need to know.

## Why switch?

| Reason | rolecraft | Vercel skills |
|---|---|---|
| Dependencies | **0** (zero-dep) | 1 (`supports-color`) |
| Package size | **~4 KB** | ~465 KB |
| Agent targets | **82+** | 72 |
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

# 5. (Optional) Remove Vercel's lockfile
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
rolecraft supports **86+ agents** vs Vercel's 72. This includes newer agents like `augment`, `kilo`, `openhands`, `junie`, `factory`, `command-code`, and more.

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
# Remove rolecraft lockfile
rm -rf ~/.agents

# Reinstall with Vercel
npx skills add user/repo --all
```

Both tools use the same `~/.agents/` directory and lockfile format, so skills installed by one are discoverable by the other.
