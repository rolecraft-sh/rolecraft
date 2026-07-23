import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const SKILL_A = `---
name: Skill A
slug: skill-a
description: First skill for testing
agents:
  - cursor
---

## Installation

Install with rolecraft:

$ rolecraft install skill-a

## Usage

Use the tool like this:

$ rolecraft use skill-a

## Configuration

Set the key in config.json
`

const SKILL_B = `---
name: Skill B
slug: skill-b
description: Second skill for testing (updated)
agents:
  - cursor
  - claude
---

## Installation

Install with rolecraft:

$ rolecraft install skill-b

## Usage

Use the tool like this:

$ rolecraft use skill-b

## Testing

Testing is important for quality.
`

let tempDir

describe('apiDiff', () => {
  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-diff-test-'))
    await mkdir(tempDir, { recursive: true })
    writeFileSync(join(tempDir, 'a.SKILL.md'), SKILL_A)
    writeFileSync(join(tempDir, 'b.SKILL.md'), SKILL_B)

    const identical = SKILL_A
    writeFileSync(join(tempDir, 'identical.SKILL.md'), identical)
  })

  after(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('detects frontmatter changes', async () => {
    const { apiDiff } = await import('./diff.js')
    const result = await apiDiff(
      join(tempDir, 'a.SKILL.md'),
      join(tempDir, 'b.SKILL.md'),
    )

    assert.ok(result.frontmatter)
    assert.ok(result.frontmatter.name)
    assert.equal(result.frontmatter.name.from, 'Skill A')
    assert.equal(result.frontmatter.name.to, 'Skill B')
  })

  it('detects section changes', async () => {
    const { apiDiff } = await import('./diff.js')
    const result = await apiDiff(
      join(tempDir, 'a.SKILL.md'),
      join(tempDir, 'b.SKILL.md'),
    )

    const testingRemoved = result.sections.find(
      (s) => s.heading === 'Configuration',
    )
    assert.ok(testingRemoved)
    assert.equal(testingRemoved.status, 'removed')

    const testingAdded = result.sections.find((s) => s.heading === 'Testing')
    assert.ok(testingAdded)
    assert.equal(testingAdded.status, 'added')
  })

  it('returns stats object', async () => {
    const { apiDiff } = await import('./diff.js')
    const result = await apiDiff(
      join(tempDir, 'a.SKILL.md'),
      join(tempDir, 'b.SKILL.md'),
    )

    assert.equal(typeof result.stats.changedSections, 'number')
    assert.equal(typeof result.stats.addedSections, 'number')
    assert.equal(typeof result.stats.removedSections, 'number')
    assert.equal(typeof result.stats.frontmatterChanges, 'number')
  })

  it('returns empty diff for identical files', async () => {
    const { apiDiff } = await import('./diff.js')
    const result = await apiDiff(
      join(tempDir, 'a.SKILL.md'),
      join(tempDir, 'identical.SKILL.md'),
    )

    assert.equal(result.stats.changedSections, 0)
    assert.equal(result.stats.addedSections, 0)
    assert.equal(result.stats.removedSections, 0)
    assert.equal(result.stats.frontmatterChanges, 0)
  })

  it('throws for non-existent file', async () => {
    const { apiDiff } = await import('./diff.js')
    await assert.rejects(
      () =>
        apiDiff(
          join(tempDir, 'nonexistent.SKILL.md'),
          join(tempDir, 'a.SKILL.md'),
        ),
      /not found/,
    )
  })

  it('includes skill file paths in result', async () => {
    const { apiDiff } = await import('./diff.js')
    const result = await apiDiff(
      join(tempDir, 'a.SKILL.md'),
      join(tempDir, 'b.SKILL.md'),
    )

    assert.ok(result.a.endsWith('a.SKILL.md'))
    assert.ok(result.b.endsWith('b.SKILL.md'))
  })
})
