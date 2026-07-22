# `rolecraft test`

Test a SKILL.md quality with built-in assertions. Scans frontmatter, content structure, security patterns, and completeness — then assigns a score and grade.

## Usage

```bash
rolecraft test <skill-path>     # Test a single skill
rolecraft test --all             # Test all installed skills
rolecraft test --all --json      # JSON output for CI
```

## Options

| Flag | Description |
|------|-------------|
| `--all` | Test all installed skills from lockfile |
| `--json` | Machine-readable JSON output |
| `--verbose`, `-v` | Detailed assertion results |
| `--min-score <N>` | Fail if score below N (default: 50) |
| `--only <names>` | Run specific assertions only (comma-separated) |
| `--no-color` | Disable ANSI colors |
| `--no-emoji` | Replace emojis with ASCII (`[OK]`, `[FAIL]`, `[WARN]`) |

## Assertions

| Assertion | Weight | Description |
|-----------|--------|-------------|
| `name-defined` | 10 | `frontmatter.name` must exist |
| `description-defined` | 10 | `frontmatter.description` must exist |
| `description-length` | 5 | Description >= 20 characters |
| `frontmatter-valid` | 10 | YAML delimiters (`---`) must be present and parseable |
| `slug-defined` | 5 | `frontmatter.slug` must exist |
| `content-not-empty` | 10 | Body must contain >= 50 words |
| `code-block-lang` | 10 | Code fences must have language tags (`` ```js `` not `` ``` ``) |
| `dangerous-patterns` | 15 | No `rm -rf`, `eval`, `exec`, `sudo`, `/etc/passwd` patterns |
| `line-length` | 5 | No lines exceeding 120 characters |
| `example-commands` | 10 | Must contain `$ ` command or `` ```bash `` block |
| `mcp-referenced` | 5 | If MCP servers referenced in body, they must be in frontmatter |
| `agent-targets` | 5 | Must specify `agents:` or `scope:` in frontmatter |
| `has-sections` | 5 | Must have at least 2 `## ` sections |

## Grades

| Score | Grade | Meaning |
|-------|-------|---------|
| 90-100 | A | Excellent |
| 75-89 | B | Good |
| 50-74 | C | Adequate |
| 25-49 | D | Poor |
| 0-24 | F | Unusable |

## Examples

```bash
# Test a single skill
$ rolecraft test ./my-skill/SKILL.md

🔬 Testing: my-skill

  ✅ name defined
  ✅ description defined and sufficient length (45 chars)
  ✅ Frontmatter valid YAML
  ❌ slug not defined
  ✅ Content not empty (245 words)
  ❌ Code block missing language tag (``` instead of ```javascript)
  ✅ No dangerous patterns found
  ⚠️  Long lines (>120 chars) -- 3 lines
  ❌ MCP server referenced but not defined in frontmatter
  ✅ Example commands present
  ❌ No agent targets specified

Score: 73/100 -> B (Good)

Suggestions:
  -> Add "slug" field to frontmatter
  -> Use language tags in code blocks
  -> Specify which agents this skill is for
```

```bash
# Test all installed skills
$ rolecraft test --all

Testing all installed skills...

  ✅ react-rules       92/100  A
  ✅ testing-guide     88/100  B
  ❌ legacy-rules      34/100  D  -> needs review
  ✅ my-skill          73/100  B

📋 Summary: 3/4 passed, 1 failed
```

```bash
# CI usage with min-score threshold
$ rolecraft test --all --min-score 80 --json
```

```bash
# Run only specific assertions
$ rolecraft test ./skill.SKILL.md --only name-defined,slug-defined
```

## Node.js API

```js
import { test } from 'rolecraft'

const result = await test('./my-skill/SKILL.md')
// { skill: 'my-skill', score: 73, grade: 'B', label: 'Good',
//   assertions: [{ name: 'name-defined', pass: true, weight: 10 }, ...],
//   suggestions: ['Add "slug" field to frontmatter'] }

const all = await test(null, { all: true, minScore: 80 })
// { results: [...], summary: { total: 4, passed: 3, failed: 1 } }
```
