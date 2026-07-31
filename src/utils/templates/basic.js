export const description =
  'General-purpose skill template for AI agent instructions'

export function generate(opts) {
  const { name, slug, description: skillDescription, agents, owner } = opts
  const agentList = Array.isArray(agents) ? agents : ['claude']

  return `---
name: ${name}
slug: ${slug}
owner: ${owner || 'local'}
description: ${skillDescription || 'A comprehensive skill for AI agent interactions and workflows'}
agents: [${agentList.join(', ')}]
category: general
---

## When to Use

This skill provides structured guidance for AI agents working on
${name}. Apply these instructions whenever you are performing tasks
related to this domain. The goal is to ensure consistent, high-quality
results across all interactions.

## Instructions

Follow these guidelines when working with this skill:

- Read the full context before making changes. Understand existing
  patterns and conventions before proposing modifications.
- Prefer simple, readable solutions over complex ones.
- Test your changes thoroughly. Run the test suite and add new tests.
- Keep changes focused. Each pull request should address a single
  concern or feature.

## Examples

\`\`\`bash
# Install this skill locally
$ rolecraft install ./${slug}

# Test the skill quality
$ rolecraft test ./${slug}/SKILL.md

# Verify installed skills
$ rolecraft verify
\`\`\`

\`\`\`javascript
// Configure the skill in your project
const config = {
  skills: ['${slug}'],
  version: '1.0.0',
}
console.log('Configured skills:', config.skills)
\`\`\`
`
}
