# Architecture

## How it works

`rolecraft install <source>` is the reference path; the other commands reuse its pieces.

1. Resolves the source (local path, GitHub/GitLab/SSH, npm) and parses `SKILL.md` frontmatter. A directory may contain more than one skill; nested skill containers (`.claude/skills/`, `.agents/skills/`, `skills/`) are discovered up to 3 levels deep
2. Runs the **security scan** over the resolved files — prompt injection, command injection, obfuscated code, credential harvesting, sensitive file access. Scores 0–100. Every install path enforces this: `install`, `bundle`, `update`, `setup`, `search --interactive`, `watch`, `ci`, `profile apply`. It does not run under `--dry-run`. [What it does not catch →](security.md#what-this-does-not-catch)
3. Copies (or symlinks with `--symlink`) the skill's **top-level files** to each target directory. Files in subdirectories of the skill are not installed, hashed or scanned — [#325](https://github.com/rolecraft-sh/rolecraft/issues/325)
4. Computes a SHA256 content hash and stores it in the lockfile
5. Writes `~/.agents/.skill-lock.json` for global installs and `<cwd>/.agents/.skill-lock.json` for project installs. rolecraft owns these files; agents do not read them
6. `rolecraft verify` compares the installed files against the stored hash. It checks the directories derived from the lockfile entry; `rolecraft doctor` checks a different, narrower set and can disagree with it
7. `rolecraft ci` re-installs skills and MCP servers from lockfiles. It re-resolves each source live and records a hash of what it installed — it does not pin sources and there is no `--frozen` mode. [#402](https://github.com/rolecraft-sh/rolecraft/issues/402)
8. `rolecraft doctor` runs a system health check across Node.js, agent directories and lockfiles
9. `rolecraft profile` saves, applies, diffs, edits, exports, imports and links multi-agent configuration profiles
10. `rolecraft mcp` manages MCP server configurations — `install`, `list`, `search`, `check`, `update` and `remove`
11. `rolecraft agents-xml` generates a skills XML block for `AGENTS.md`
12. `rolecraft watch` watches installed skills for changes and auto-syncs. Only local sources are watched, and it refuses to sync a skill the scan blocks
13. `rolecraft convert` converts between `SKILL.md` and `.mdc` formats
14. Skills installed by `@agentskill.sh/cli`, `add-skill` or by hand are read as-is. This is inferred from the slug normalisation and `lockfile.version = 3`; it is not covered by a test

## Project structure

```
rolecraft/
├── bin/rolecraft.js          # CLI entry point, command table, flag validation
├── src/
│   ├── agents.js             # the 87 agent records: directories, support level, MCP capability
│   ├── index.js              # public API entry point
│   ├── agents/
│   │   └── manifest.js       # docs-generation view of the agent table
│   ├── api/                  # business logic; importable via `import { ... } from 'rolecraft'`
│   │   ├── agents-xml.js     #   AGENTS.md XML block generation
│   │   ├── bundle.js         #   multi-skill install from a bundle file
│   │   ├── bundle-internal.js#   bundle install core
│   │   ├── check.js          #   skill update checking
│   │   ├── ci.js             #   lockfile-driven re-install
│   │   ├── completions.js    #   re-export shim for the completion generators
│   │   ├── compose.js        #   combine skills into one
│   │   ├── convert.js        #   SKILL.md <-> .mdc conversion
│   │   ├── diff.js           #   compare two states
│   │   ├── doctor.js         #   system health check
│   │   ├── init.js           #   SKILL.md scaffolding
│   │   ├── install.js        #   skill installation + MCP install
│   │   ├── list.js           #   list installed skills
│   │   ├── mcp.js            #   MCP server install/list/update/remove
│   │   ├── profile.js        #   agent config profile management
│   │   ├── remove.js         #   skill removal
│   │   ├── rollback.js       #   restore a previous skill version
│   │   ├── search.js         #   GitHub/skills.sh search
│   │   ├── setup.js          #   programmatic setup (the CLI uses commands/setup.js)
│   │   ├── test.js           #   skill quality scoring
│   │   ├── update.js         #   skill re-install
│   │   ├── upgrade.js        #   self-upgrade
│   │   ├── use.js            #   skill preview
│   │   ├── verify.js         #   integrity verification
│   │   └── watch.js          #   watch for changes and auto-sync
│   ├── commands/             # CLI wrappers: parse args, call api/, format output
│   │   ├── agents-xml.js     ├── agents.js       ├── bundle.js
│   │   ├── check.js          ├── ci.js           ├── completions.js
│   │   ├── compose.js        ├── convert.js      ├── diff.js
│   │   ├── doctor.js         ├── init.js         ├── install.js
│   │   ├── list.js           ├── mcp.js          ├── profile.js
│   │   ├── remove.js         ├── rollback.js     ├── search.js
│   │   ├── setup.js          ├── test.js         ├── update.js
│   │   ├── spec.js           ├── upgrade.js      ├── use.js
│   │   ├── verify.js         └── watch.js
│   └── utils/
│       ├── agent-detection.js#   which agents are installed on this machine
│       ├── converter.js     #   frontmatter parsing, SKILL.md <-> .mdc
│       ├── debounce.js      #   slug-keyed debounce for watch
│       ├── errors.js        #   UserError + CLI error formatting
│       ├── http-fetch.js    #   fetch with timeout
│       ├── installer.js     #   copy/symlink files to target dirs
│       ├── lock-write.js    #   atomic write + cross-process lock for lockfiles
│       ├── lockfile.js      #   .skill-lock.json schema + content hashing
│       ├── mcp-lock.js      #   .mcp-lock.json
│       ├── mcp.js           #   MCP server config read/write + source resolution
│       ├── paths.js         #   home/cwd path helpers
│       ├── profile.js       #   profile capture/apply utilities
│       ├── resolver.js      #   source resolution: local / GitHub / GitLab / npm
│       ├── scan-gate.js     #   scan policy: what to do about a finding
│       ├── security.js      #   static analysis scoring (0-100)
│       ├── spinner.js       #   terminal spinner
│       ├── templates/       #   `init` scaffolding templates
│       └── tui.js           #   theme, tables, pickers
├── e2e/                     # end-to-end tests (not run by `npm test` — see #388)
├── benchmark/               # install-speed benchmark
├── scripts/                 # docs generation, hooks, benchmarks
├── hooks/                   # git hooks installed by postinstall
├── docs/                    # documentation site sources
├── package.json  biome.json  CHANGELOG.md  CONTRIBUTING.md  SECURITY.md
├── AGENTS.md   MANIFEST-MATRIX.md   RELEASE.md   SKILL.md
└── README.md
```

## Architecture overview

Three layers, and where each one is allowed to reach.

**1. `src/api/`** — business logic. Modules export async functions that take options and return plain objects. Intended to be side-effect free and importable via `import { ... } from 'rolecraft'`. Two caveats: `api/install.js` writes progress warnings with `console.error`, and four modules reach into `commands/` (`api/setup.js`, `api/doctor.js`, `api/completions.js`, `utils/profile.js`).

**2. `src/commands/`** — CLI layer. Parses args, calls `api/`, formats output. Most files are thin; `setup.js` holds real logic, and `completions.js` is the implementation behind the 14-line `api/completions.js` shim. `spec.js` is the single description of the command surface — every command, its flags, their descriptions and its aliases — from which `bin/rolecraft.js` derives flag validation and help, and `completions.js` derives all three shell scripts (#410).

**3. `src/utils/`** — shared helpers. No circular dependencies. Not strictly a bottom layer: `utils/profile.js` imports from `commands/setup.js`, which is how `detectAgents` ended up reachable from four places before it moved to `utils/agent-detection.js`.

The command surface is 26 modules under `src/commands/` over 25 under `src/api/`, exposed as 25 top-level handlers in `bin/rolecraft.js` (`profile` and `mcp` each carry several subcommands). Those handlers hold no flag lists: they read flags by exact name, and the one `validateFlags` call in `main()` checks them against `commands/spec.js`. A flag added there appears in `--help`, in validation and in all three completion scripts at once. Unknown commands and flags exit 2, so a typo is distinguishable from a failed operation.