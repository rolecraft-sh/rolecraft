---
description: Uninstall a skill and remove it from every agent directory it was installed to.
---

# `rolecraft remove`

Uninstall a skill.

## Usage

```bash
rolecraft remove <slug> [--dry-run]
```

## Options

| Flag          | Description                            |
|---------------|----------------------------------------|
| `--dry-run`   | Preview what would be removed without making changes |

## Description

Removes the skill files from all installed directories and cleans up the lockfile.

## Examples

```bash
rolecraft remove my-skill
rolecraft remove my-skill --dry-run    # preview before removing
```

## Node.js API

This command is also available as a programmatic function. See the [Node.js API documentation](../api.md) for detailed usage.

```js
import { remove } from 'rolecraft'
const result = await remove('my-skill')
```

## See also

- [Commands hub](./index.md) — every command, grouped by intent.
- [`rolecraft update`](./update.md) — remove-and-reinstall a changed skill.
- [`rolecraft rollback`](./rollback.md) — restore the previous state.
