# Architecture

## How it works

1. Reads `SKILL.md` from the source and parses metadata (slug, name, owner)
2. Copies (or symlinks with `--symlink`) all files alongside `SKILL.md` to the target directory
3. Computes a SHA256 content hash and stores it in the lockfile
4. Updates `~/.agents/.skill-lock.json` so agents can discover the skill
5. `rolecraft verify` checks installed files against the stored hash
6. `rolecraft ci` re-installs all skills from the lockfile (e.g. in CI pipelines)
7. Compatible with skills installed by `@agentskill.sh/cli`, `add-skill`, or manual installs

## Project structure

```
rolecraft/
├── bin/rolecraft.js          # CLI entry point
├── src/
│   ├── commands/
│   │   ├── bundle.js          # multi-skill install from bundle file
│   │   ├── ci.js              # frozen lockfile install
│   │   ├── init.js            # SKILL.md scaffolding
│   │   ├── install.js         # install logic + interactive scope
│   │   ├── list.js            # list installed skills
│   │   ├── remove.js          # remove skill + lockfile cleanup
│   │   ├── search.js          # GitHub skill discovery
│   │   ├── setup.js           # detect agents + install to all
│   │   ├── update.js          # re-install skill to latest
│   │   ├── use.js             # preview skill without installing
│   │   └── verify.js          # integrity verification
│   └── utils/
│       ├── resolver.js       # source resolver (local / GitHub)
│       ├── installer.js      # copy/symlink files to target dirs
│       └── lockfile.js       # read/write .skill-lock.json + content hash
├── package.json
├── CHANGELOG.md              # Release history
├── CONTRIBUTING.md           # Contribution guide
├── docs/                     # Documentation
└── README.md
```
