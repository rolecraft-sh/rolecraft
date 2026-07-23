import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const SKILL_A = `---
name: Frontend Rules
slug: frontend-rules
description: Frontend development conventions
agents:
  - cursor
---

## Code Style

Use 2-space indentation
Use single quotes

## Components

Write functional components
Use TypeScript
`

const SKILL_B = `---
name: Testing Rules
slug: testing-rules
description: Testing conventions and best practices
agents:
  - cursor
---

## Code Style

Use 2-space indentation
Use single quotes

## Testing

Write unit tests for all functions
Aim for 80% coverage
`

let tempDir

describe('apiCompose', () => {
  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-compose-test-'))
    await mkdir(tempDir, { recursive: true })
    writeFileSync(join(tempDir, 'frontend.SKILL.md'), SKILL_A)
    writeFileSync(join(tempDir, 'testing.SKILL.md'), SKILL_B)
  })

  after(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('throws for less than 2 sources', async () => {
    const { apiCompose } = await import('./compose.js')
    await assert.rejects(
      () => apiCompose([join(tempDir, 'frontend.SKILL.md')]),
      /At least 2 skill files/,
    )
  })

  it('throws for non-existent file', async () => {
    const { apiCompose } = await import('./compose.js')
    await assert.rejects(
      () =>
        apiCompose([
          join(tempDir, 'nonexistent.SKILL.md'),
          join(tempDir, 'frontend.SKILL.md'),
        ]),
      /not found/,
    )
  })

  it('merges skills with same-named sections deduplicated', async () => {
    const { apiCompose } = await import('./compose.js')
    const result = await apiCompose(
      [join(tempDir, 'frontend.SKILL.md'), join(tempDir, 'testing.SKILL.md')],
      { mode: 'merge' },
    )

    assert.ok(result.content.includes('Code Style'))
    assert.ok(result.content.includes('Components'))
    assert.ok(result.content.includes('Testing'))
    assert.equal(result.stats.totalOutputSections, 3)
  })

  it('chains skills with override behavior', async () => {
    const { apiCompose } = await import('./compose.js')
    const result = await apiCompose(
      [join(tempDir, 'frontend.SKILL.md'), join(tempDir, 'testing.SKILL.md')],
      { mode: 'chain' },
    )

    assert.ok(result.content.includes('Code Style'))
    assert.ok(result.content.includes('Components'))
    assert.ok(result.content.includes('Testing'))
    assert.equal(result.stats.totalOutputSections, 3)
  })

  it('uses custom name when provided', async () => {
    const { apiCompose } = await import('./compose.js')
    const result = await apiCompose(
      [join(tempDir, 'frontend.SKILL.md'), join(tempDir, 'testing.SKILL.md')],
      { name: 'My Custom Skill' },
    )

    assert.ok(result.content.includes('name: My Custom Skill'))
  })

  it('generates auto-description when none provided', async () => {
    const { apiCompose } = await import('./compose.js')
    const result = await apiCompose([
      join(tempDir, 'frontend.SKILL.md'),
      join(tempDir, 'testing.SKILL.md'),
    ])

    assert.ok(result.content.includes('description:'))
  })

  it('returns stats object with source info', async () => {
    const { apiCompose } = await import('./compose.js')
    const result = await apiCompose([
      join(tempDir, 'frontend.SKILL.md'),
      join(tempDir, 'testing.SKILL.md'),
    ])

    assert.equal(result.stats.sources, 2)
    assert.equal(typeof result.stats.mergedSections, 'number')
    assert.equal(typeof result.stats.totalInputSections, 'number')
    assert.equal(typeof result.stats.totalOutputSections, 'number')
  })

  it('merges frontmatter fields from multiple skills', async () => {
    const { apiCompose } = await import('./compose.js')
    const result = await apiCompose([
      join(tempDir, 'frontend.SKILL.md'),
      join(tempDir, 'testing.SKILL.md'),
    ])

    assert.ok(result.content.includes('agents:\n  - cursor'))
  })

  it('generates valid SKILL.md output', async () => {
    const { apiCompose } = await import('./compose.js')
    const result = await apiCompose([
      join(tempDir, 'frontend.SKILL.md'),
      join(tempDir, 'testing.SKILL.md'),
    ])

    assert.ok(result.content.startsWith('---'))
    assert.ok(result.content.includes('\n---'))
  })
})
