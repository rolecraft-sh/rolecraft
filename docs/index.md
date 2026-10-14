---
layout: home

hero:
  name: "RoleCraft"
  text: "The Security-First Skill Manager"
  tagline: Scan a skill for prompt injection before it lands on disk. Then install it to every AI coding agent on your machine.
  image:
    src: /rolecraft-demo.gif
    alt: "Terminal recording: rolecraft install runs a security scan, reports the skill as safe, and rolecraft list shows the installed skills."
  actions:
    - theme: brand
      text: Get Started
      link: /guides/getting-started
    - theme: alt
      text: Install Guide
      link: /install
    - theme: alt
      text: Why rolecraft?
      link: /comparison

features:
  - title: Security Scoring Before Install
    icon: 🛡️
    details: "Static analysis on install — flags prompt injection, command injection and obfuscated code before anything is written to disk. It is pattern-based, and /security documents exactly what it misses."
  - title: One-Command Onboarding
    icon: 🚀
    details: "rolecraft setup <source> detects every AI agent on the machine and installs the skill and its MCP servers to all of them."
  - title: Skills and MCP in One Install
    icon: 🔌
    details: "Install a skill and the MCP servers it declares in a single command. No other CLI tool does both."
  - title: 65 Verified Agent Targets
    icon: 🎯
    details: "Skills go to the correct directory for each agent, from opencode and Claude Code to Cursor and Copilot. Use --dry-run to see the list first."
  - title: Rollback
    icon: ↩️
    details: "Every install and MCP change is snapshotted. List the snapshots and restore any of them in one command."
  - title: CI-Ready
    icon: ⚙️
    details: "rolecraft ci re-installs every skill non-interactively. Sources re-resolve at run time, so pair it with rolecraft verify in the same job."

---

## Three commands to productive

```bash
npm install -g rolecraft
rolecraft search code-review
rolecraft install sametcelikbicak/coverage-guard --global
```

Install from a local path, a GitHub shorthand (`owner/repo`), any git URL, or a multi-skill repository. `--dry-run` prints the plan without touching disk. Full walkthrough: [Getting Started](guides/getting-started.md).

## Proof, not promises

- **OpenSSF Scorecard 8.0/10** — the same score the README badge reports.
- **Zero runtime dependencies** — Node.js built-ins only. [How it compares](comparison.md)
- **A security scanner that admits its limits** — [what it catches and what it does not](security.md)
- **Measured benchmark, caveats included** — [results and method](benchmark/RESULTS.md)

## Which agent do you use?

90 agents are known, 65 of them verified — opencode, Claude Code, Cursor, Codex, Copilot, Gemini CLI, Windsurf, Aider, Zed, Amp, Grok and more. Skills go to each agent's own directory.

MCP servers are configured for the **9 agents that support them** (opencode, Claude Code, Cursor, Windsurf, Devin, Copilot, Continue, oh-my-pi, Muse Code). Full table: [Agent Discovery](agents.md).

## Where to go next

| You want to… | Start here |
| ------------ | ---------- |
| Install it and see it work | [Install Guide](install.md) |
| Set up a whole team at once | [Onboarding Guide](guides/onboarding.md) |
| Wire it into a pipeline | [CI/CD Guide](guides/ci.md) |
| Look up a command | [Commands](commands/index.md) or [CLI Reference](reference.md) |
| Use it as a library | [Node.js API](api.md) |
| Understand the terms | [Glossary](glossary.md) |

## See also

- [Getting Started](guides/getting-started.md) — a five-minute walkthrough.
- [Commands](commands/index.md) — every command, grouped by intent.
- [Install](install.md) — get rolecraft onto every agent you use.
