import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, useModule, logs, origLog

function capture() {
  logs = []
  origLog = console.log
  console.log = (...args) => {
    if (args.length) logs.push(String(args[0]))
  }
}

function restoreLog() {
  console.log = origLog
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-use-test-'))
  useModule = await import('./use.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe('use command', () => {
  it('resolves and prints content for a local skill', async () => {
    const skillDir = join(tempDir, 'my-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/my-skill\nname: My Skill\nContent')
    writeFileSync(join(skillDir, 'config.json'), '{"key": "value"}')

    capture()
    await useModule.useCommand(skillDir)
    restoreLog()

    assert.ok(logs.some(l => l.includes('My Skill')))
    assert.ok(logs.some(l => l.includes('test/my-skill')))
    assert.ok(logs.some(l => l.includes('SKILL.md')))
    assert.ok(logs.some(l => l.includes('config.json')))
    assert.ok(logs.some(l => l.includes('Content')))
    assert.ok(logs.some(l => l.includes('{"key": "value"}')))
  })

  it('skips files not in fileContents', async () => {
    capture()
    await useModule.useCommand(join(tempDir, 'my-skill'))
    restoreLog()

    const contentLogs = logs.filter(l => l.includes('───'))
    assert.ok(contentLogs.some(l => l.includes('SKILL.md')))
    assert.ok(contentLogs.some(l => l.includes('config.json')))
  })

  it('handles content without trailing newline', async () => {
    const skillDir = join(tempDir, 'no-newline-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/no-nl\nname: no-nl\ninline')

    capture()
    await useModule.useCommand(skillDir)
    restoreLog()

    assert.ok(logs.some(l => l.includes('no-nl')))
    assert.ok(logs.some(l => l.includes('inline')))
  })

  it('handles content with trailing newline', async () => {
    const skillDir = join(tempDir, 'with-newline-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/with-nl\nname: with-nl\nContent\n')

    capture()
    await useModule.useCommand(skillDir)
    restoreLog()

    assert.ok(logs.some(l => l.includes('with-nl')))
    assert.ok(logs.some(l => l.includes('Content')))
  })

  it('shows description when present in YAML frontmatter', async () => {
    const skillDir = join(tempDir, 'desc-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: desc-skill
slug: desc/skill
description: A skill with description
---

Content here
`)

    capture()
    await useModule.useCommand(skillDir)
    restoreLog()

    assert.ok(logs.some(l => l.includes('A skill with description')))
    assert.ok(logs.some(l => l.includes('desc/skill')))
  })

  it('shows all skills from multi-skill source', async () => {
    const multiDir = join(tempDir, 'multi-use')
    mkdirSync(join(multiDir, 'skills', 'alpha'), { recursive: true })
    mkdirSync(join(multiDir, 'skills', 'beta'), { recursive: true })
    writeFileSync(join(multiDir, 'skills', 'alpha', 'SKILL.md'), '---\nname: alpha\nslug: multi/alpha\ndescription: First\n---\nContent A')
    writeFileSync(join(multiDir, 'skills', 'beta', 'SKILL.md'), '---\nname: beta\nslug: multi/beta\ndescription: Second\n---\nContent B')

    capture()
    await useModule.useCommand(multiDir)
    restoreLog()

    assert.ok(logs.some(l => l.includes('alpha')))
    assert.ok(logs.some(l => l.includes('beta')))
    assert.ok(logs.some(l => l.includes('Content A')))
    assert.ok(logs.some(l => l.includes('Content B')))
  })

  it('--list flag shows all skills without content', async () => {
    const multiDir = join(tempDir, 'multi-use-list')
    mkdirSync(join(multiDir, 'skills', 'skill-x'), { recursive: true })
    writeFileSync(join(multiDir, 'skills', 'skill-x', 'SKILL.md'), '---\nname: skill-x\ndescription: Extra\n---\nSecret')

    capture()
    await useModule.useCommand(multiDir, { list: true })
    restoreLog()

    assert.ok(logs.some(l => l.includes('skill-x')))
    assert.ok(logs.some(l => l.includes('Extra')))
    assert.ok(!logs.some(l => l.includes('Secret')))
  })

  it('--skill flag filters to specific skill', async () => {
    const multiDir = join(tempDir, 'multi-use-skill')
    mkdirSync(join(multiDir, 'skills', 'filter-a'), { recursive: true })
    mkdirSync(join(multiDir, 'skills', 'filter-b'), { recursive: true })
    writeFileSync(join(multiDir, 'skills', 'filter-a', 'SKILL.md'), '---\nname: filter-a\nslug: f/a\n---\nAAA')
    writeFileSync(join(multiDir, 'skills', 'filter-b', 'SKILL.md'), '---\nname: filter-b\nslug: f/b\n---\nBBB')

    capture()
    await useModule.useCommand(multiDir, { skill: ['filter-a'] })
    restoreLog()

    assert.ok(logs.some(l => l.includes('AAA')))
    assert.ok(!logs.some(l => l.includes('BBB')))
  })

  it('--skill flag throws for non-matching names', async () => {
    const multiDir = join(tempDir, 'multi-use-nomatch')
    mkdirSync(join(multiDir, 'skills', 'exists'), { recursive: true })
    writeFileSync(join(multiDir, 'skills', 'exists', 'SKILL.md'), '---\nname: exists\n---\nX')

    await assert.rejects(
      () => useModule.useCommand(multiDir, { skill: ['nope'] }),
      /No matching skills found/,
    )
  })
})
