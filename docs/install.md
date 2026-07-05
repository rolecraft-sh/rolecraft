# Install

## Quick install

```bash
npm install -g rolecraft
# or run without installing:
npx rolecraft install <source>

# also works with pnpm, yarn, bun:
pnpm add -g rolecraft
yarn global add rolecraft
bun add -g rolecraft
```

> **Requirements:** Node.js >= 20

## Install scope

When you run `rolecraft install <source>` without flags, it asks where to install:

```
Where do you want to install this skill?
  1) Global (~/.agents/skills/)
  2) Project (./.agents/skills/) [default]
  3) Both
```

**Project scope is the default** — installed skills are committed with your repo and shared with your team. Use `--global` for personal skills or flags to target specific agents.

### Scope flags

| Flag            | Target directory                   |
| --------------- | ---------------------------------- |
| `--project`     | `./.agents/skills/` (default)      |
| `--global`      | `~/.agents/skills/`                |
| `--all`         | all known agent directories        |
| `--claude`      | `~/.claude/skills/`                |
| `--cursor`      | `~/.cursor/skills/`                |
| `--windsurf`    | `~/.windsurf/skills/` (legacy)     |
| `--devin`       | `~/.devin/skills/`                 |
| `--codex`       | `~/.codex/skills/`                 |
| `--copilot`     | `./.github/copilot/skills/`        |
| `--aider`       | `~/.aider/skills/`                 |
| `--cline`       | `~/.cline/skills/`                 |
| `--gemini`      | `~/.gemini/skills/`                |
| `--cody`        | `~/.cody/skills/`                  |
| `--continue`    | `~/.continue/skills/`              |
| `--warp`        | `~/.warp/skills/`                  |
| `--codeium`     | `~/.codeium/skills/`               |
| `--fabric`      | `~/.fabric/skills/`                |
| `--goose`       | `~/.goose/skills/`                 |
| `--tabnine`     | `~/.tabnine/skills/`               |
| `--supermaven`  | `~/.supermaven/skills/`            |
| `--pr-pilot`    | `~/.pr-pilot/skills/`              |
| `--loom`        | `~/.loom/skills/`                  |
| `--roo`         | `~/.roo/skills/`                   |
| `--trae`        | `~/.trae/skills/`                  |
| `--hermes`      | `~/.hermes/skills/`                |
| `--kiro`        | `~/.kiro/skills/`                  |
| `--augment`     | `~/.augment/skills/`               |
| `--kilo`        | `~/.kilo/skills/`                  |
| `--openhands`   | `~/.openhands/skills/`             |
| `--junie`       | `~/.junie/skills/`                 |
| `--factory`     | `~/.factory/skills/`               |
| `--command-code` | `~/.commandcode/skills/`         |
| `--cortex`      | `~/.snowflake/cortex/skills/`      |
| `--mistral-vibe` | `~/.vibe/skills/`                |
| `--qwen-code`   | `~/.qwen/skills/`                  |
| `--openclaw`    | `~/.openclaw/skills/`              |
| `--codebuddy`   | `~/.codebuddy/skills/`             |
| `--mux`         | `~/.mux/skills/`                   |
| `--pi`          | `~/.pi/agent/skills/`              |
| `--autohand-code` | `~/.autohand/skills/`           |
| `--rovo`        | `~/.rovodev/skills/`               |
| `--firebender`  | `~/.firebender/skills/`            |
| `--bob`             | `~/.bob/skills/`                   |
| `--aider-desk`      | `~/.aider-desk/skills/`            |
| `--code-arts-doer`  | `~/.codeartsdoer/skills/`          |
| `--code-maker`      | `~/.codemaker/skills/`             |
| `--code-studio`     | `~/.codestudio/skills/`            |
| `--crush`           | `~/.crush/skills/`                 |
| `--eve`             | `./agent/skills/`                  |
| `--forge`           | `~/.forge/skills/`                 |
| `--inference-sh`    | `~/.inferencesh/skills/`           |
| `--jazz`            | `~/.jazz/skills/`                  |
| `--iflow`           | `~/.iflow/skills/`                 |
| `--kilo-code`       | `~/.kilocode/skills/`              |
| `--kode`            | `~/.kode/skills/`                  |
| `--lingma`          | `~/.lingma/skills/`                |
| `--mcp-jam`         | `~/.mcpjam/skills/`                |
| `--moxby`           | `~/.moxby/skills/`                 |
| `--ona`             | `~/.ona/skills/`                   |
| `--qoder`           | `~/.qoder/skills/`                 |
| `--reasonix`        | `~/.reasonix/skills/`              |
| `--terra-mind`      | `~/.terramind/skills/`             |
| `--tiny-cloud`      | `~/.tinycloud/skills/`             |
| `--zencoder`        | `~/.zencoder/skills/`              |

Combine flags to install to multiple agents at once:

```bash
rolecraft install ./my-skill --claude --cursor --devin
```

### Install mode flags

| Flag                  | Description                                |
| --------------------- | ------------------------------------------ |
| `--symlink`           | Symlink instead of copy                    |
| `--copy`              | Force copy (default)                       |
| `--dry-run`           | Preview without copying files              |
| `--frozen-lockfile`   | Fail if skill is already installed         |
| `--yes` / `-y`        | Skip all confirmation prompts, use defaults |

## Source types

### Local path

Any directory containing `SKILL.md`:

```bash
rolecraft install ./my-skill
rolecraft install ~/projects/my-skill
rolecraft install /absolute/path/to/skill
```

### GitHub repo

Shorthand `owner/repo`:

```bash
rolecraft install sametcelikbicak/task-decomposer
rolecraft install sametcelikbicak/coverage-guard
```

The CLI clones with `--depth 1`, finds `SKILL.md` recursively, installs it, and cleans up.

### Git URL (GitLab, Bitbucket, SSH)

Any public git repository with `SKILL.md`:

```bash
rolecraft install https://gitlab.com/org/project
rolecraft install https://bitbucket.org/org/project
rolecraft install git@github.com:owner/repo.git
```
