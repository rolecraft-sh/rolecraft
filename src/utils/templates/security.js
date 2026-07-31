export const description =
  'Security guidelines and dangerous pattern detection for AI agents'

export function generate(opts) {
  const { name, slug, description: skillDescription, agents, owner } = opts
  const agentList = Array.isArray(agents) ? agents : ['claude']

  return `---
name: ${name}
slug: ${slug}
owner: ${owner || 'local'}
description: ${skillDescription || 'Security guidelines covering dangerous patterns, code review process, and security checklist items for safe development'}
agents: [${agentList.join(', ')}]
category: security
---

## When to Use

This skill provides security guidelines for ${name}. Use it when
reviewing code for security issues, implementing authentication or
authorization, handling user input, or configuring infrastructure.
Security should be considered at every stage of development.

## Security Checklist

Verify these items before deploying any change:

- Validate and sanitize all user inputs to prevent injection attacks
- Use parameterized queries for database operations
- Store secrets in environment variables or a secrets manager
- Apply the principle of least privilege for all permissions
- Enable HTTPS and set secure headers

## Dangerous Patterns

\`\`\`javascript
// DANGEROUS: avoid dynamic code evaluation with user input.
// This pattern enables arbitrary code execution.
// Prefer safe alternatives like JSON.parse or structured APIs.

// SAFE: use structured data parsing
const data = JSON.parse(userInput)

// DANGEROUS: avoid shell command execution with interpolated
// input. Use filesystem APIs instead of shelling out.

// SAFE: use the filesystem API
import { unlink } from 'node:fs'
\`\`\`

## Review Process

\`\`\`bash
# Run security scan on your skill
$ rolecraft verify

# Check dependencies
$ npm audit
\`\`\`

Follow a security review process for every change: identify threats,
evaluate impact, propose mitigations, and document decisions. When
in doubt, ask a security expert for review.
`
}
