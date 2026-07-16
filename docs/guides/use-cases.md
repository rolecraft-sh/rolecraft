# Use Cases

rolecraft solves one problem: **getting AI agents to follow the same rules, conventions, and tools across your entire stack.** Here's when it shines.

---

## 1. Team onboarding

**Problem:** Every new developer spends hours configuring cursor, claude-code, copilot, aider, and other agents. Each agent has a different config format, different skill directory, different MCP setup.

**Solution:** One `rolecraft setup` command detects all agents and installs everything.

```bash
# New team member runs this once:
npm install -g rolecraft
rolecraft setup ./team-conventions
```

The team commits a `SKILL.md` with their conventions, MCP servers, and rules to the repo. New hires are productive in minutes.

```yaml
# team-conventions/SKILL.md
name: frontend-conventions
description: Frontend coding standards for the team
mcp_servers:
  - name: filesystem
    source: npm:@modelcontextprotocol/server-filesystem
rules: |
  - Use TypeScript strict mode
  - All components must have tests
  - Follow the existing naming conventions
```

**Who it's for:** Engineering leads, platform teams, anyone on onboarding duty.

---

## 2. CI/CD pipeline standardization

**Problem:** CI pipelines need deterministic environments. Manual skill installation breaks reproducibility. Different team members have different agent setups.

**Solution:** Lockfile-based deterministic re-install with `rolecraft ci`.

```bash
# CI pipeline
rolecraft ci --yes
```

The lockfile (`~/.agents/.skill-lock.json`) pins exact sources and content hashes. Same install every time.

```yaml
# GitHub Actions workflow
- run: npm install -g rolecraft
- run: rolecraft ci --yes
```

Use `--dry-run` to preview changes before applying:

```bash
rolecraft ci --yes --dry-run
```

**Who it's for:** DevOps engineers, platform teams, CI/CD maintainers.

---

## 3. Multi-agent consistency

**Problem:** You use Cursor for daily development, Claude Code for complex refactoring, and Copilot for code reviews. Each agent has its own skill directory and format. Keeping them in sync is manual.

**Solution:** Install once, target all agents.

```bash
rolecraft install ./my-rules --all
```

This installs to every agent rolecraft knows about. Add a new agent later? Re-run with `--all` and it fills in the gaps.

Check what's installed where:

```bash
rolecraft list --global
```

**Who it's for:** Developers using 2+ AI agents regularly.

---

## 4. MCP server fleet management

**Problem:** Installing MCP servers requires editing JSON configs for each agent. The format differs between cursor (`mcp_config.json`), claude-code (`claude_code.json`), and copilot (`.mcp.json`). Multiply by N agents and it's unmanageable.

**Solution:** Declare MCP servers in `SKILL.md` frontmatter. rolecraft handles the per-agent config format automatically.

```yaml
# SKILL.md
name: data-science
mcp_servers:
  - name: postgres
    source: npm:@modelcontextprotocol/server-postgres
  - name: filesystem
    source: npm:@modelcontextprotocol/server-filesystem
```

```bash
rolecraft install ./data-science --all
# Installs skill + postgres MCP + filesystem MCP to every agent
```

Manage MCP servers standalone:

```bash
rolecraft mcp list                          # what's installed
rolecraft mcp install npm:@modelcontextprotocol/server-github --cursor
rolecraft mcp remove postgres --claude
```

**Who it's for:** Developers who use multiple agents and MCP-enabled tools.

---

## 5. Skill migration & format conversion

**Problem:** Cursor uses `.mdc` files. Claude Code uses `SKILL.md`. You're switching agents or maintaining both. Manually converting between formats is error-prone.

**Solution:** `rolecraft convert` handles bidirectional conversion.

```bash
# Convert a Cursor .mdc rule to SKILL.md
rolecraft convert ./cursor-rule.mdc

# Convert a SKILL.md to .mdc
rolecraft convert ./my-skill/SKILL.md

# Convert a directory (auto-detects format)
rolecraft convert ./my-skill/
```

MCP server declarations are preserved in both directions.

**Who it's for:** Developers migrating between agents, or maintaining skills for multiple agent types.

---

## 6. Security auditing

**Problem:** Anyone can publish a skill. Skills run with access to your codebase, environment variables, and file system. Malicious skills can exfiltrate data, inject commands, or override agent behavior.

**Solution:** Every install triggers a static security scan scoring 0–100.

```
❌ Security scan: 58/100 — DANGER
   ❌ [critical] Command injection: download-and-execute pattern (SKILL.md)
   ❌ [critical] Prompt injection: attempts to override instructions (SKILL.md)
   ⚪ [low] No owner specified for this skill
```

- **Score 90–100:** Installs silently
- **Score 70–89:** Shows warning, asks for confirmation
- **Score 0–69:** Blocks install (use `--yes` to force)

```bash
rolecraft install unknown/repo   # blocked by default
rolecraft install ./trusted-skill --yes  # force install
```

**Who it's for:** Security-conscious teams, anyone installing third-party skills.

---

## 7. Personal productivity

**Problem:** You have a set of prompts, rules, and MCP servers you use every day. Setting them up on a new machine is tedious. Sharing them between personal and work machines is manual.

**Solution:** Install your personal skill with one command:

```bash
rolecraft install github.com/you/your-personal-skill --all
```

Backup and restore your entire agent setup:

```bash
rolecraft profile save my-setup --all
rolecraft profile export my-setup --file ./backup.json
```

On a new machine:

```bash
rolecraft profile import ./backup.json
```

**Who it's for:** Solo developers, freelancers, anyone with multiple machines.

---

## Who should NOT use rolecraft?

- **You use one agent with no custom rules** — you don't need it
- **You prefer manual config** — rolecraft automates what you can do by hand
- **Your agents don't support skills** — check [agent discovery](../agents) for compatibility
