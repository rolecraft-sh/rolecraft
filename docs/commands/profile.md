# `rolecraft profile` — Profile Management

Save, apply, and share multi-agent configuration profiles.

Profiles capture your agent settings (config files, MCP servers, skills, and instructions) as named snapshots that can be applied later or shared across projects.

## Usage

```bash
rolecraft profile save <name> [options]
rolecraft profile apply <name> [options]
rolecraft profile diff <name>
rolecraft profile edit <name>
rolecraft profile list
rolecraft profile show <name>
rolecraft profile delete <name> [options]
rolecraft profile export <name> [options]
rolecraft profile import <path>
rolecraft profile link [<name>] [options]
```

## Subcommands

### `save`

Capture current agent configurations into a named profile.

```bash
rolecraft profile save frontend-dev --cursor --claude
rolecraft profile save full-setup --all
rolecraft profile save minimal --dry-run
```

**Options:**
- `--agents`, `--cursor`, `--claude`, etc. — Target specific agents
- `--all` — Save all detected agents
- `--dry-run` — Preview what would be saved without writing

Profiles are stored as JSON in `~/.agents/profiles/<name>.json`.

### `apply`

Apply a profile's settings to your agents.

```bash
rolecraft profile apply frontend-dev
rolecraft profile apply frontend-dev --dry-run
rolecraft profile apply frontend-dev --cursor-only
rolecraft profile apply frontend-dev --skip-mcp
rolecraft profile apply frontend-dev --skip-skills
```

**Options:**
- `--agents`, `--cursor`, `--claude`, etc. — Apply to specific agents only
- `--dry-run` — Preview changes without applying
- `--skip-mcp` — Skip MCP server configuration
- `--skip-skills` — Skip skill installation

Apply creates backups of existing configs in `~/.agents/backups/` before making changes.

### `diff`

Compare a profile against your current configuration.

```bash
rolecraft profile diff frontend-dev
```

Shows which aspects (config, MCP servers, skills, instructions) differ for each agent.

### `edit`

Open a profile in your `$EDITOR` for manual editing.

```bash
EDITOR=cursor rolecraft profile edit frontend-dev
EDITOR=code -w rolecraft profile edit frontend-dev
```

Validates JSON on save and writes the profile back.

### `list`

List all saved profiles with agent counts and dates.

```bash
rolecraft profile list
```

### `show`

Display a profile's summary including which agents and configs it contains.

```bash
rolecraft profile show frontend-dev
```

### `delete`

Delete a saved profile.

```bash
rolecraft profile delete frontend-dev
rolecraft profile delete frontend-dev --dry-run
```

### `export`

Export a profile as clean JSON (metadata stripped).

```bash
rolecraft profile export frontend-dev
rolecraft profile export frontend-dev --file ./profile.json
rolecraft profile export frontend-dev --file ./profile.json --relative
```

**Options:**
- `--file <path>` — Write to a file instead of stdout
- `--relative` — Convert absolute paths to relative (for sharing)

### `import`

Import a profile from a JSON file or URL.

```bash
rolecraft profile import ./profile.json
rolecraft profile import https://example.com/profiles/dev-setup.json
```

If the JSON has no `name`, the filename is used. Shows a hint to run `profile diff` afterward.

### `link`

Link a profile to the current project directory.

```bash
rolecraft profile link frontend-dev       # Create link
rolecraft profile link                    # Show linked profile
rolecraft profile link --unlink           # Remove link
```

Creating a link writes a `.agent-profile.json` file in the current directory.

## Profile Storage

All profiles are stored in `~/.agents/profiles/` as JSON files:

```
~/.agents/profiles/
  frontend-dev.json
  data-science.json
  full-setup.json
```

Each profile captures per-agent settings including config files, MCP server definitions, skill references, and instruction files.

## Examples

```bash
# Save a focused profile
rolecraft profile save frontend-dev --cursor --claude

# Apply to all agents
rolecraft profile apply full-setup

# See what would change
rolecraft profile diff full-setup

# Share with a teammate
rolecraft profile export full-setup --file ./team-profile.json --relative

# Import a shared profile
rolecraft profile import ./team-profile.json
```
