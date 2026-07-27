# `rolecraft verify`

Check installed skill integrity via content hash.

## Usage

```bash
rolecraft verify
```

## Description

Computes SHA256 hashes of all installed skill files and compares them against the stored hashes in the lockfile. Reports any files that have been modified, corrupted, or are missing.

## Node.js API

This command is also available as a programmatic function. See the [Node.js API documentation](../api.md) for detailed usage.

```js
import { verify } from 'rolecraft'
const result = await verify()
```
