# `rolecraft upgrade`

Upgrade rolecraft itself to the latest version.

## Usage

```bash
rolecraft upgrade
rolecraft upgrade --dry-run
```

## Description

Checks the npm registry for the latest version of rolecraft and
upgrades if a newer version is available.

Uses `npm install -g rolecraft` under the hood.

Use `--dry-run` to check for updates without actually upgrading.

## Node.js API

This command is also available as a programmatic function. See the [Node.js API documentation](../api.md) for detailed usage.

```js
import { upgrade } from 'rolecraft'
const result = await upgrade({ dryRun: true })
```
