---
description: Reinstall a skill to its latest version from its recorded source.
---

# `rolecraft update`

Re-install a skill to the latest version.

## Usage

```bash
rolecraft update <slug> [--dry-run]
```

## Options

| Flag          | Description                            |
|---------------|----------------------------------------|
| `--dry-run`   | Preview what would be updated without making changes |

## Description

Fetches the skill source again and re-installs it, updating to the latest available version. The lockfile is updated with the new content hashes.

## Examples

```bash
rolecraft update my-skill
rolecraft update my-skill --dry-run    # preview only
```

## Node.js API

This command is also available as a programmatic function. See the [Node.js API documentation](../api.md) for detailed usage.

```js
import { update } from 'rolecraft'
const result = await update('my-skill')
```

## See also

- [Commands hub](./index.md) — every command, grouped by intent.
- [`rolecraft install`](./install.md) — the command `update` wraps.
- [`rolecraft diff`](./diff.md) — see what changed before you commit.
- [CI/CD Integration](../guides/ci.md) — keep skills fresh in CI.
