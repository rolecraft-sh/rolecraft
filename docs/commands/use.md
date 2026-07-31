# `rolecraft use`

Preview a skill's files without installing.

## Usage

```bash
rolecraft use <source>
rolecraft use <source> --list
rolecraft use <source> --skill <name>
```

## Description

Resolves the source, shows metadata, and prints all file contents to stdout — without writing anything to disk. Useful for inspecting a skill before installing, or piping content into other tools.

For sources with multiple skills (e.g. `mattpocock/skills`), all skills are shown sequentially. Use `--skill` to filter or `--list` to see only metadata.

## Options

| Flag | Description |
|------|-------------|
| `--list` | List available skills without previewing content |
| `--skill <names>` | Preview specific skills by name (comma-separated) |

## Examples

```bash
# Preview a local skill
rolecraft use ./my-skill

# Preview a GitHub skill
rolecraft use rolecraft-sh/skills

# List skills in a multi-skill source
rolecraft use mattpocock/skills --list

# Preview a specific skill from a multi-skill source
rolecraft use mattpocock/skills --skill "typescript-rules"

# Pipe content
rolecraft use ./my-skill | head -50
```

## Node.js API

This command is also available as a programmatic function. See the [Node.js API documentation](../api.md) for detailed usage.

```js
import { use } from 'rolecraft'
const preview = await use('./my-skill')
```
