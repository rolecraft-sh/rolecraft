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
