import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, origHome, origCwd, testApi

function createSkill(content) {
  const dir = join(tempDir, 'skills')
  mkdirSync(dir, { recursive: true })
  const fp = join(dir, `test-${Date.now()}.SKILL.md`)
  writeFileSync(fp, content)
  return fp
}

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

const BAD_SKILL = `---
name: Bad
---

Just a minimal skill
`

describe('api test', () => {
  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-test-test-'))
    origHome = process.env.HOME
    origCwd = process.cwd()
    process.env.HOME = tempDir
    process.chdir(tempDir)
    await mkdir(join(tempDir, '.agents', 'skills'), { recursive: true })
    testApi = await import('./test.js')
  })

  after(async () => {
    process.chdir(origCwd)
    process.env.HOME = origHome
    await rm(tempDir, { recursive: true, force: true })
  })

  it('returns high score for a well-structured skill', async () => {
    const fp = createSkill(GOOD_SKILL)
    const result = await testApi.apiTest(fp)

    assert.ok(result.score >= 70, `Expected score >= 70, got ${result.score}`)
    assert.ok(
      ['A', 'B'].includes(result.grade),
      `Expected grade A or B, got ${result.grade}`,
    )
    assert.ok(result.assertions.length > 0)
    assert.ok(Array.isArray(result.suggestions))
  })

  it('returns low score for a poorly structured skill', async () => {
    const fp = createSkill(BAD_SKILL)
    const result = await testApi.apiTest(fp)

    assert.ok(result.score <= 45, `Expected score <= 45, got ${result.score}`)
    assert.equal(result.grade, 'D')
  })

  it('returns name-defined assertion result', async () => {
    const fp = createSkill(GOOD_SKILL)
    const result = await testApi.apiTest(fp)
    const assertion = result.assertions.find((a) => a.name === 'name-defined')
    assert.ok(assertion)
    assert.equal(assertion.pass, true)
  })

  it('returns slug-defined assertion result', async () => {
    const fp = createSkill(GOOD_SKILL)
    const result = await testApi.apiTest(fp)
    const assertion = result.assertions.find((a) => a.name === 'slug-defined')
    assert.ok(assertion)
    assert.equal(assertion.pass, true)
  })

  it('returns description-length assertion result', async () => {
    const fp = createSkill(GOOD_SKILL)
    const result = await testApi.apiTest(fp)
    const assertion = result.assertions.find(
      (a) => a.name === 'description-length',
    )
    assert.ok(assertion)
    assert.equal(assertion.pass, true)
  })

  it('returns agent-targets assertion result', async () => {
    const fp = createSkill(GOOD_SKILL)
    const result = await testApi.apiTest(fp)
    const assertion = result.assertions.find((a) => a.name === 'agent-targets')
    assert.ok(assertion)
    assert.equal(assertion.pass, true)
  })

  it('returns dangerous-patterns assertion', async () => {
    const dangerous = `---
name: Dangerous
slug: dangerous
description: This skill contains dangerous patterns
---

rm -rf /
`
    const fp = createSkill(dangerous)
    const result = await testApi.apiTest(fp)
    const assertion = result.assertions.find(
      (a) => a.name === 'dangerous-patterns',
    )
    assert.ok(assertion)
    assert.equal(assertion.pass, false)
  })

  it('returns has-sections assertion', async () => {
    const noSections = `---
name: No Sections
slug: no-sections
description: This skill has no sections at all
---

Just a single paragraph with no markdown sections.
`
    const fp = createSkill(noSections)
    const result = await testApi.apiTest(fp)
    const assertion = result.assertions.find((a) => a.name === 'has-sections')
    assert.ok(assertion)
    assert.equal(assertion.pass, false)
  })

  it('supports --only filter', async () => {
    const fp = createSkill(GOOD_SKILL)
    const result = await testApi.apiTest(fp, {
      only: ['name-defined', 'slug-defined'],
    })
    assert.equal(result.assertions.length, 2)
    assert.equal(result.assertions[0].name, 'name-defined')
    assert.equal(result.assertions[1].name, 'slug-defined')
  })

  it('handles non-existent file', async () => {
    await assert.rejects(
      () => testApi.apiTest(join(tempDir, 'nonexistent.SKILL.md')),
      /ENOENT/,
    )
  })

  it('handles --all with no skills installed', async () => {
    const result = await testApi.apiTest(null, { all: true })
    assert.ok(result.results)
    assert.equal(result.summary.total, 0)
  })

  it('handles --all with skills in lockfile', async () => {
    const skillDir = join(tempDir, '.agents', 'skills', 'test-installed')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), GOOD_SKILL)

    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test-installed': { slug: 'test-installed', agents: ['cursor'] },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )

    const result = await testApi.apiTest(null, { all: true })
    assert.equal(result.summary.total, 1)
    assert.equal(result.summary.passed, 1)
  })

  it('generates suggestions for failed assertions', async () => {
    const fp = createSkill(BAD_SKILL)
    const result = await testApi.apiTest(fp)
    assert.ok(result.suggestions.length > 0)
    assert.ok(result.suggestions.every((s) => typeof s === 'string'))
  })

  it('returns null pass for optional mcp-referenced when no MCP refs', async () => {
    const fp = createSkill(GOOD_SKILL)
    const result = await testApi.apiTest(fp)
    const assertion = result.assertions.find((a) => a.name === 'mcp-referenced')
    assert.ok(assertion)
    assert.equal(assertion.pass, null)
  })
})
