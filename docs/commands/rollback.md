# `rolecraft rollback`

Restore a skill to its previous version. Requires a history entry — created automatically when you use `rolecraft update` or re-install over an existing skill.

> **Requirement:** v2.1.0+
> 
> Rollback history is stored in two places:
> - **Lockfile history** (`~/.agents/.skill-lock.json`) — metadata about each previous version
> - **File backups** (`~/.agents/.backups/<slug>/`) — snapshot of the actual skill files
>
> History is kept for the **last 5 updates**. Older entries are automatically trimmed.

## Usage

```bash
rolecraft rollback <slug> [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--list` | Show available rollback versions without restoring |
| `--dry-run` | Preview which files would be restored |
| `--help`, `-h` | Show help |

## Examples

### Restore a skill to its previous version

```bash
rolecraft rollback my-skill
```

### List rollback history

```bash
rolecraft rollback my-skill --list

📜 Rollback history for "my-skill":
   Current: a1b2c3d4e5f6
           v1: f6e5d4c3b2a1 (2026-07-28T10:30:00.000Z)
           v2: 9a8b7c6d5e4f (2026-07-27T14:15:00.000Z)
```

### Preview what would be restored

```bash
rolecraft rollback my-skill --dry-run

🔄 Dry-run: rollback "my-skill"
   Files to restore: SKILL.md, helper.js, config.json
   Targets: cursor, claude, opencode
   Previous version: f6e5d4c3b2a1
```

## Related

- [`rolecraft update`](update.md) — creates rollback snapshots on re-install
- [`rolecraft list`](list.md) — show installed skills
- [`rolecraft doctor`](doctor.md) — verify skill integrity

## Node.js API

```js
import { rollback } from 'rolecraft'

const result = await rollback('my-skill')
console.log(result)
// { slug: 'my-skill', files: ['SKILL.md', ...], targets: [...], prevContentSha: '...' }

// List history only
const history = await rollback('my-skill', { list: true })
// { slug: 'my-skill', currentVersion: '...', history: [{ version: 1, ... }] }

// Preview without restoring
const preview = await rollback('my-skill', { dryRun: true })
// { dryRun: true, slug: 'my-skill', files: [...], targets: [...], prevContentSha: '...' }
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `list` | `boolean` | `false` | Show history without restoring |
| `dryRun` | `boolean` | `false` | Preview without restoring |

Returns `{ slug, files, targets, prevContentSha }`.
