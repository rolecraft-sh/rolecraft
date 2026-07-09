# Feature Comparison

> How rolecraft stacks up against [skills (Vercel)](https://github.com/vercel-labs/skills) and [@agentskill.sh/cli (`ags`)](https://github.com/agentskill-sh/ags).

| Feature                                  | rolecraft        | skills (Vercel)  | @agentskill.sh/cli  |
| ---------------------------------------- | ---------------- | ---------------- | ------------------- |
| Zero dependencies                        | ✅               | ✅ (1 dep)        | ❌ (2)              |
| Local path install                       | ✅ **1st class** | ✅                | ❌ marketplace only |
| GitHub repo install                      | ✅               | ✅                | ❌                  |
| GitLab / SSH git URL                     | ✅               | ✅                | ❌                  |
| npm package source                       | ✅               | ✅                | ❌                  |
| Agent targets                            | **82**           | **72**            | 15+                 |
| SKILL.md scaffolding (`init`)            | ✅               | ✅                | ❌                  |
| Skill preview (`use`)                    | ✅               | ✅                | ❌                  |
| Agent auto-detect + install (`setup`)    | ✅               | ❌                | ✅                  |
| Skill discovery (search)                 | ✅               | ✅                | ✅                  |
| Interactive TUI search + install         | ✅               | ✅                | ❌                  |
| Bundle install (`bundle`)                | ✅               | ❌                | ✅ (skillset)       |
| Bundle create (`bundle create`)          | ✅               | ❌                | ❌                  |
| Offline capable                          | ✅               | ✅                | ❌                  |
| Project-level install                    | ✅               | ✅                | ✅                  |
| Interactive scope prompt                 | ✅               | ✅                | ❌                  |
| Non-interactive flag (`--yes`/`-y`)      | ✅               | ✅                | ❌                  |
| Dry-run preview (`--dry-run`)            | ✅               | ❌                | ❌                  |
| Lockfile integrity (`--frozen-lockfile`) | ✅               | ✅                | ❌                  |
| Content hash verification (`verify`)     | ✅               | ✅                | ❌                  |
| CI-mode re-install (`ci`)                | ✅               | ✅                | ❌                  |
| Skill update check (`check`)             | ✅               | ❌                | ❌                  |
| Skill update / re-install (`update`)     | ✅               | ✅                | ❌                  |
| Symlink install (`--symlink`)            | ✅               | ✅ (default)      | ❌                  |
| Self-upgrade (`upgrade`)                 | ✅               | ❌                | ❌                  |
| npm provenance                           | ✅               | ❌                | ❌                  |
| Shell completions (bash/zsh/fish)        | ✅               | ❌                | ❌                  |
| In-agent `/learn` command                | ❌               | ❌                | ✅                  |
| Skill rating / feedback                  | ❌               | ❌                | ✅                  |
| Skill diff / compose                     | ❌               | ❌                | ❌                  |
| System health check (`doctor`)           | ✅               | ❌                | ❌                  |
| Watch mode (auto-sync)                   | ✅               | ❌                | ❌                  |
| AGENTS.md XML generation                 | ✅               | ❌                | ❌                  |
| **MCP server management**                | ✅               | ❌                | ❌                  |
| Security scanning (0–100)                | ✅               | ✅ (Snyk)         | ✅                  |
| Telemetry / leaderboard                  | ❌               | ✅                | ❌                  |
| File size                                | ~4 KB            | ~465 KB           | ~84 KB              |
