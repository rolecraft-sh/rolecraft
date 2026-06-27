# `rolecraft setup`

Detect installed AI agents and optionally install a skill to all of them.

## Usage

```bash
rolecraft setup                    # detect which agents are available
rolecraft setup <source>           # detect + install to all detected agents
```

## Description

Scans your system for known AI agent directories. When a source is provided, automatically installs the skill to every detected agent.

## Examples

```bash
# Show detected agents
rolecraft setup

# Detect + install to all detected agents
rolecraft setup ./my-skill

# Detect + install a GitHub skill to all detected agents
rolecraft setup sametcelikbicak/task-decomposer
```
