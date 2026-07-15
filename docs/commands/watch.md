# `rolecraft watch`

Watch installed skills for file changes and auto-sync to agent directories.

## Usage

```bash
rolecraft watch [<slug>] [--dry-run]
```

## Options

| Flag          | Description                            |
|---------------|----------------------------------------|
| `--dry-run`   | Preview which skills would be watched without starting file watchers |

## Description

Monitors skill source directories using `node:fs` FSWatcher. When a file changes, the skill is automatically re-installed to all its configured agent targets and the lockfile is updated with new content hashes.

Only local source skills can be watched. Remote (GitHub, npm, git) sources are skipped.

## Examples

```bash
# Watch all local skills
rolecraft watch

# Watch a specific skill
rolecraft watch my-skill

# Preview without starting watchers
rolecraft watch --dry-run
```

## Output

```
👀 Watching 2 skill(s) for changes...

   ✓ my-skill → watching /Users/me/projects/my-skill
   ✓ team-rules → watching /Users/me/projects/team-rules

📌 Press Ctrl+C to stop watching
```

On file change:

```
  [2:30:15 PM] my-skill: SKILL.md changed, syncing...
  [2:30:15 PM] my-skill: synced successfully
```
