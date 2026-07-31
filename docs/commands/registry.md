# rolecraft Registry

The rolecraft Registry is a centralised skill index powered by GitHub. Skills are published via PRs, automatically validated, then merged by a maintainer.

**Registry repo:** https://github.com/rolecraft-sh/registry

## Usage overview

| Command                                          | What it does                                |
| ------------------------------------------------ | ------------------------------------------- |
| `rolecraft search <query> --registry`            | Search the registry                         |
| `rolecraft install <slug>`                       | Install a skill by its registry slug        |
| `rolecraft publish <source>`                     | Publish your skill to the registry          |
| `rolecraft check`                                | Updates include registry version checks     |

## Search the registry

```bash
rolecraft search code-review --registry
```

Sample output:

```
📦 Registry results for "code-review":

   code-review
   ├─ Best practices for code review
   └─ rolecraft install code-review

1 result(s) found.
```

The `--registry` flag filters the registry index by `slug`, `name`, or `description`.

## Install by slug

```bash
# Instead of: rolecraft install user/full-repo-name
rolecraft install my-skill
```

When you pass a slug that isn't a local path, GitHub ref, git URL, or npm ref, rolecraft automatically looks it up in the registry and resolves it to the underlying GitHub repo.

This works through the existing `install` flow, so all flags like `--yes`, `--global`, `--dry-run`, `--frozen-lockfile`, and `--symlink` continue to work.

## Publish a skill

### Using CLI (recommended)

You need **your own** [GitHub token](https://github.com/settings/tokens) (scope: `repo`) to publish. See [`publish.md`](./publish.md) for full details.

Quick start:

```bash
# 1. Create a token at: https://github.com/settings/tokens
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# 2. Publish your skill
rolecraft publish ./my-skill/ --repo user/my-skill --yes
```

> The token is used only to fork the registry and open a PR on your behalf. It never leaves your machine.

### Manual PR (no CLI needed)

Don't use rolecraft CLI? Just edit `index.json` directly:

1. Fork https://github.com/rolecraft-sh/registry
2. Edit `index.json` — add your entry to the `skills` array
3. Commit and open a PR

Example entry:

```json
{
  "slug": "my-skill",
  "name": "My Skill",
  "description": "Does something",
  "repo": "your-username/your-skill",
  "author": "your-username",
  "versions": ["v1.0.0"],
  "latest": "v1.0.0"
}
```

**Constraints:**
- `slug`: kebab-case only (`^[a-z0-9]+(-[a-z0-9]+)*$`), must be unique
- `author`: must match your GitHub username (CI enforces this)
- `repo`: must be a real GitHub repo containing a `SKILL.md`
- Full JSON Schema at [`schema.json`](https://github.com/rolecraft-sh/registry/blob/main/schema.json)

## Update checking

`rolecraft check` automatically queries the registry for version updates on every installed skill. If a newer version is available, you'll see it marked with `(registry)` in the output:

```
   🔄 testing-guide              v1.0.0 → v1.1.0 (registry)
```

## Behind the scenes

### Why GitHub?

The registry is a normal GitHub repository (`rolecraft-sh/registry`). We deliberately chose this over building a custom backend because:

- **Zero infrastructure to maintain** — no servers, no databases, no auth systems
- **Tamper-evident** — every change is a signed git commit
- **Community-owned** — anyone can submit improvements via PR
- **Free hosting** — no monthly costs

### index.json format

See [`schema.json`](https://github.com/rolecraft-sh/registry/blob/main/schema.json) for the full JSON Schema. Each skill has:

| Field         | Type          | Required | Description                                  |
| ------------- | ------------- | -------- | -------------------------------------------- |
| `slug`        | string        | yes      | kebab-case unique identifier                 |
| `name`        | string        | yes      | Human-readable name                          |
| `description` | string        | no       | Short description                            |
| `repo`        | string        | yes      | GitHub repo (owner/repo)                     |
| `author`      | string        | yes      | GitHub username                              |
| `versions`    | `array<string>` | yes      | Published semver versions                    |
| `latest`      | string        | yes      | Latest version                               |
| `installs`    | number        | no       | Install count (best-effort)                  |
| `stars`       | number        | no       | GitHub stars                                 |

### Validation

Each PR to `index.json` triggers GitHub Actions:

1. **JSON syntax check** — `node -e "JSON.parse(...)"`
2. **Schema validation** — `ajv` against `schema.json` (with format support)
3. **Duplicate check** — no two skills with the same slug
4. **Owner verification** — PR author must own the skill's GitHub repo

If all checks pass, a maintainer is notified on the PR and merges it. If any check fails, see the Action logs.

### Local caching

The registry index is fetched from the GitHub API and cached in-memory for 5 minutes. Set `GITHUB_TOKEN` to lift the unauthenticated rate limit (60/hr → 5000/hr).

## Privacy & security

- The registry contains **only** skill metadata (`slug`, `repo`, `description`). No skill code is uploaded or stored.
- Skills are installed directly from their original GitHub repos — what you publish is what users get.
- All PRs are public, signed, and reviewable.
- No telemetry. No analytics. No accounts.
