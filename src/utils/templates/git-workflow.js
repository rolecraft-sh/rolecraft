export const description =
  'Git workflow conventions and branch strategy for AI agents'

export function generate(opts) {
  const { name, slug, description: skillDescription, agents, owner } = opts
  const agentList = Array.isArray(agents) ? agents : ['claude']

  return `---
name: ${name}
slug: ${slug}
owner: ${owner || 'local'}
description: ${skillDescription || 'Git workflow conventions including branch naming, commit messages, and pull request guidelines for consistent collaboration'}
agents: [${agentList.join(', ')}]
category: workflow
---

## When to Use

This skill defines the git workflow for ${name}. Follow these
conventions when creating branches, writing commits, and submitting
pull requests. Consistent workflow practices reduce merge conflicts
and improve team collaboration.

## Branch Strategy

Use the following branch naming convention:

- \`feat/description\` for new features
- \`fix/description\` for bug fixes
- \`chore/description\` for maintenance tasks
- \`docs/description\` for documentation changes

Always branch from the latest main branch and rebase before opening
a pull request.

## Commit Convention

\`\`\`text
<type>: <short description>

Examples:
feat: add user authentication endpoint
fix: resolve memory leak in data processor
docs: update API reference
\`\`\`

\`\`\`bash
# Create a feature branch
$ git checkout -b feat/add-login

# Stage and commit changes
$ git add src/login.js
$ git commit -m "feat: implement login with OAuth2"

# Push and open a PR
$ git push origin feat/add-login
\`\`\`

## PR Guidelines

Every pull request must include a clear description of the change,
motivation, and any breaking changes. Keep PRs focused on a single
concern. Request reviews from relevant team members and address all
feedback before merging.
`
}
