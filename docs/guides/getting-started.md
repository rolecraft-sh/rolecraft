# Getting Started

Welcome to **rolecraft** — a zero-dependency CLI for installing AI agent skills as roles & behaviors from any source.

This guide gets you from zero to productive in 5 minutes.

---

## What is rolecraft?

A skill is a reusable capability for your AI coding agent. Think of it as a plugin or a role:

- **Code review assistant** — install a skill, every agent knows your review standards
- **React best practices** — Cursor, Claude Code, and Copilot all follow the same rules
- **Team conventions** — one command sets up every agent on every developer's machine
- **MCP servers** — skills can declare and install MCP servers alongside themselves

rolecraft manages all of this across **86+ AI agents** with a single CLI and **zero runtime dependencies**.

---

## Quick start

### 1. Install

```bash
npm install -g rolecraft
```

Or run without installing:

```bash
npx rolecraft install <source>
```

> **Requirements:** Node.js >= 20. That's it. No other dependencies.

### 2. Find a skill

Search GitHub for skills:

```bash
rolecraft search code-review
```

This returns repositories containing `SKILL.md` files — the standard skill format.

### 3. Install a skill

Install to your default agent (project scope):

```bash
rolecraft install sametcelikbicak/task-decomposer
```

Or install to specific agents:

```bash
rolecraft install sametcelikbicak/task-decomposer --cursor --claude
```

Or install to **every** agent on your machine:

```bash
rolecraft install sametcelikbicak/task-decomposer --all
```

### 4. List installed skills

```bash
rolecraft list
```

Shows all skills with their scope (global vs project), target agents, and install date.

### 5. Remove a skill

```bash
rolecraft remove task-decomposer
```

---

## What just happened?

When you ran `rolecraft install`:

1. **Source resolution** — cloned/downloaded the source, found `SKILL.md`
2. **Security scan** — analyzed every file for prompt injection, command injection, obfuscated code, and credential harvesting. Scored 0–100. Blocked if dangerous.
3. **Install** — copied files to the target agent's skill directory
4. **Lockfile update** — stored SHA256 content hashes for future verification

You can verify integrity anytime:

```bash
rolecraft verify
```

---

## Create your own skill

```bash
rolecraft init my-skill
```

This scaffolds a `SKILL.md` in `./my-skill/`. Edit the metadata and rules, then:

```bash
rolecraft install ./my-skill --all
```

---

## Next steps

- **[Onboarding Guide](./onboarding)** — set up your whole team in one command
- **[Install Guide](../install)** — full reference for all install options
- **[Security Scoring](../security)** — understand the static analysis
- **[Comparison](../comparison)** — how rolecraft stacks up against other tools
