---
description: Every rolecraft command grouped by what you are trying to do, with links to the full reference page for each.
---

# Commands

rolecraft ships 25 commands. You probably need three of them.

## Start here

| Command | What it does |
| ------- | ------------ |
| [`rolecraft setup`](setup.md) | Detect every AI agent on the machine and install a skill and its MCP servers everywhere |
| [`rolecraft install`](install.md) | Install one skill from a local path, GitHub shorthand, or any git URL |
| [`rolecraft search`](search.md) | Find skills on GitHub |
| [`rolecraft list`](list.md) | List installed skills with scope, date and source |
| [`rolecraft update`](update.md) | Re-fetch skills from their source |
| [`rolecraft remove`](remove.md) | Uninstall a skill and restore the previous state |

## Author and maintain

| Command | What it does |
| ------- | ------------ |
| [`rolecraft init`](init.md) | Scaffold a new skill from a built-in template |
| [`rolecraft bundle`](bundle.md) | Export installed skills into a single portable directory |
| [`rolecraft compose`](compose.md) | Compose skills from multiple sources into one target |
| [`rolecraft convert`](convert.md) | Convert skills between agent formats |
| [`rolecraft check`](check.md) | Run the security scanner without installing |
| [`rolecraft test`](test.md) | Validate a skill's frontmatter and structure |
| [`rolecraft verify`](verify.md) | Verify installed skills against their lockfile hashes |
| [`rolecraft diff`](diff.md) | Show what changed between two snapshots or sources |
| [`rolecraft doctor`](doctor.md) | Diagnose the local installation |
| [`rolecraft watch`](watch.md) | Re-run a command when the source changes |
| [`rolecraft rollback`](rollback.md) | Restore a previous snapshot |

## Agents, MCP and platform

| Command | What it does |
| ------- | ------------ |
| [`rolecraft agents`](agents.md) | List detected agents and their skill directories |
| [`rolecraft agents-xml`](agents-xml.md) | Emit the agent manifest as XML |
| [`rolecraft mcp`](mcp.md) | Install and manage MCP server configuration |
| [`rolecraft profile`](profile.md) | Save and apply a named set of agent skills |
| [`rolecraft ci`](ci.md) | Non-interactive re-install for pipelines |
| [`rolecraft use`](use.md) | Activate a profile for the current shell |
| [`rolecraft upgrade`](upgrade.md) | Update the rolecraft CLI itself |
| [`rolecraft completions`](completions.md) | Print a shell completion script |

## See also

- [CLI Reference](../reference.md) — every command with all flags on one page.
- [Node.js API](../api.md) — use rolecraft as a library.
- [Getting Started](../guides/getting-started.md) — a five-minute walkthrough.