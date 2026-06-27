# `rolecraft use`

Preview a skill's files without installing.

## Usage

```bash
rolecraft use <source>
```

## Description

Resolves the source, shows metadata, and prints all file contents to stdout — without writing anything to disk. Useful for inspecting a skill before installing, or piping content into other tools.

## Examples

```bash
# Preview a local skill
rolecraft use ./my-skill

# Preview a GitHub skill
rolecraft use sametcelikbicak/task-decomposer

# Pipe content
rolecraft use ./my-skill | head -50
```
