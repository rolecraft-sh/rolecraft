---
description: What rolecraft means by skill, role, behavior, agent and MCP server — the words that show up throughout this documentation.
outline: false
---

# Glossary

rolecraft borrows words that already mean something else in the AI tooling world. This page pins them down.

## Skill

A directory containing a `SKILL.md` file — instructions with YAML frontmatter that an AI coding agent loads into context. It is the atomic unit rolecraft installs.

```
my-skill/
  SKILL.md
  references/
  scripts/
```

## Role

Not a separate artifact. A skill *plays* a role: a code reviewer, a data scientist, a release manager. rolecraft's name comes from installing a capability and having your agent behave in that role from then on. It is the same `SKILL.md` file — the distinction is intent, not format.

## Behavior

Another word for the same thing. "Skills", "roles" and "behaviors" are interchangeable in this documentation; pick the one that reads best in the sentence. rolecraft does not create a separate "behavior" concept.

## Agent

An AI coding tool that can load skills: opencode, Claude Code, Cursor, Codex, Copilot, Gemini CLI and 85 others. rolecraft knows where each one looks for a skills directory — see [Agent Discovery](agents.md).

Note that "agent" in rolecraft always means the coding tool, never an autonomous LLM process. `rolecraft agents` lists the coding tools detected on your machine.

## MCP server

An external tool server an agent can call. rolecraft can write MCP server configuration for the 9 agents that support it. This is a different mechanism from skills: a skill is instructions in context, an MCP server is a running process.

## Target

The directory a skill is installed into, which is determined by the agent. `rolecraft install x --cursor` targets `~/.cursor/skills/`. "90 agents" counts known agents, "65 verified" counts agents whose paths are actively tested.

## Lockfile

`~/.skills-lock.json` — the record of what is installed, from which source, at which hash. `rolecraft verify` checks installed skills against it. Note that `rolecraft ci` re-resolves each source at run time rather than pinning to a specific commit; see the [CI/CD guide](guides/ci.md).

## Snapshot

A saved copy of the previous state of a target directory, taken before rolecraft modifies it. `rolecraft rollback --list` shows them.

## See also

- [Agent Discovery](agents.md) — every known agent, its directory and its support level.
- [MCP Server Management](mcp.md) — the 9 agents with MCP support and their config formats.
- [Comparison](comparison.md) — how rolecraft differs from skills.sh and Vercel Skills.