# `rolecraft search`

Search for skills on GitHub, skills.sh (experimental), or the rolecraft Registry.

## Usage

```bash
rolecraft search <query> [--interactive] [--skills-sh] [--registry]
```

## Description

### GitHub (default)

Queries the GitHub API for repositories containing `SKILL.md` files matching your query. Results include stars, language, and the exact install command.

Use `--interactive` to open an arrow-key navigable TUI. Browse results with `↑`/`↓`, select with `Enter`, or quit with `q`. A status bar at the bottom shows available commands.

### skills.sh (experimental)

> ⚠️ **Experimental.** The skills.sh API is undocumented and may change or become unavailable without notice.

Use `--skills-sh` to search the [skills.sh](https://skills.sh) skill directory instead of GitHub. Results include install counts and the exact install command.

### Registry

Use `--registry` to search the [rolecraft Registry](https://github.com/rolecraft-sh/registry) — a community-driven index of published skills. Results include version, author, and the exact install command (using short slugs).

See [`registry.md`](./registry.md) for details.

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

# Search skills.sh directory (experimental)
rolecraft search react --skills-sh

# Search the rolecraft Registry
rolecraft search code-review --registry
```
