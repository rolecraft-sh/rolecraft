# `rolecraft search`

Search for skills on GitHub or skills.sh (experimental).

## Usage

```bash
rolecraft search <query> [--interactive] [--skills-sh] [--json]
```

## Description

### GitHub (default)

Queries the GitHub API for repositories containing `SKILL.md` files matching your query. Results include stars, language, and the exact install command.

Use `--interactive` to open an arrow-key navigable TUI. Browse results with `↑`/`↓`, select with `Enter`, or quit with `q`. A status bar at the bottom shows available commands.

### skills.sh (experimental)

> ⚠️ **Experimental.** The skills.sh API is undocumented and may change or become unavailable without notice.

Use `--skills-sh` to search the [skills.sh](https://skills.sh) skill directory instead of GitHub. Results include install counts and the exact install command.

### JSON output

Use `--json` for machine-readable output, with either source:

```bash
rolecraft search code-review --json
rolecraft search react --skills-sh --json
```

```json
{
  "query": "code-review",
  "source": "github",
  "count": 2,
  "results": [
    {
      "full_name": "user/skill",
      "description": "A skill description",
      "stargazers_count": 42,
      "language": "JavaScript"
    }
  ]
}
```

`--json` replaces the human output entirely: no table, no interactive picker, no prompt. A GitHub rate limit is reported as an `error` field with an empty `results` array and a non-zero exit code, so a script can tell an empty result from a failed one.

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

# Machine-readable output
rolecraft search code-review --json
```

## Node.js API

This command is also available as a programmatic function. See the [Node.js API documentation](../api.md) for detailed usage.

```js
import { search } from 'rolecraft'
const results = await search('code-review')
```
