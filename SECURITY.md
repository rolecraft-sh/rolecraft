# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in rolecraft, please report it privately.

**Do not** disclose the issue publicly until it has been addressed.

To report a vulnerability, open a GitHub Security Advisory at:

https://github.com/rolecraft-sh/rolecraft/security/advisories/new

Or email the maintainer directly (see the committer history for contact).

You should receive a response within 48 hours. If you don't, please follow up.

## Scope

This security policy covers:

- The `rolecraft` CLI tool and its source code
- The automated release pipeline (GitHub Actions workflows)
- npm package integrity

## Supported Versions

Only the latest published version on npm receives security updates.

## Supply Chain

rolecraft has **zero runtime dependencies**. Security recommendations:

- Always install from the official npm registry
- Verify the package provenance (available since v1.0.0) via `npm audit --provenance`
- Pin the version in production environments
