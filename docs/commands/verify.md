# `rolecraft verify`

Check installed skill integrity via content hash.

## Usage

```bash
rolecraft verify
```

## Description

Computes SHA256 hashes of all installed skill files and compares them against the stored hashes in the lockfile. Reports any files that have been modified, corrupted, or are missing.

Files in subdirectories are included, keyed by their path relative to the skill root (`scripts/run.sh`). `.git` and `node_modules` are skipped at any depth.

::: warning Upgrading from a version before nested-file hashing
Lockfiles written by earlier versions hashed only top-level files, so a skill with subdirectories recorded a `contentSha` that never covered them. After upgrading, `verify` reports those entries as a mismatch once. Re-install the affected skills (`rolecraft update <slug>`) to recompute the hash; the files themselves are unchanged.
:::

## Node.js API

This command is also available as a programmatic function. See the [Node.js API documentation](../api.md) for detailed usage.

```js
import { verify } from 'rolecraft'
const result = await verify()
```
