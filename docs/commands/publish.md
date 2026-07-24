# `rolecraft publish`

Publish a skill to the rolecraft Registry.

## Usage

```bash
rolecraft publish <source> [--repo <owner/repo>] [--dry-run] [--yes]
                     [--slug <slug>] [--name <name>]
```

## Description

Publishes a `SKILL.md` to the centralised [rolecraft Registry](https://github.com/rolecraft-sh/registry). The registry acts as a community-driven index of skills, similar to npm for Node.js packages or PyPI for Python.

### Option A: CLI publish (recommended)

When you publish via CLI:

1. **Reads** the SKILL.md metadata from your local skill directory.
2. **Detects** the GitHub repository from your local git remote (or `--repo` flag).
3. **Forks** the rolecraft-sh/registry repository (one-time setup, automatic).
4. **Updates** `index.json` with a new entry.
5. **Opens** a pull request via GitHub API.
6. **Auto-merge** happens automatically once CI validation passes.

### Option B: Manual PR (without CLI)

Don't use rolecraft CLI? You can add your skill by editing `index.json` directly on GitHub:

1. Go to https://github.com/rolecraft-sh/registry
2. Click **Fork**
3. Edit `index.json` — add your skill entry to the `skills` array
4. Commit to a new branch
5. Open a **Pull Request**

Entry format:

```json
{
  "slug": "my-skill",
  "name": "My Skill",
  "description": "What this skill does",
  "repo": "your-username/your-skill-repo",
  "author": "your-username",
  "versions": ["v1.0.0"],
  "latest": "v1.0.0"
}
```

### Constraints

| Rule | Details |
|------|---------|
| **Slug format** | kebab-case: `^[a-z0-9]+(-[a-z0-9]+)*$`, e.g. `react-rules` |
| **Unique slug** | Every slug must be unique across all skills |
| **Author match** | The `author` field must be **your GitHub username** (checked by CI) |
| **Repo must exist** | The `repo` must be a valid GitHub repo that contains a `SKILL.md` |
| **Schema validation** | Entry must match `schema.json` in the registry repo |

### Validation checks (auto)

Each PR triggers:

1. **JSON syntax** check
2. **Schema validation** against `schema.json`
3. **Duplicate slug** check
4. **Owner verification** — PR author must match the `author` field

If all pass, the PR is **auto-merged**. No manual review needed.

After publish, your skill becomes available via:

```bash
rolecraft search <query> --registry
rolecraft install <your-slug>
```

## Authentication

To publish, you need **your own** GitHub personal access token (PAT) with `repo` scope. This token is used by the CLI to fork the registry and open a PR on your behalf — it does NOT give rolecraft access to your account.

```bash
# 1. Create a token at: https://github.com/settings/tokens (scope: repo)
# 2. Set it as an environment variable:
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Or pass it inline (one-off):
GITHUB_TOKEN=ghp_xxxxx rolecraft publish ./my-skill
```

> **Note:** If `GITHUB_TOKEN` is missing, the CLI will show a clear error with the setup link.

## Flags

| Flag           | Description                                                        |
| -------------- | ------------------------------------------------------------------ |
| `--dry-run`    | Preview what would be published without creating a PR               |
| `--yes, -y`    | Skip the confirmation prompt                                       |
| `--repo <ref>` | Specify the GitHub repo (owner/repo). Otherwise auto-detected       |
| `--slug <slug>`| Override the skill slug from SKILL.md frontmatter                  |
| `--name <name>`| Override the skill name from SKILL.md frontmatter                  |

## Examples

```bash
# Publish from current directory (auto-detect git remote)
rolecraft publish .

# Publish from a skill directory
rolecraft publish ./my-skill/

# Specify the repo explicitly
rolecraft publish ./my-skill --repo sametcelikbicak/my-skill

# Preview without publishing
rolecraft publish ./my-skill --dry-run

# Non-interactive mode
rolecraft publish ./my-skill --yes
```

## Versioning

Each publish creates a new version entry in the registry. The registry tracks every version you've published, and `rolecraft update` can detect newer versions for installed skills.

If a skill with the same slug already exists in the registry, the new version is appended to the `versions` array and `latest` is updated. To publish a major version bump, manually edit `versions` before submitting your PR (e.g. `['v1.0.0', 'v2.0.0']`).

## Registry Schema

Each skill entry in `index.json` looks like:

```json
{
  "slug": "my-skill",
  "name": "My Skill",
  "description": "What this skill does",
  "repo": "user/my-skill",
  "author": "user",
  "versions": ["v1.0.0"],
  "latest": "v1.0.0",
  "installs": 0,
  "stars": 0
}
```

The full schema is at: https://github.com/rolecraft-sh/registry/blob/main/schema.json

## Cache

The registry index is cached in-memory for 5 minutes. Use `clearCache()` from the API (`src/utils/registry-client.js`) or restart your CLI session to force a refresh.
