# Feature Comparison

> How rolecraft stacks up against [skills (Vercel)](https://github.com/vercel/skills) and [@agentskill.sh/cli](https://github.com/agentSkillSh/CLI).

| Feature                                  | rolecraft        | skills (Vercel)   | @agentskill.sh/cli |
| ---------------------------------------- | ---------------- | ----------------- | -------------------- |
| Zero dependencies                        | ✅               | ✅ (1 dep)        | ❌ (2)               |
| Local path install                       | ✅ **1st class** | ✅                | ❌ marketplace only  |
| GitHub repo install                      | ✅               | ✅                | ❌                   |
| GitLab / SSH git URL                     | ❌               | ✅                | ❌                   |
| npm package source                       | ❌               | ✅                | ❌                   |
| Agent targets                            | 30               | 55+               | 15+                  |
| SKILL.md scaffolding                     | ✅               | ✅                | ❌                   |
| Skill discovery (search)                 | ✅               | ✅ (TUI)          | ✅                   |
| Interactive search + install             | ✅               | ❌                | ❌                   |
| Bundle install (`bundle`)                | ✅               | ❌                | ✅ (skillset)        |
| Bundle create (`bundle create`)          | ✅               | ❌                | ❌                   |
| Offline capable                          | ✅               | ✅                | ❌                   |
| Project-level install                    | ✅               | ✅                | ✅                   |
| Interactive scope prompt                 | ✅               | ❌                | ❌                   |
| Dry-run preview (`--dry-run`)            | ✅               | ❌                | ❌                   |
| Lockfile integrity (`--frozen-lockfile`) | ✅               | ✅                | ❌                   |
| Content hash verification (`verify`)     | ✅               | ✅                | ❌                   |
| CI-mode re-install (`ci`)                | ✅               | ✅                | ❌                   |
| Symlink install (`--symlink`)            | ✅               | ✅ (default)      | ❌                   |
| npm provenance                           | ✅               | ❌                | ❌                   |
| Shell completions                        | ✅               | ❌                | ❌                   |
| `doctor` command                         | ❌               | ❌                | ❌                   |
| Self-upgrade command                     | ❌               | ❌                | ❌                   |
| File size                                | ~4 KB            | ~465 KB           | ~84 KB               |
