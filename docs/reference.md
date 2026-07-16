# CLI Reference

Complete reference for all rolecraft commands, flags, and options.

---

## Commands

| Command | Description |
|---------|-------------|
| `init [name]` | Scaffold a new `SKILL.md` in `./<name>/` |
| `install <source>` | Install a skill with security scan |
| `bundle <sources...>` | Install multiple skills from inline sources |
| `bundle create [name]` | Create a new bundle JSON file |
| `use <source>` | Preview a skill's files without installing |
| `list` | Show all installed skills |
| `remove <slug>` | Uninstall a skill |
| `update <slug>` | Re-install a skill to latest version |
| `setup [source]` | Detect agents and optionally install a skill |
| `search <query>` | Search GitHub for skills (`--skills-sh` for skills.sh) |
| `check` | Check for available updates |
| `ci` | Re-install all skills from lockfile (CI mode) |
| `verify` | Check installed skill integrity via content hash |
| `doctor` | Run system health check |
| `watch [slug]` | Watch skills for changes and auto-sync |
| `convert <source>` | Convert between SKILL.md and .mdc formats |
| `profile save/apply/list` | Save, apply, and manage multi-agent profiles |
| `mcp install/list/remove` | Install, list, and remove MCP servers |
| `agents-xml [--write]` | Generate skills XML for AGENTS.md |
| `completions bash\|zsh\|fish` | Generate shell completion scripts |
| `upgrade` | Upgrade rolecraft to latest version |
| `--help`, `-h` | Show usage |
| `--version`, `-v` | Show version |

---

## Common flags

These flags work across multiple commands:

| Flag | Affects | Description |
|------|---------|-------------|
| `--yes` / `-y` | install, setup, bundle, ci | Non-interactive: accept all defaults, bypass security prompts |
| `--dry-run` | install, setup, bundle, remove, update, profile | Preview without making changes |
| `--global` | install, use, setup | Install to `~/.agents/skills/` (user-wide) |
| `--project` | install, use, setup | Install to `./.agents/skills/` (repo-scoped, default) |
| `--all` | install, setup, profile | Install to every supported agent |
| `--symlink` | install, setup | Symlink instead of copy |
| `--copy` | install, setup | Force copy (default) |
| `--frozen-lockfile` | install | Fail if skill is already installed |
| `--no-mcp` | install, setup | Skip MCP server installation |
| `--interactive` | search | Open TUI for browsing and selecting results |

---

## Agent-specific flags

Pass any of these to `install`, `setup`, or `profile` to target specific agents:

| Flag | Agent | Skill directory |
|------|-------|-----------------|
| `--agents` | opencode | `~/.agents/skills/` |
| `--claude` | claude-code | `~/.claude/skills/` |
| `--cursor` | cursor | `~/.cursor/skills/` |
| `--windsurf` | windsurf | `~/.windsurf/skills/` |
| `--devin` | devin | `~/.devin/skills/` |
| `--codex` | codex | `~/.codex/skills/` |
| `--copilot` | copilot | `./.github/copilot/skills/` |
| `--aider` | aider | `~/.aider/skills/` |
| `--cline` | cline | `~/.cline/skills/` |
| `--gemini` | gemini-cli | `~/.gemini/skills/` |
| `--cody` | cody | `~/.cody/skills/` |
| `--continue` | continue | `~/.continue/skills/` |
| `--warp` | warp | `~/.warp/skills/` |
| `--codeium` | codeium | `~/.codeium/skills/` |
| `--fabric` | fabric | `~/.fabric/skills/` |
| `--goose` | goose | `~/.goose/skills/` |
| `--tabnine` | tabnine | `~/.tabnine/skills/` |
| `--supermaven` | supermaven | `~/.supermaven/skills/` |
| `--pr-pilot` | pr-pilot | `~/.pr-pilot/skills/` |
| `--loom` | loom | `~/.loom/skills/` |
| `--roo` | roo | `~/.roo/skills/` |
| `--trae` | trae | `~/.trae/skills/` |
| `--hermes` | hermes | `~/.hermes/skills/` |
| `--kiro` | kiro | `~/.kiro/skills/` |
| `--augment` | augment | `~/.augment/skills/` |
| `--kilo` | kilo | `~/.kilo/skills/` |
| `--openhands` | openhands | `~/.openhands/skills/` |
| `--junie` | junie | `~/.junie/skills/` |
| `--factory` | factory | `~/.factory/skills/` |
| `--command-code` | command-code | `~/.commandcode/skills/` |
| `--cortex` | cortex | `~/.snowflake/cortex/skills/` |
| `--mistral-vibe` | mistral-vibe | `~/.vibe/skills/` |
| `--qwen-code` | qwen-code | `~/.qwen/skills/` |
| `--openclaw` | openclaw | `~/.openclaw/skills/` |
| `--codebuddy` | codebuddy | `~/.codebuddy/skills/` |
| `--mux` | mux | `~/.mux/skills/` |
| `--pi` | pi | `~/.pi/agent/skills/` |
| `--autohand-code` | autohand-code | `~/.autohand/skills/` |
| `--rovo` | rovo-dev | `~/.rovodev/skills/` |
| `--firebender` | firebender | `~/.firebender/skills/` |
| `--bob` | ibm-bob | `~/.bob/skills/` |
| `--aider-desk` | aider-desk | `~/.aider-desk/skills/` |
| *(and 44+ more — see [full list](agents))* | | |

Combine multiple flags in one command:

```bash
rolecraft install ./my-skill --cursor --claude --devin --copilot
```

---

## Subcommand detail

### `rolecraft init [name]`

Scaffold a new skill:

```bash
rolecraft init my-skill     # creates ./my-skill/SKILL.md
rolecraft init              # creates ./SKILL.md
```

### `rolecraft install <source>`

Install a skill from any source:

```bash
rolecraft install ./path                             # local directory
rolecraft install owner/repo                         # GitHub shorthand
rolecraft install https://gitlab.com/org/project     # Git URL
rolecraft install git@github.com:owner/repo.git      # SSH URL
rolecraft install npm:package                        # npm package
```

Accepts: `--yes`, `--dry-run`, `--global`, `--project`, `--all`, `--symlink`, `--frozen-lockfile`, `--no-mcp`, agent flags.

### `rolecraft bundle <sources...>`

```bash
rolecraft bundle owner/skill1 owner/skill2 ./local
rolecraft bundle bundle.json
rolecraft bundle bundle.txt
rolecraft bundle create [name]
```

### `rolecraft use <source>`

Preview without installing. Same source types as `install`.

```bash
rolecraft use ./my-skill         # show files
rolecraft use owner/repo         # from GitHub
rolecraft use ./my-skill | head -50  # pipe to pager
```

### `rolecraft list`

```bash
rolecraft list                  # all installed skills
rolecraft list --project         # project-level only
rolecraft list --global          # global only
```

### `rolecraft remove <slug>`

```bash
rolecraft remove my-skill
rolecraft remove my-skill --dry-run
```

### `rolecraft update <slug>`

Re-install from original source:

```bash
rolecraft update my-skill
```

### `rolecraft setup [<source>]`

```bash
rolecraft setup                  # detect agents only
rolecraft setup ./my-skill       # detect + install
rolecraft setup owner/repo --yes
```

### `rolecraft search <query>`

```bash
rolecraft search code-review                  # GitHub search
rolecraft search code-review --interactive     # TUI picker
rolecraft search react --skills-sh             # skills.sh (experimental)
```

### `rolecraft check`

No arguments. Checks all installed skills for newer versions.

### `rolecraft ci`

Re-install all skills from lockfile. Use `--yes` in CI.

### `rolecraft verify`

Verifies SHA256 content hashes of all installed skills.

### `rolecraft doctor`

Runs system health checks: Node.js version, agent directories, lockfile integrity, skill file existence.

### `rolecraft watch [<slug>]`

```bash
rolecraft watch                 # watch all skills
rolecraft watch my-skill        # watch specific skill
```

### `rolecraft convert <source>`

Converts between formats. Auto-detects direction:

```bash
rolecraft convert ./skill/SKILL.md     # → .mdc
rolecraft convert ./rule.mdc            # → SKILL.md
rolecraft convert ./dir/                # directory, auto-detects format
rolecraft convert ./dir/ --output ./out
rolecraft convert ./skill --dry-run
```

### `rolecraft profile`

```bash
profile save <name>           # capture current config
profile apply <name>          # apply saved config
profile list                  # list all profiles
profile show <name>           # show profile details
profile diff <name>           # compare with current
profile edit <name>           # edit with $EDITOR
profile delete <name>         # remove profile
profile export <name>         # export as JSON
profile import <path>         # import from file/URL
profile link [name]           # link to project
```

### `rolecraft mcp`

```bash
mcp install <source> [flags]    # install MCP server
mcp list                        # list all MCP servers
mcp remove <name> [flags]       # remove MCP server
```

### `rolecraft agents-xml [--write]`

Generates XML block for AGENTS.md. Use `--write` to auto-insert.

### `rolecraft completions bash|zsh|fish`

```bash
rolecraft completions bash >> ~/.bashrc
rolecraft completions zsh >> ~/.zshrc
rolecraft completions fish >> ~/.config/fish/completions/rolecraft.fish
```

### `rolecraft upgrade`

Upgrades rolecraft to the latest npm version.
