export const description = 'Testing guidelines and best practices for AI agents'

export function generate(opts) {
  const { name, slug, description: skillDescription, agents, owner } = opts
  const agentList = Array.isArray(agents) ? agents : ['claude']

  return `---
name: ${name}
slug: ${slug}
owner: ${owner || 'local'}
description: ${skillDescription || 'Testing guidelines covering test types, writing effective tests, and maintaining quality standards for your project'}
agents: [${agentList.join(', ')}]
category: testing
---

## When to Use

Apply this skill when writing new tests, reviewing existing test
coverage, or debugging test failures. It provides a structured
approach to testing that ensures reliability and maintainability
of your codebase.

## Test Types

Include these test categories in your project:

- **Unit tests**: Test individual functions and modules in isolation.
  Mock external dependencies.
- **Integration tests**: Verify that components work together.
  Test real interactions between modules.
- **End-to-end tests**: Test complete user workflows through the
  system.

## Writing Tests

\`\`\`javascript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('calculateTotal', () => {
  it('sums item prices correctly', () => {
    const items = [{ price: 10 }, { price: 20 }, { price: 30 }]
    assert.equal(calculateTotal(items), 60)
  })

  it('returns 0 for empty array', () => {
    assert.equal(calculateTotal([]), 0)
  })
})
\`\`\`

## Examples

\`\`\`bash
# Run all tests
$ npm test

# Run tests with coverage
$ npm run test:coverage

# Run a specific test file
$ node --test src/utils/calculator.test.js
\`\`\`

Aim for at least 80 percent test coverage. Focus on testing behavior,
not implementation details. Each test should verify a single logical
outcome with a clear assertion.
`
}
