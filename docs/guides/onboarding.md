# Onboarding Guide

Get your AI agents productive in a single command.

## The problem

Every AI coding agent works best when it knows your project's conventions, rules, and tools. Without a setup flow, you either:

- Manually copy instructions into each agent's config
- Repeat the same context every session
- Maintain separate setups for cursor, claude-code, copilot, aider, and others

## The solution

`rolecraft setup <source>` detects every AI agent on your machine and installs a skill — plus its MCP servers — to all of them in one command.

```bash
rolecraft setup ./team-conventions
```

One command. All agents. Skills + MCP servers. Zero configuration.

---

## Step-by-step

### 1. Install rolecraft

```bash
npm install -g rolecraft
```

Works with npm, pnpm, yarn, bun. Or run without installing:

```bash
npx rolecraft setup owner/repo
```

### 2. Pick a skill source

**From GitHub** (public repos with `SKILL.md`):

```bash
rolecraft setup sametcelikbicak/task-decomposer
rolecraft setup your-org/team-conventions
```

**From a local path** (team folder checked into your repo):

```bash
rolecraft setup ./.agents/skills/dev-setup
```

**From npm** (packages with `SKILL.md`):

```bash
rolecraft setup npm:@org/agent-rules
```

**From any git URL** (GitLab, Bitbucket, SSH):

```bash
rolecraft setup https://gitlab.com/org/project
rolecraft setup git@github.com:org/repo.git
```

### 3. See the magic

rolecraft will:

1. Scan your system and detect **every AI agent** installed (opencode, cursor, claude-code, copilot, aider, etc.)
2. Run a **security scan** on the skill files (0–100 score)
3. Copy the skill to **all detected agents** simultaneously
4. Install any **MCP servers** declared in the skill's `SKILL.md`

```
🔍 Detecting agents...

   Detected agents: 48
   • opencode        1 skill(s)
   • cursor          3 skill(s)
   • claude-code     2 skill(s)
   • copilot         1 skill(s)
   • ...

📦 Installing skill from: ./dev-setup
   Found: dev-setup (dev-setup)

✅ Installed to 48 agents
🔧 MCP servers installed: filesystem, fetch
```

---

## Skills that include MCP servers

This is where rolecraft is unique. A single `SKILL.md` can declare MCP servers in its frontmatter:

```yaml
---
name: postgres-rules
mcp_servers:
  - name: postgres
    source: npm:@modelcontextprotocol/server-postgres
    args: [--database, mydb]
  - name: filesystem
    source: npm:@modelcontextprotocol/server-filesystem
    args: [/path/to/project]
---
```

When you run `rolecraft setup ./postgres-rules`, it installs both the skill **and** the MCP servers. No separate tools, no manual config.

[→ Full MCP documentation](../mcp.md)

---

## Team onboarding with bundles

Share multiple skills at once with a bundle file:

```bash
rolecraft bundle create team-defaults
```

Follow the prompts to add skills. This creates a `.agents/.skill-bundle.json` file you can commit to your repo. New team members run:

```bash
rolecraft setup
rolecraft bundle ./team-defaults
```

Or combine everything in a single onboarding script:

```bash
# setup.sh
npm install -g rolecraft
rolecraft setup npm:@org/team-conventions
rolecraft bundle ./team-defaults.json
rolecraft mcp list  # verify MCP servers installed
rolecraft doctor    # verify everything works
```

---

## CI/CD pipeline integration

For automated environments, use `--yes` to skip prompts:

```bash
rolecraft setup your-org/ci-rules --yes --dry-run   # preview first
rolecraft setup your-org/ci-rules --yes              # install
```

Lockfile-based deterministic re-install:

```bash
rolecraft ci --yes
```

---

## What was installed?

Check what skills are active:

```bash
rolecraft list                # all installed skills
rolecraft list --project       # project-level skills only
rolecraft list --global        # global skills only
```

Verify integrity:

```bash
rolecraft verify              # content hash check
rolecraft doctor              # full system health check
```

---

## Next steps

- [Install guide](../install.md) — full reference for all install options
- [MCP servers](../mcp.md) — manage MCP servers standalone
- [Security scoring](../security.md) — how the static analysis works
- [Comparison](../comparison.md) — rolecraft vs other tools
