---
description: Check the npm registry and upgrade the rolecraft CLI itself to the latest version.
---

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

## See also

- [Commands hub](./index.md) — every command, grouped by intent.
- [`rolecraft update`](./update.md) — update skills instead of rolecraft.
- [`rolecraft doctor`](./doctor.md) — check the install after an upgrade.
