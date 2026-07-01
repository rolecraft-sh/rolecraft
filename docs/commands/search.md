# `rolecraft search`

Search for skills on GitHub.

## Usage

```bash
rolecraft search <query> [--interactive]
```

## Description

Queries the GitHub API for repositories containing `SKILL.md` files matching your query. Results include stars, language, and the exact install command.

Use `--interactive` to open an arrow-key navigable TUI. Browse results with `↑`/`↓`, select with `Enter`, or quit with `q`. A status bar at the bottom shows available commands.

## Examples

```bash
# Search by keyword
rolecraft search code-review

# Multi-word search
rolecraft search "code review typescript"

# Search for prompt skills
rolecraft search prompt

# Search + pick to install (TUI)
rolecraft search code-review --interactive

# Multi-word search + install
rolecraft search "code review" --interactive
```
