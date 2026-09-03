# Frequently Asked Questions

## Do I need to sign up or log in?

No. No account, no API key, no marketplace. Point rolecraft at any folder or repo and it works.

## Can I use rolecraft with multiple AI agents?

Yes. 87 agents supported. Use `--cursor`, `--claude`, `--devin` flags or `--all` for every agent.

## Does rolecraft send telemetry?

No. Zero data leaves your machine. The security scan runs locally. No phone home.

## How is this different from `npx skills` (Vercel)?

rolecraft has zero dependencies, MCP server management, 87 agents (vs 72), `doctor`, `watch`, `bundle`, `agents-xml`, and shell completions. [Full comparison →](./comparison.md)

## Can I use it in CI/CD?

Yes. `rolecraft ci --yes` re-installs all skills from lockfile, non-interactive. Perfect for pipelines. [CI/CD guide →](./guides/ci.md)

## My skill is blocked as DANGER. What do I do?

Review the security report, fix the flagged patterns, or use `--yes` to force install (not recommended for untrusted skills). [Security docs →](./security.md)
