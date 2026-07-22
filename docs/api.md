# Node.js API

rolecraft exposes a programmatic API for use in your own Node.js scripts, tools, and CI pipelines. All API functions return plain objects with no side-effects.

## Usage

```js
import { install, list, search, doctor } from 'rolecraft'

// install a skill
const result = await install('./my-skill', { global: true })

// list installed skills
const skills = await list()

// search GitHub for skills
const results = await search('code-review')

// run health check
const health = await doctor()
```

## Available Functions

### `install(source, options?)`

Install a skill with security scan.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `global` | `boolean` | `false` | Install to `~/.agents/skills/` |
| `project` | `boolean` | `true` | Install to `./.agents/skills/` |
| `yes` | `boolean` | `false` | Bypass security prompts |
| `dryRun` | `boolean` | `false` | Preview only |
| `symlink` | `boolean` | `false` | Symlink instead of copy |
| `frozenLockfile` | `boolean` | `false` | Fail if already installed |
| `noMcp` | `boolean` | `false` | Skip MCP server installation |
| `skill` | `string\|string[]` | — | Specific skill slug(s) |

Returns `{ results: [{ name, slug, owner, security, install }], mcpResults?: [...] }`.

### `list(cwd?, options?)`

List installed skills.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `json` | `boolean` | `false` | Return structured data |

Returns `{ global: [...], project: [...] }`.

### `remove(slug, options?)`

Uninstall a skill.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dryRun` | `boolean` | `false` | Preview only |

Returns `{ removed: [...], targets: [...] }`.

### `update(slug, options?)`

Re-install a skill from its original source.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dryRun` | `boolean` | `false` | Preview only |

Returns `{ slug, source, updated: boolean }`.

### `check(options?)`

Check installed skills for available updates.

Returns `{ updates: [{ slug, hasUpdate }], current: [...] }`.

### `verify(options?)`

Verify SHA256 content hashes of installed skills.

Returns `{ verified: [...], failed: [...] }`.

### `ci(options?)`

Re-install all skills and MCP servers from lockfile.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `yes` | `boolean` | `false` | Non-interactive mode |
| `dryRun` | `boolean` | `false` | Preview only |
| `frozenLockfile` | `boolean` | `false` | Fail if lockfile changes |

Returns `{ installed: [...], failed: [...] }`.

### `search(query, options?)`

Search for skills on GitHub or skills.sh.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `skillsSh` | `boolean` | `false` | Search skills.sh instead of GitHub |
| `interactive` | `boolean` | `false` | Enable TUI picker |

Returns `{ results: [{ full_name, description, stargazers_count, language }], source: 'github'|'skills.sh' }`.

### `doctor(options?)`

Run system health check.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `json` | `boolean` | `false` | Return structured data |
| `network` | `boolean` | `false` | Include GitHub connectivity test |

Returns `{ status, checks: [...], summary: { passed, warnings, errors, total }, agents, mcp, skills }`.

### `use(source, options?)`

Preview a skill's files without installing.

Returns `{ name, slug, files: [...], targets: [...] }`.

### `resolve(source)`

Resolve a source string to its metadata. Returns `{ slug, name, files, contentSha, ... }`.

### `mcpInstall(source, options?)`

Install an MCP server.

Returns `{ server: { name, command, args }, agent, configPath }`.

### `mcpList(options?)`

List all installed MCP servers. Returns `{ servers: [...] }`.

### `mcpUpdate(name, options?)`

Update an MCP server. Returns `{ server: { name, command, args } }`.

### `mcpRemove(name, options?)`

Remove an MCP server. Returns `{ removed: true }`.

### `mcpCheck(options?)`

Check MCP server health. Returns `{ servers: [...], updatesAvailable: number }`.

### `mcpSearch(query, options?)`

Search for MCP servers on npm. Returns `{ results: [...] }`.

### `profileSave(name, options?)`

Save current agent configuration as a profile. Returns `{ agents: number }`.

### `profileApply(name, options?)`

Apply a saved profile.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dryRun` | `boolean` | `false` | Preview only |
| `skipMcp` | `boolean` | `false` | Skip MCP configuration |
| `skipSkills` | `boolean` | `false` | Skip skill installation |
| `yes` | `boolean` | `false` | Non-interactive mode |

Returns `{ agents: [...], mcp: [...], skills: [...] }`.

### `profileDiff(name)`

Compare current config against a saved profile. Returns `{ added: [...], removed: [...], changed: [...] }`.

### `profileList()`

List all saved profiles. Returns `{ profiles: [...] }`.

### `profileShow(name)`

Show profile details. Returns `{ name, agents: {...}, createdAt, updatedAt }`.

### `profileDelete(name)`

Delete a saved profile. Returns `{ deleted: true }`.

### `profileImport(source)`

Import a profile from file or URL. Returns `{ name, agents: number }`.
