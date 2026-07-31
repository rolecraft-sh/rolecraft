# `rolecraft diff`

Compare two SKILL.md files section-by-section. Parses frontmatter and body sections independently, showing exactly what changed.

## Usage

```bash
rolecraft diff <skill-a> <skill-b>          # Full diff output
rolecraft diff <skill-a> <skill-b> --brief  # Summary only
rolecraft diff <skill-a> <skill-b> --json   # Machine-readable JSON
```

## Options

| Flag | Description |
|------|-------------|
| `--json` | Machine-readable JSON output |
| `--brief` | Summary only (which fields/sections changed) |
| `--context <N>` | Context lines around changes (default: full) |
| `--no-color` | Disable ANSI colors |

## How it works

1. Parse both SKILL.md files (frontmatter + body)
2. Compare frontmatter fields key-by-key → show added/removed/changed
3. Split body into sections by `## ` headings
4. For each section heading present in both files:
   - Compare lines line-by-line (using set diff)
   - Tags: `-` (removed), `+` (added)
5. Sections in only one file → marked as added/removed
6. Output with color (red: removed, green: added)

## Examples

```bash
$ rolecraft diff ./frontend.SKILL.md ./backend.SKILL.md

=== ./frontend.SKILL.md → ./backend.SKILL.md ===

--- Frontmatter Changes ---
  --- name:
  - Skill A
  + Skill B
  --- agents:
  - cursor
  + cursor, claude

--- Section Changes ---

## Code Style
-Lint with ESLint
+Lint with Biome

## Testing (added)
+Write unit tests
+Aim for 80% coverage

## Configuration (removed)
-Set key in config

Summary: 1 changed, 1 added, 1 removed, 2 unchanged, 2 frontmatter changes
```

```bash
$ rolecraft diff ./a.SKILL.md ./b.SKILL.md --brief

=== ./a.SKILL.md → ./b.SKILL.md ===

Frontmatter changes:
  name: A → B
  agents: cursor → cursor, claude

Sections:
  ~ Code Style (+2, -1)
  + Testing (+3)
  - Configuration (-2)

Summary: 1 changed, 1 added, 1 removed
```

```bash
$ rolecraft diff ./identical.SKILL.md ./copy.SKILL.md --json
```

## Node.js API

```js
import { diff } from 'rolecraft'

const result = await diff('./a.SKILL.md', './b.SKILL.md')
// {
//   a: './a.SKILL.md',
//   b: './b.SKILL.md',
//   frontmatter: { name: { from: 'A', to: 'B' }, ... },
//   sections: [
//     { heading: 'Code Style', status: 'changed', added: [...], removed: [...] },
//     { heading: 'Testing', status: 'added', added: [...], removed: [] },
//   ],
//   stats: { changedSections: 1, addedSections: 1, removedSections: 1, ... }
// }
```