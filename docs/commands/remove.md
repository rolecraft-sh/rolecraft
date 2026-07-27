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
