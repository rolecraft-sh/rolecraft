# CI/CD Integration

Use rolecraft in your CI pipeline to verify and install skills automatically.

## GitHub Action

The [rolecraft-action](https://github.com/marketplace/actions/rolecraft-action) wraps the CLI for easy CI integration:

```yaml
name: Verify skills
on: [push]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: rolecraft-sh/rolecraft-action@v1
        with:
          command: ci --yes
```

## Examples

### Re-install from lockfile

```yaml
- uses: rolecraft-sh/rolecraft-action@v1
  with:
    command: ci --yes
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
