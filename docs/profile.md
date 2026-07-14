# Profile Management

Save, apply, and share complete AI agent configurations as named profiles.

## Why profiles?

You've spent time tuning your AI agents — config files, MCP servers, skills, instructions. When you switch projects or onboard a teammate, you have to reconstruct that setup from memory.

A **profile** captures everything about an agent's configuration as a named snapshot:

- **Config files** — `~/.cursor/mcp.json`, `.cursorrules`, project settings
- **MCP servers** — which servers are installed and their arguments
- **Skills** — which skills are installed and from where
- **Instructions** — custom instructions per agent

Save it once, apply anywhere.

## Quick start

```bash
# Save your current cursor + claude setup as a profile
rolecraft profile save frontend-dev --cursor --claude

# Apply it later (or on another machine)
rolecraft profile apply frontend-dev

# Share with a teammate
rolecraft profile export frontend-dev --file ./team-profile.json --relative
```

## Team workflow

```bash
# Lead saves a canonical setup
rolecraft profile save team-standard --all

# Export with relative paths (no machine-specific absolute paths)
rolecraft profile export team-standard --file .agent-profile.json --relative

# Commit to repo
git add .agent-profile.json
git commit -m "feat: add team agent profile"

# Teammate imports and applies
rolecraft profile import .agent-profile.json
rolecraft profile diff team-standard   # preview changes
rolecraft profile apply team-standard  # apply
```

## Per-project profiles with `link`

Link a profile to a specific project directory:

```bash
rolecraft profile link frontend-dev   # creates .agent-profile.json in cwd
rolecraft profile link                # shows which profile is linked
rolecraft profile link --unlink       # remove the link
```

The linked profile is automatically discovered when `rolecraft profile apply` runs in that directory.

## Safety: backups

Every `profile apply` creates a timestamped backup of your current config in `~/.agents/backups/` before making changes. Rollback is a manual restore from that directory.

## Commands reference

See [`docs/commands/profile.md`](./commands/profile.md) for the full command reference.
