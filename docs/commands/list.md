# `rolecraft list`

Show all installed skills.

## Usage

```bash
rolecraft list
rolecraft list --json
```

## Description

Displays every skill currently installed across all agent directories, along with their metadata (slug, name, source, target path).

### `--json`

Output the skill list as JSON for machine consumption (scripts, CI, `jq`):

```bash
rolecraft list --json | jq '.skills | keys'
```
