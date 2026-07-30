export const description =
  'Code review guidelines and best practices for AI agents'

export function generate(opts) {
  const { name, slug, description: skillDescription, agents, owner } = opts
  const agentList = Array.isArray(agents) ? agents : ['claude']

  return `---
name: ${name}
slug: ${slug}
owner: ${owner || 'local'}
description: ${skillDescription || 'Code review guidelines for AI agents to ensure consistent, high-quality code reviews across your project'}
agents: [${agentList.join(', ')}]
category: code-quality
---

## When to Use

Apply this skill whenever reviewing code changes, evaluating pull
requests, or checking for potential issues in the codebase. It provides
a structured framework for thorough and consistent code reviews.

## Review Checklist

Examine each change against these criteria:

- **Correctness**: Does the code do what it intends? Are edge cases
  handled properly?
- **Security**: Are there any injection vectors, exposed secrets, or
  unsafe operations?
- **Performance**: Are there obvious performance bottlenecks or
  unnecessary allocations?
- **Maintainability**: Is the code readable and well-structured? Would
  another developer understand it in six months?

## Code Standards

Enforce these standards during every review:

\`\`\`javascript
// Good: clear naming, single responsibility
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// Avoid: unclear naming, mixed concerns
function process(x) {
  let t = 0
  for (const i of x) t += i.p
  return t
}
\`\`\`

## Examples

\`\`\`bash
# Run linter before submitting a review
$ npm run lint

# Execute the test suite
$ npm test

# Check for security vulnerabilities
$ rolecraft verify
\`\`\`

Provide specific, actionable feedback instead of just saying something
is wrong. Explain why and suggest improvements. Focus on the code,
not the author.
`
}
