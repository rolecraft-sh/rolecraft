import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, origHome, origCwd, testCmd
const GOOD_SKILL = `---
name: Test Skill
slug: test-skill
description: A comprehensive test skill for validating assertions engine with enough context
agents:
  - cursor
  - claude
---

## Installation

Install with rolecraft:

$ rolecraft install test-skill

## Usage

\`\`\`javascript
import { something } from 'test-skill'
console.log(something)
\`\`\`

## Configuration

\`\`\`json
{
  "key": "value"
}
\`\`\`

## API Reference

The API provides methods for doing various tasks.

## Examples

$ rolecraft test --all

This section contains multiple paragraphs to ensure we have enough words for the content-not-empty assertion to pass. We need at least 50 words here so let me keep writing until we reach that threshold. This is a test skill that demonstrates proper structure with frontmatter and sections. It should pass most assertions because it has good formatting and clear documentation.

## Testing

Testing is important for maintaining quality.
`

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

describe('test command', () => {
  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-cmd-test-test-'))
    origHome = process.env.HOME
    origCwd = process.cwd()
    process.env.HOME = tempDir
    process.chdir(tempDir)
    await mkdir(join(tempDir, '.agents', 'skills'), { recursive: true })
    testCmd = await import('./test.js')
  })

  after(async () => {
    process.chdir(origCwd)
    process.env.HOME = origHome
    await rm(tempDir, { recursive: true, force: true })
  })

  it('prints score and grade for a skill', async () => {
    const fp = join(tempDir, 'my-skill.SKILL.md')
    writeFileSync(fp, GOOD_SKILL)

    const { logs, restore } = capture()
    try {
      await testCmd.testCommand(fp)
    } finally {
      restore()
    }

    assert.ok(logs.some((l) => l.includes('Score:')))
    assert.ok(logs.some((l) => l.includes('/100')))
  })

  it('prints skill name in output', async () => {
    const fp = join(tempDir, 'named-skill.SKILL.md')
    writeFileSync(fp, GOOD_SKILL)

    const { logs, restore } = capture()
    try {
      await testCmd.testCommand(fp)
    } finally {
      restore()
    }

    assert.ok(logs.some((l) => l.includes('Testing:')))
  })

  it('prints suggestions for low quality skills', async () => {
    const fp = join(tempDir, 'bad-skill.SKILL.md')
    writeFileSync(
      fp,
      `---
name: Mini
---
Mini`,
    )

    const { logs, restore } = capture()
    try {
      await testCmd.testCommand(fp)
    } finally {
      restore()
    }

    assert.ok(logs.some((l) => l.includes('Score:')))
  })

  it('outputs JSON with --json flag', async () => {
    const fp = join(tempDir, 'json-skill.SKILL.md')
    writeFileSync(fp, GOOD_SKILL)

    const { logs, restore } = capture()
    try {
      await testCmd.testCommand(fp, { json: true })
    } finally {
      restore()
    }

    assert.ok(logs.length > 0)
    const parsed = JSON.parse(logs[0])
    assert.ok(typeof parsed.score === 'number')
    assert.ok(typeof parsed.grade === 'string')
    assert.ok(Array.isArray(parsed.assertions))
  })

  it('throws error for non-existent file', async () => {
    await assert.rejects(
      () => testCmd.testCommand(join(tempDir, 'nonexistent.SKILL.md')),
      /not found/,
    )
  })

  it('handles --all flag with no skills', async () => {
    const { logs, restore } = capture()
    try {
      await testCmd.testCommand(null, { all: true })
    } finally {
      restore()
    }

    assert.ok(logs.some((l) => l.includes('Testing all installed skills')))
  })

  it('handles --all flag with installed skills', async () => {
    const skillDir = join(tempDir, '.agents', 'skills', 'installed-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), GOOD_SKILL)

    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'installed-skill': { slug: 'installed-skill', agents: ['cursor'] },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )

    const { logs, restore } = capture()
    try {
      await testCmd.testCommand(null, { all: true })
    } finally {
      restore()
    }

    assert.ok(
      logs.some((l) => l.includes('Test Skill')) ||
        logs.some((l) => l.includes('installed-skill')),
    )
  })
})
