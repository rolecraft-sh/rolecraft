# Node.js API

rolecraft exposes a programmatic API for use in your own Node.js scripts, tools, and CI pipelines. All API functions return plain objects with no side-effects.

## Usage

```js
import { install, list, search, doctor, searchRegistry } from 'rolecraft'

// install a skill
const result = await install('./my-skill', { global: true })

// list installed skills
const skills = await list()

// search GitHub for skills
const results = await search('code-review')

// search the registry for skills
const registryResults = await searchRegistry('react')

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

### `rollback(slug, options?)`

Restore a skill to its previous version from backup history. History is created automatically on `update` or re-install.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `list` | `boolean` | `false` | Show history without restoring |
| `dryRun` | `boolean` | `false` | Preview without restoring |

Returns `{ slug, files, targets, prevContentSha }`.

Or with `list: true`: `{ slug, currentVersion, history: [{ version, contentSha, installedAt }] }`.

### `list(cwd?, options?)`

List installed skills.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `json` | `boolean` | `false` | Return structured data |
| `agent` | `string` | — | Filter skills by agent name (case-insensitive) |

Returns `{ skills: { [slug]: { name, slug, owner, description, source, sourceType, scope, installedAt, contentSha, ... } }, total: number, globals: number, projects: number, agent?: string }`.

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

Returns `{ installed: [{ slug, name, scope }], failed: [{ slug, reason }], skillCount, mcpCount, total, allPassed, mcpInstalled: [{ name, agents }], mcpFailed: [{ name, reason }] }`.

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
| `deep` | `boolean` | `false` | Run conflict detection across all installed skills |

Returns `{ status, checks: [...], summary: { passed, warnings, errors, total }, agents, mcp, skills, conflicts }`.

When `deep: true`, the `conflicts` array contains objects shaped as `{ a, b, sections: [{ heading, a, b }] }` where `a` and `b` are conflicting skill slugs and each section lists up to 3 differing lines from each skill.

### `use(source, options?)`

Preview a skill's files without installing.

Returns `{ name, slug, files: [...], targets: [...] }`.

### `resolve(source)`

Resolve a source string to its metadata. Returns `{ slug, name, files, contentSha, ... }`.

### `resolveSkills(source)`

Resolve a source string and discover all skills within it (including multi-skill repos). Used internally by `install`, `use`, and `setup`.

Returns `[{ slug, name, description, owner, files, sourcePath, sourceType, content }]`.

### `diff(skillA, skillB, options?)`

Section-aware comparison of two SKILL.md files.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `json` | `boolean` | `false` | Return structured JSON |
| `brief` | `boolean` | `false` | Show only summary of changes |
| `noColor` | `boolean` | `false` | Disable colored output |

Returns `{ a, b, frontmatter, sections: [{ heading, status, added, removed }], stats }`.

### `compose(sources, options?)`

Merge or chain multiple SKILL.md files into one.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `string` | `'merge'` | `'merge'` (dedup lines) or `'chain'` (override) |
| `name` | `string` | — | Output skill name |
| `json` | `boolean` | `false` | Return structured JSON |
| `noColor` | `boolean` | `false` | Disable colored output |

Returns `{ content, stats: { sources, totalInputSections, totalOutputSections, mergedSections, frontmatterFields } }`.

### `test(skillPath, options?)`

Run quality assertions against a SKILL.md file.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `all` | `boolean` | `false` | Test all installed skills |
| `json` | `boolean` | `false` | Return structured JSON |
| `verbose` | `boolean` | `false` | Show detailed results |
| `noColor` | `boolean` | `false` | Disable colored output |
| `noEmoji` | `boolean` | `false` | Use ASCII fallback for emojis |
| `minScore` | `number` | `0` | Fail if score is below threshold |
| `only` | `string\|string[]` | — | Run specific checks by name |

Returns `{ skill, score, grade, label, assertions: [...], suggestions: [...] }`. With `--all`, returns `{ results: [...], summary: { total, passed, failed, skipped } }`.

### `mcpInstall(source, options?)`

Install an MCP server.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | — | Override the server name |
| `yes` | `boolean` | `false` | Skip confirmation and security blocks |
| `dryRun` | `boolean` | `false` | Preview without making changes |

Returns `{ server: { name, command, args }, agent, configPath }`.

### `mcpList(options?)`

List all installed MCP servers.

Returns `{ servers: [{ name, command, args, agent }] }`.

### `mcpUpdate(name, options?)`

Update an MCP server.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | — | Server name override |
| `yes` | `boolean` | `false` | Skip confirmation |
| `dryRun` | `boolean` | `false` | Preview without making changes |

Returns `{ server: { name, command, args } }`.

### `mcpRemove(name, options?)`

Remove an MCP server.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dryRun` | `boolean` | `false` | Preview only |

Returns `{ removed: true }`.

### `mcpCheck(options?)`

Check MCP server health.

Returns `{ servers: [{ name, currentVersion, latestVersion, hasUpdate }], updatesAvailable: number }`.

### `mcpSearch(query, options?)`

Search for MCP servers on npm or GitHub.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `npm` | `boolean` | `false` | Search npm registry instead of GitHub |
| `interactive` | `boolean` | `false` | Enable TUI picker |

Returns `{ results: [{ name, description, source, stars }] }`.

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

### `searchRegistry(query)`

Search the registry index by slug, name, or description.

| Param | Type | Description |
|-------|------|-------------|
| `query` | `string` | Search term |

Returns `[{ slug, name, description, repo, author, versions, latest }]`.

### `registryResolve(slug)`

Resolve a registry slug to its full skill metadata.

| Param | Type | Description |
|-------|------|-------------|
| `slug` | `string` | Registry slug (e.g. `"react-rules"`) |

Returns `{ slug, name, description, repo, author, versions, latest }`. Throws if not found.

### `registryPublish(entry, token?)`

Fork the registry repo, update index.json, and open a PR.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `entry` | `object` | — | `{ slug, name, repo, description?, version? }` |
| `token` | `string` | `GITHUB_TOKEN` env | GitHub personal access token |

Returns `{ url, number }` (PR URL and number).

### `registryCheckUpdates(skills)`

Compare installed skills against registry and detect newer versions.

| Param | Type | Description |
|-------|------|-------------|
| `skills` | `array` | `[{ slug, name, version }]` |

Returns `[{ slug, name, current, latest }]`.

### `registryInfo(slug)`

Get detailed info about a single registry skill.

| Param | Type | Description |
|-------|------|-------------|
| `slug` | `string` | Registry slug |

Returns the full skill entry. Throws if not found.

### `registryList()`

List all skills in the registry. Returns `[{ slug, name, description, repo, author, versions, latest }]`.

### `registryClearCache()`

Clear the in-memory registry index cache. Next registry call will re-fetch from GitHub.

### `setup(source, options?)`

Detect agents and optionally install a skill to all detected agents.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `yes` | `boolean` | `false` | Install all skills without prompt |
| `dryRun` | `boolean` | `false` | Preview only |
| `list` | `boolean` | `false` | List available skills without installing |
| `skill` | `string\|string[]` | — | Install specific skills by name |

Returns `{ agents: [{ flag, label }], installed?: [{ name, slug, results }] }`. With `list: true`, returns `{ agents, skills: [{ name, slug, owner, description, files }] }`.

### `bundle(sources, options?)`

Install multiple skills from inline sources or a bundle file.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dryRun` | `boolean` | `false` | Preview only |
| `noMcp` | `boolean` | `false` | Skip MCP server installation |

Returns `{ installed: number, failed: number, results: [{ source, status, error? }] }`.

### `watch(slug?, cwd?, options?)`

Watch installed local skills for file changes and auto-sync.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dryRun` | `boolean` | `false` | Preview only |

Returns `{ watchers: FSWatcher[], skills: string[] }`. The caller is responsible for managing the watcher lifecycle.

### `convert(source, options?)`

Convert skills between SKILL.md and .mdc formats.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dryRun` | `boolean` | `false` | Preview only |
| `output` | `string` | `process.cwd()` | Output directory |

Returns `[{ from: string, to: string, format?: 'skill-to-mdc'\|'mdc-to-skill' }]`.

### `init(name?)`

Scaffold a new SKILL.md file.

| Param | Type | Description |
|-------|------|-------------|
| `name` | `string` | Skill name or `owner/name` (default: `my-skill`) |

Returns `{ path: string, slug: string, name: string, owner: string }`.

### `upgrade(options?)`

Check for rolecraft updates and upgrade.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dryRun` | `boolean` | `false` | Check without upgrading |

Returns `{ current: string, latest: string|null, isUpToDate: boolean|null, upgraded?: boolean, version?: string }`.

### `completions(shell)`

Generate shell completion script.

| Param | Type | Description |
|-------|------|-------------|
| `shell` | `string` | `'bash'`, `'zsh'`, or `'fish'` |

Returns the completion script as a string.

### `agentsXml(writeToFile?)`

Generate a `<skills_system>` XML block listing installed skills.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `writeToFile` | `boolean` | `false` | Write or replace XML section in `./AGENTS.md` |

Returns `{ xml: string, written: boolean, path?: string }`.

### `compareVersions(a, b)`

Compare two semver version strings. Returns negative, zero, or positive number.
