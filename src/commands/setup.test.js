import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir, tmpdir } from 'node:os'

let tempDir, setupModule, origHome, logs, origLog

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
  tempDir = join(tmpdir(), 'rolecraft-setup-test-' + Date.now())
  mkdirSync(tempDir, { recursive: true })
  origHome = process.env.HOME
  process.env.HOME = tempDir
  setupModule = await import('./setup.js')
})

after(async () => {
  process.env.HOME = origHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('setup command', () => {
  it('detects no agents when no directories exist', async () => {
    capture()
    await setupModule.setupCommand()
    restoreLog()
    assert.ok(logs.some(l => l.includes('No supported agents detected')))
  })

  it('detects agents when directories exist', async () => {
    mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
    mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true })

    capture()
    await setupModule.setupCommand()
    restoreLog()

    assert.ok(logs.some(l => l.includes('opencode')))
    assert.ok(logs.some(l => l.includes('claude-code')))
  })

  it('handles missing project dir when detecting agents', async () => {
    mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
    mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true })

    const origCwd = process.cwd
    process.cwd = () => join(tempDir, 'nonexistent')
    capture()
    await setupModule.setupCommand()
    restoreLog()
    process.cwd = origCwd

    assert.ok(logs.some(l => l.includes('opencode')))
    assert.ok(logs.some(l => l.includes('claude-code')))
  })

  it('installs a skill when source is provided', async () => {
    mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
    mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true })

    const skillDir = join(tempDir, 'setup-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/setup-skill\nname: setup-test\nContent')

    capture()
    await setupModule.setupCommand(skillDir)
    restoreLog()

    assert.ok(logs.some(l => l.includes('setup-test')))
    assert.ok(logs.some(l => l.includes('Installed')))
  })

  it('dry-run shows plan without installing via setup', async () => {
    mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
    mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true })

    const skillDir = join(tempDir, 'setup-dry-run-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/setup-dry\nname: setup-dry-test\nContent')

    capture()
    await setupModule.setupCommand(skillDir, { dryRun: true })
    restoreLog()

    assert.ok(logs.some(l => l.includes('Dry-run')))
    assert.ok(logs.some(l => l.includes('setup-dry-test')))
    assert.ok(!logs.some(l => l.includes('Installed')))
  })
})
