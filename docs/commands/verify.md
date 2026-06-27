# `rolecraft verify`

Check installed skill integrity via content hash.

## Usage

```bash
rolecraft verify
```

## Description

Computes SHA256 hashes of all installed skill files and compares them against the stored hashes in the lockfile. Reports any files that have been modified, corrupted, or are missing.
