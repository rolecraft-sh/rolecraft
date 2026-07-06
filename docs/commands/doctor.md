# `rolecraft doctor`

Run a system health check to diagnose common issues.

## Usage

```bash
rolecraft doctor
```

## Description

Scans your system and reports on:

- **Node.js version** — verifies >= 20
- **rolecraft version** — shows current installed version
- **Home directory** — confirms HOME is set
- **~/.agents directory** — checks if the global agents directory exists
- **Global lockfile** — reads the lockfile and counts tracked skills
- **Project lockfile** — reads the project-scoped lockfile (if any)
- **Agent detection** — finds all installed AI agents by scanning known skill directories
- **Skill integrity** — for each skill in the lockfile, verifies the skill directory exists and content hashes match

## Example output

```bash
$ rolecraft doctor

🔬 rolecraft doctor — System Health Check

   ✅ Node.js version                        v22.0.0
   ✅ rolecraft version                      v1.2.0
   ✅ Home directory                         /home/user
   ✅ ~/.agents directory                    /home/user/.agents
   ✅ Global lockfile                        3 skill(s) tracked
   ⚠️  Project lockfile                       no project skills
   ✅ Agent detection                        2 agent(s) found
     ✅  └ opencode                          2 skill(s)
     ✅  └ claude-code                       1 skill(s)
   ✅ Skill integrity                        3 checked, 0 hash mismatch(es), 0 missing director(ies)

📋 Summary: 9 passed, 1 warnings, 0 errors
```

```bash
$ rolecraft doctor

🔬 rolecraft doctor — System Health Check

   ✅ Node.js version                        v20.11.0
   ✅ rolecraft version                      v1.2.0
   ✅ Home directory                         /home/user
   ⚠️  ~/.agents directory                   not yet created
   ⚠️  Global lockfile                       no global skills
   ⚠️  Project lockfile                      no project skills
   ⚠️  Agent detection                       no supported agents detected
   ⚠️  Skill integrity                       no skills to verify

📋 Summary: 3 passed, 5 warnings, 0 errors
```
