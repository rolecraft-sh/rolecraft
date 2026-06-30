# `rolecraft completions`

Generate shell completion scripts for bash, zsh, and fish.

## Usage

```bash
rolecraft completions bash|zsh|fish
```

## Description

Prints a shell completion script to stdout. Source the output to enable tab-completion for rolecraft commands, flags, and arguments.

## Install

Add the appropriate line to your shell's rc file:

```bash
# Bash (~/.bashrc)
source <(rolecraft completions bash)

# Zsh (~/.zshrc)
source <(rolecraft completions zsh)

# Fish (~/.config/fish/config.fish)
rolecraft completions fish | source
```

## What gets completed

- **Top-level commands**: `install`, `search`, `bundle`, `use`, `list`, `remove`, `update`, `setup`, `init`, `verify`, `ci`, `completions`, `help`, `version`
- **Scope flags**: `--claude`, `--cursor`, `--devin`, `--copilot`, and all 30+ agent targets
- **Option flags**: `--dry-run`, `--symlink`, `--copy`, `--interactive`, `--frozen-lockfile`, `--global`, `--project`, `--all`
- **Completions subcommands**: `bash`, `zsh`, `fish`

## Examples

```bash
# Preview the script
rolecraft completions bash

# Install for current session only (bash)
source <(rolecraft completions bash)

# After install, try typing:
#   rolecraft ins<Tab>  →  rolecraft install
#   rolecraft install --<Tab>  →  lists all flags
#   rolecraft completions <Tab>  →  bash zsh fish
```
