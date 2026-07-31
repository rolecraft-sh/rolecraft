import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
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

let tempDir, composeCmd

function capture() {
  const logs = []
  const origLog = console.log
  console.log = (...args) => {
    if (args.length) logs.push(String(args[0]))
  }
  return {
    logs,
    restore: () => {
      console.log = origLog
    },
  }
}

describe('compose command', () => {
  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-cmd-compose-test-'))
    await mkdir(tempDir, { recursive: true })
    writeFileSync(join(tempDir, 'frontend.SKILL.md'), SKILL_A)
    writeFileSync(join(tempDir, 'testing.SKILL.md'), SKILL_B)
    composeCmd = await import('./compose.js')
  })

  after(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('throws error with less than 2 sources', async () => {
    await assert.rejects(
      () => composeCmd.composeCommand(['only-one']),
      /At least 2 skill files/,
    )
  })

  it('throws error with missing sources', async () => {
    await assert.rejects(
      () => composeCmd.composeCommand([]),
      /At least 2 skill files/,
    )
  })

  it('throws error for non-existent file', async () => {
    await assert.rejects(
      () =>
        composeCmd.composeCommand([
          join(tempDir, 'nonexistent.SKILL.md'),
          join(tempDir, 'frontend.SKILL.md'),
        ]),
      /not found/,
    )
  })

  it('composes skills in merge mode (default)', async () => {
    const { logs, restore } = capture()
    try {
      await composeCmd.composeCommand(
        [join(tempDir, 'frontend.SKILL.md'), join(tempDir, 'testing.SKILL.md')],
        { dryRun: true },
      )
    } finally {
      restore()
    }

    const allText = logs.join(' ')
    assert.ok(allText.includes('Composing'))
    assert.ok(allText.includes('merge mode'))
    assert.ok(allText.includes('sections composed'))
  })

  it('composes skills in chain mode', async () => {
    const { logs, restore } = capture()
    try {
      await composeCmd.composeCommand(
        [join(tempDir, 'frontend.SKILL.md'), join(tempDir, 'testing.SKILL.md')],
        { mode: 'chain', dryRun: true },
      )
    } finally {
      restore()
    }

    const allText = logs.join(' ')
    assert.ok(allText.includes('chain mode'))
  })

  it('outputs JSON with --json flag', async () => {
    const { logs, restore } = capture()
    try {
      await composeCmd.composeCommand(
        [join(tempDir, 'frontend.SKILL.md'), join(tempDir, 'testing.SKILL.md')],
        { json: true, dryRun: true },
      )
    } finally {
      restore()
    }

    assert.ok(logs.length > 0)
    const parsed = JSON.parse(logs.join(' '))
    assert.ok(typeof parsed.content === 'string')
    assert.ok(typeof parsed.stats === 'object')
  })

  it('writes to output file with -o flag', async () => {
    const outputPath = join(tempDir, 'combined.SKILL.md')
    await composeCmd.composeCommand(
      [join(tempDir, 'frontend.SKILL.md'), join(tempDir, 'testing.SKILL.md')],
      { output: outputPath },
    )

    const content = readFileSync(outputPath, 'utf-8')
    assert.ok(content.includes('Code Style'))
    assert.ok(content.includes('Testing'))
  })

  it('throws error if output exists without --force', async () => {
    const outputPath = join(tempDir, 'existing.SKILL.md')
    writeFileSync(outputPath, 'existing content')

    await assert.rejects(
      () =>
        composeCmd.composeCommand(
          [
            join(tempDir, 'frontend.SKILL.md'),
            join(tempDir, 'testing.SKILL.md'),
          ],
          { output: outputPath },
        ),
      /already exists/,
    )
  })

  it('overwrites output with --force flag', async () => {
    const outputPath = join(tempDir, 'force-overwrite.SKILL.md')
    writeFileSync(outputPath, 'old content')

    await composeCmd.composeCommand(
      [join(tempDir, 'frontend.SKILL.md'), join(tempDir, 'testing.SKILL.md')],
      { output: outputPath, force: true },
    )

    const content = readFileSync(outputPath, 'utf-8')
    assert.ok(content.includes('Code Style'))
  })

  it('accepts --name option for output skill name', async () => {
    const outputPath = join(tempDir, 'named.SKILL.md')

    await composeCmd.composeCommand(
      [join(tempDir, 'frontend.SKILL.md'), join(tempDir, 'testing.SKILL.md')],
      { output: outputPath, name: 'My Combined Skill', force: true },
    )

    const content = readFileSync(outputPath, 'utf-8')
    assert.ok(content.includes('My Combined Skill'))
  })

  it('merges same-named sections uniquely', async () => {
    const { logs, restore } = capture()
    try {
      await composeCmd.composeCommand(
        [join(tempDir, 'frontend.SKILL.md'), join(tempDir, 'testing.SKILL.md')],
        { json: true, dryRun: true },
      )
    } finally {
      restore()
    }

    const parsed = JSON.parse(logs.join(' '))
    assert.equal(parsed.stats.totalOutputSections, 3)
  })
})
