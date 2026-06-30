# `rolecraft search`

Search for skills on GitHub.

## Usage

```bash
rolecraft search <query> [--interactive]
```

## Description

Queries the GitHub API for repositories containing `SKILL.md` files matching your query. Results include stars, language, and the exact install command.

Use `--interactive` to open a **TUI (terminal user interface)** — navigate results with arrow keys, preview details, and install with Enter.

## Interactive mode (TUI)

When `--interactive` is used, rolecraft opens a full-screen TUI:

| Key          | Action               |
| ------------ | -------------------- |
| `↑` / `k`    | Move selection up    |
| `↓` / `j`    | Move selection down  |
| `Enter`      | Install selected     |
| `q`          | Quit                 |

No external dependencies — built entirely with Node.js built-in modules and ANSI escape codes.

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
