# `rolecraft ci`

Re-install all skills from lockfile (CI mode).

## Usage

```bash
rolecraft ci
```

## Description

Reads the lockfile and re-installs every skill, ensuring the installed state matches the locked state exactly. Designed for CI pipelines and team onboarding — run this after cloning a repository to restore all project skills.

## Example

```bash
# In CI or after git clone
rolecraft ci
```
