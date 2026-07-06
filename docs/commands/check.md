# `rolecraft check`

Check installed skills for available updates.

## Usage

```bash
rolecraft check
```

## Description

Reads the lockfile and compares each skill's stored content hash against the current source. Skills whose content hash differs from the lockfile are flagged as having updates available. Works with both global and project-scoped skills.

## Example

```bash
rolecraft check
```
