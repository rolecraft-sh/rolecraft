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

## Examples

Some example usage here.
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

const SKILL_IDENTICAL = `---
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

## Examples

Some example usage here.
`

let tempDir, diffCmd

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

describe('diff command', () => {
  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-cmd-diff-test-'))
    await mkdir(tempDir, { recursive: true })
    writeFileSync(join(tempDir, 'skill-a.SKILL.md'), SKILL_A)
    writeFileSync(join(tempDir, 'skill-b.SKILL.md'), SKILL_B)
    writeFileSync(join(tempDir, 'identical.SKILL.md'), SKILL_IDENTICAL)
    diffCmd = await import('./diff.js')
  })

  after(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('throws error with missing arguments', async () => {
    await assert.rejects(
      () => diffCmd.diffCommand(null, null),
      /Missing skill argument/,
    )
  })

  it('throws error with missing first skill', async () => {
    await assert.rejects(
      () => diffCmd.diffCommand(null, join(tempDir, 'skill-b.SKILL.md')),
      /Missing skill argument/,
    )
  })

  it('throws error for non-existent file', async () => {
    await assert.rejects(
      () =>
        diffCmd.diffCommand(
          join(tempDir, 'nonexistent.SKILL.md'),
          join(tempDir, 'skill-b.SKILL.md'),
        ),
      /not found/,
    )
  })

  it('detects differences between two skills', async () => {
    const { logs, restore } = capture()
    try {
      await diffCmd.diffCommand(
        join(tempDir, 'skill-a.SKILL.md'),
        join(tempDir, 'skill-b.SKILL.md'),
      )
    } finally {
      restore()
    }

    assert.ok(logs.some((l) => l.includes('→')))
  })

  it('shows no differences for identical skills', async () => {
    const { logs, restore } = capture()
    try {
      await diffCmd.diffCommand(
        join(tempDir, 'skill-a.SKILL.md'),
        join(tempDir, 'identical.SKILL.md'),
      )
    } finally {
      restore()
    }

    const allText = logs.join(' ')
    assert.ok(allText.includes('changed'))
  })

  it('outputs JSON with --json flag', async () => {
    const { logs, restore } = capture()
    try {
      await diffCmd.diffCommand(
        join(tempDir, 'skill-a.SKILL.md'),
        join(tempDir, 'skill-b.SKILL.md'),
        { json: true },
      )
    } finally {
      restore()
    }

    assert.ok(logs.length > 0)
    const parsed = JSON.parse(logs[0])
    assert.ok(typeof parsed.stats === 'object')
    assert.ok(Array.isArray(parsed.sections))
    assert.ok(typeof parsed.frontmatter === 'object')
  })

  it('outputs brief summary with --brief flag', async () => {
    const { logs, restore } = capture()
    try {
      await diffCmd.diffCommand(
        join(tempDir, 'skill-a.SKILL.md'),
        join(tempDir, 'skill-b.SKILL.md'),
        { brief: true },
      )
    } finally {
      restore()
    }

    const allText = logs.join(' ')
    assert.ok(allText.includes('Frontmatter'))
  })
})
