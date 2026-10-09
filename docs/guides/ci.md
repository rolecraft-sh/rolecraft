# CI/CD Integration

Use rolecraft in your CI pipeline to verify and install skills automatically.

## GitHub Action

The [rolecraft-action](https://github.com/marketplace/actions/rolecraft-action) wraps the CLI for easy CI integration:

[![Marketplace](https://img.shields.io/badge/Get%20it%20on%20GitHub%20Marketplace-rolecraft--action-blue?logo=github)](https://github.com/marketplace/actions/rolecraft-action)

```yaml
name: Verify skills
on: [push]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      # Actions are pinned to commit SHAs, matching this repo's own workflows.
      # A floating tag can be moved to point at different code, which is the
      # same supply-chain risk rolecraft's lockfile checks guard against.
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 22
      - uses: rolecraft-sh/rolecraft-action@0cbe93d3791d8f434f2862f758b64b4d531e74a0 # v1
        with:
          command: ci
```

## Examples

### Re-install from lockfile

```yaml
- uses: rolecraft-sh/rolecraft-action@v1
  with:
    command: ci
```

### Verify skill integrity

```yaml
- uses: rolecraft-sh/rolecraft-action@v1
  with:
    command: verify
```

### Run system health check

```yaml
- uses: rolecraft-sh/rolecraft-action@v1
  with:
    command: doctor
```

### Dry-run install

```yaml
- uses: rolecraft-sh/rolecraft-action@v1
  with:
    command: install user/repo --dry-run
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `command` | ✅ | — | Any rolecraft command and flags |
| `version` | ❌ | `latest` | RoleCraft version (`latest`, `1.6.0`, etc.) |

## Action repository

https://github.com/rolecraft-sh/rolecraft-action
