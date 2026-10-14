---
description: Compare installed skills against their source to report which ones have updates available.
---

# `rolecraft check`

Check installed skills for available updates.

## Usage

```bash
rolecraft check
```

## Description

Reads the lockfile and compares each skill's stored content hash against the current source. Skills whose content hash differs from the lockfile are flagged as having updates available. Works with both global and project-scoped skills.

Run `rolecraft update <slug>` to apply the update.

## Example

```bash
rolecraft check
```

## Node.js API

This command is also available as a programmatic function. See the [Node.js API documentation](../api.md) for detailed usage.

```js
import { check } from 'rolecraft'
const updates = await check()
```

## See also

- [Commands hub](./index.md) — every command, grouped by intent.
- [`rolecraft verify`](./verify.md) — verify trust levels, not security.
- [`rolecraft test`](./test.md) — assert a skill behaves as written.
- [Security Scoring](../security.md) — what `check` actually scans.
