# `rolecraft check`

Check installed skills for available updates.

## Usage

```bash
rolecraft check
```

## Description

Reads the lockfile and compares each skill's stored content hash against the current source. Skills whose content hash differs from the lockfile are flagged as having updates available. Works with both global and project-scoped skills.

If the [rolecraft Registry](./registry.md) is reachable, `check` also looks up version information for each installed skill. When a newer version is published in the registry, it shows up in the output with `(registry)` suffix:

```
   🔄 testing-guide              v1.0.0 → v1.1.0 (registry)
   ✅ react-rules                up to date
```

Run `rolecraft update <slug>` to apply the update.

## Example

```bash
rolecraft check
```
