# `rolecraft init`

Scaffold a new `SKILL.md` for your agent skill.

## Usage

```bash
rolecraft init                    # create ./SKILL.md (default: my-skill)
rolecraft init my-custom-tool     # create ./my-custom-tool/SKILL.md
rolecraft init namespace/skill    # create ./namespace-skill/SKILL.md
```

## Description

Generates a ready-to-edit `SKILL.md` with proper slug, name, and owner metadata. Edit it with your skill instructions, then install with `rolecraft install <dir>`.

## Examples

```bash
rolecraft init
# Creates ./SKILL.md

rolecraft init code-reviewer
# Creates ./code-reviewer/SKILL.md

rolecraft init myorg/ts-helper
# Creates ./myorg-ts-helper/SKILL.md
```
