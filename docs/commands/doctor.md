# `rolecraft doctor`

Run a system health check to diagnose common issues.

## Usage

```bash
rolecraft doctor
rolecraft doctor --json          # JSON output
rolecraft doctor --network       # include network connectivity check
```

## Description

Scans your system and reports on:

- **Node.js version** — verifies >= 20, shows runtime path
- **Platform** — OS and kernel release
- **Git / npm availability** — needed for GitHub and npm sources
- **~/.agents directory** — existence and permissions
- **Lockfile schema** — validates global lockfile format
- **Global & project lockfiles** — skill count per scope
- **Disk usage** — total size of installed skills
- **Agent detection** — finds installed agents among 86+ supported, per-agent skill count and directory permissions
- **Orphaned skill dirs** — directories not tracked in any lockfile
- **Skill integrity** — verifies skill directories exist, content hashes match, and checks for broken symlinks
- **MCP servers** — counts configured MCP servers across detected agents
- **Network** (with `--network`) — tests connectivity to GitHub

## Flags

| Flag | Description |
|------|-------------|
| `--json` | Output results as structured JSON |
| `--network` | Include a network connectivity check (GitHub) |

## Example output

```bash
$ rolecraft doctor

🔬 rolecraft doctor — System Health Check

   ✅ Node.js version                        v22.0.0
   ✅ Git availability                       detected
   ✅ npm availability                       detected
   ✅ rolecraft version                      v1.6.0
   ✅ Node.js location                       /usr/local/bin/node
   ✅ Platform                               darwin 24.0.0
   ✅ Home directory                         /home/user
   ✅ ~/.agents directory                    /home/user/.agents
   ✅ ~/.agents permissions                  rwx
   ✅ Global lockfile schema                 v3, valid
   ✅ Global lockfile                        3 skill(s) tracked
   ⚠️  Project lockfile                       no project skills
   ✅ Disk usage                             3 skill(s), 12.5 KB total
   ✅ Agent detection                        14/86 supported agents detected
     ✅  └ opencode                          2 skill(s) [rwx]
     ✅  └ claude-code                       1 skill(s) [rwx]
   ✅ Orphaned skill dirs                    none
   ✅ Skill integrity                        3 checked, 0 hash mismatch(es)
   ✅ MCP servers                            6 configured across 3 agent(s)

📋 Summary: 14/15 passed, 1 warnings, 0 errors
```

```bash
$ rolecraft doctor --json

{
  "status": "degraded",
  "checks": {
    "Node.js version": { "status": "pass", "detail": "v22.0.0" },
    "Agent detection": { "status": "pass", "detail": "14/86 supported agents detected" },
    "Skill integrity": { "status": "warn", "detail": "3 checked, 1 missing director(ies)" },
    "MCP servers": { "status": "warn", "detail": "none configured" }
  },
  "summary": { "passed": 12, "warnings": 3, "errors": 0 }
}
```

```bash
$ rolecraft doctor --network

🔬 rolecraft doctor — System Health Check

   ...
   ✅ Network (GitHub)                       reachable

📋 Summary: 15/15 passed, 0 warnings, 0 errors
```
