# `rolecraft ci`

Re-install all skills and MCP servers from lockfile (CI mode).

## Usage

```bash
rolecraft ci
```

## Description

Reads both the skill lockfile (`~/.agents/.skill-lock.json`) and the MCP lockfile (`~/.agents/.mcp-lock.json`) and re-installs everything, ensuring the installed state matches the locked state exactly.

Designed for CI pipelines and team onboarding — run this after cloning a repository to restore all project skills and their required MCP servers.

## Example

```bash
# In CI or after git clone — restores skills + MCP servers
rolecraft ci
```
