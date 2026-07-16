# rolecraft convert

Convert skills between rolecraft's `SKILL.md` format and Cursor/Claude Code's `.mdc` rule format.

## Usage

```bash
rolecraft convert <source> [options]
```

## Description

`rolecraft convert` detects the input format and converts bidirectionally:

- **SKILL.md → .mdc** — Export a rolecraft skill as a Cursor/Claude Code rule file
- **.mdc → SKILL.md** — Import an existing Cursor/Claude Code rule as a rolecraft skill

The conversion preserves the body content and any `mcp_servers` metadata — no data is lost during round-trip conversion.

## Arguments

| Argument   | Description                                 |
| ---------- | ------------------------------------------- |
| `source`   | Path to a file or directory to convert      |

If `source` is a directory, `convert` looks for `SKILL.md` first, then `.mdc` files.

## Options

| Option        | Description                          |
| ------------- | ------------------------------------ |
| `--dry-run`   | Show what would be done without writing |
| `--output`    | Output directory (default: current directory) |

## Format Mapping

| SKILL.md field | .mdc equivalent |
| -------------- | --------------- |
| `name`         | `description` (fallback) |
| `description`  | `description`   |
| `slug`         | Filename (`{slug}.mdc`) |
| `mcp_servers`  | Preserved as-is (unknown to Cursor, ignored) |
| Body content   | Body content |

| .mdc field | SKILL.md equivalent |
| ---------- | ------------------- |
| `description` | `name` + `description` |
| `alwaysApply` | Not applicable (discarded) |
| `globs` | Not applicable (discarded) |
| Body content | Body content |

## Examples

```bash
# Convert a skill to a Cursor rule
rolecraft convert ./my-skill/SKILL.md
# → Creates {slug}.mdc in current directory

# Convert a Cursor rule to a skill
rolecraft convert .cursor/rules/my-rule.mdc
# → Creates SKILL.md in current directory

# Convert all .mdc files in a directory
rolecraft convert .cursor/rules/
# → Creates SKILL.md for each .mdc file

# Preview without writing
rolecraft convert ./skill --dry-run
```

## See Also

- [install](./install) — Install skills to any agent
- [`docs/agents.md`](/agents) — List of supported agent paths
