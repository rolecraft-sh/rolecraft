# `rolecraft compose`

Combine multiple SKILL.md files into a single composed skill. Supports two composition strategies: **merge** (deduplicate) and **chain** (override).

## Usage

```bash
rolecraft compose <a> <b> [<c> ...]              # Merge mode (default), output to stdout
rolecraft compose <a> <b> -o combined.SKILL.md   # Write to file
rolecraft compose <a> <b> --chain --name combined # Chain mode with custom name
```

## Options

| Flag | Description |
|------|-------------|
| `-o`, `--output <path>` | Output file path (default: stdout) |
| `--chain` | Chain mode — later skills override same sections |
| `--name <name>` | Custom name for the composed skill |
| `--dry-run` | Preview compose result without writing |
| `--force` | Overwrite existing output file |
| `--json` | JSON output with stats |
| `--no-color` | Disable ANSI colors |

## Modes

### Merge (default)

Combines all sections, deduplicating same-named sections line-by-line. Lines that already exist in the first skill are not duplicated.

```
Section "Code Style" from skill A + skill B:
  Use 2-space indentation    ← from A (kept)
  Use single quotes          ← from A (kept)
  Write tests first          ← from B (unique, added)
```

### Chain

Sequences skills with override — later skills overwrite same-named sections entirely. Useful for team-specific overrides:

```
Base skill → Team A overrides → Team B customizations
```

## How it works

1. Parse each SKILL.md (frontmatter + section list)
2. In **merge** mode: collect all sections, merge same-named ones (set-based dedup)
3. In **chain** mode: iterate sections in order, later wins for same heading
4. Merge frontmatter from all sources (first name wins, first slug wins, rest accumulate)
5. Generate auto-description from source names if not provided
6. Output composed SKILL.md

## Examples

```bash
$ rolecraft compose ./react.SKILL.md ./testing.SKILL.md -o ./react-testing.SKILL.md

✓ Written to ./react-testing.SKILL.md

Composing 2 skills (merge mode)...

Compose result:
  ✓ 3 sections composed
  ✓ 4 frontmatter fields
  ✓ Sources: 2
  ✓ Mode: merge
  ✓ Input: 4 sections → Output: 3 sections
```

```bash
$ rolecraft compose ./base.SKILL.md ./team-a.SKILL.md --chain --output ./combined.SKILL.md

✓ Written to ./combined.SKILL.md

Composing 2 skills (chain mode)...

Compose result:
  ✓ 4 sections composed
  ✓ 5 frontmatter fields
  ✓ Sources: 2
  ✓ Mode: chain
```

```bash
$ rolecraft compose ./a.SKILL.md ./b.SKILL.md --dry-run --name "My Combined"
```

```bash
$ rolecraft compose ./a.SKILL.md ./b.SKILL.md --json --dry-run
```

## Node.js API

```js
import { compose } from 'rolecraft'

const result = await compose(['./base.SKILL.md', './team.SKILL.md'], { mode: 'merge' })
// {
//   content: '---\nname: Combined\n...',
//   stats: { sources: 2, mergedSections: 3, totalInputSections: 4, totalOutputSections: 3 }
// }

const chained = await compose(['./base.md', './override.md'], { mode: 'chain', name: 'Final' })
```