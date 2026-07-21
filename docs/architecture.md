# Architecture

## How it works

1. Reads `SKILL.md` from the source and parses metadata (slug, name, owner)
2. Runs a **security scan** on all skill files — checks for prompt injection, command injection, obfuscated code, credential harvesting, and sensitive file access. Scores 0–100. Blocks dangerous skills unless `--yes`
3. Copies (or symlinks with `--symlink`) all files alongside `SKILL.md` to the target directory
4. Computes a SHA256 content hash and stores it in the lockfile
5. Updates `~/.agents/.skill-lock.json` so agents can discover the skill
6. `rolecraft verify` checks installed files against the stored hash
7. `rolecraft ci` re-installs all skills and MCP servers from lockfiles (e.g. in CI pipelines)
8. `rolecraft doctor` runs a system health check across Node.js, agent directories, and lockfiles
9. `rolecraft profile` saves, applies, diffs, edits, exports, imports, and links multi-agent configuration profiles
10. `rolecraft mcp` manages MCP server configurations (install, list, remove)
11. `rolecraft agents-xml` generates a skills XML block for `AGENTS.md`
12. `rolecraft watch` watches installed skills for changes and auto-syncs
13. `rolecraft convert` converts between SKILL.md and .mdc formats
14. Compatible with skills installed by `@agentskill.sh/cli`, `add-skill`, or manual installs

## Project structure

```
rolecraft/
├── bin/rolecraft.js          # CLI entry point
├── src/
│   ├── commands/
│   │   ├── agents-xml.js     # generate skills XML for AGENTS.md
│   │   ├── bundle.js         # multi-skill install from bundle file
│   │   ├── check.js          # skill update checking
│   │   ├── ci.js             # frozen lockfile install
│   │   ├── completions.js    # shell completion generation
│   │   ├── doctor.js         # system health check
│   │   ├── init.js           # SKILL.md scaffolding
│   │   ├── install.js        # install logic + interactive scope
│   │   ├── list.js           # list installed skills
│   │   ├── mcp.js            # MCP server management (install/list/remove)
│   │   ├── profile.js        # agent config profile management
│   │   ├── remove.js         # remove skill + lockfile cleanup
│   │   ├── search.js         # GitHub skill discovery
│   │   ├── setup.js          # detect agents + install to all
│   │   ├── update.js         # re-install skill to latest
│   │   ├── upgrade.js        # self-upgrade
│   │   ├── use.js            # preview skill without installing
│   │   ├── verify.js         # integrity verification
│   │   └── watch.js          # watch skills for changes and auto-sync
│   └── utils/
│       ├── installer.js      # copy/symlink files to target dirs
│       ├── lockfile.js       # read/write .skill-lock.json + content hash
│       ├── mcp-lock.js       # read/write .mcp-lock.json for MCP restore
│       ├── mcp.js            # MCP server config read/write
│       ├── profile.js        # profile CRUD, capture, apply utilities
│       ├── resolver.js       # source resolver (local / GitHub / GitLab / npm)
│       └── security.js       # static analysis scoring (0–100)
├── package.json
├── CHANGELOG.md              # Release history
├── CONTRIBUTING.md           # Contribution guide
├── docs/                     # Documentation
└── README.md
```
