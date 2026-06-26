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
})
