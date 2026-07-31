# `rolecraft list`

Show all installed skills.

## Usage

```bash
rolecraft list
rolecraft list --json
rolecraft list --agent <name>
rolecraft list -a <name>
```

## Description

Displays every skill currently installed across all agent directories, along with their metadata (slug, name, source, target path).

### `--json`

Output the skill list as JSON for machine consumption (scripts, CI, `jq`):

```bash
rolecraft list --json | jq '.skills | keys'
```

### `--agent, -a <name>`

Filter the output to show only skills installed to a specific agent:

```bash
rolecraft list --agent cursor   # only skills installed to cursor
rolecraft list -a claude-code   # alias
```

Agent names are matched case-insensitively (e.g. `--agent CURSOR` matches `cursor`). When a filter is set, the header and summary lines include the matched agent, using the casing stored in the lockfile.

## Node.js API

This command is also available as a programmatic function. See the [Node.js API documentation](../api.md) for detailed usage.

```js
import { list } from 'rolecraft'
const skills = await list()
```
