import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, setupModule, origHome, logs, origLog, origCwd, origCwdFn

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

function withTempCwd(fn) {
  return async (...args) => {
    origCwd = process.cwd
    origCwdFn = origCwd
    process.cwd = () => tempDir
    try {
      await fn(...args)
    } finally {
      process.cwd = origCwd
    }
  }
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-setup-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir
  setupModule = await import('./setup.js')
})

after(async () => {
  process.env.HOME = origHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('setup command', () => {
  it('detects no agents when no directories exist', withTempCwd(async () => {
    capture()
    await setupModule.setupCommand()
    restoreLog()
    assert.ok(logs.some(l => l.includes('No supported agents detected')))
  }))

  it('detects agents when directories exist', withTempCwd(async () => {
    mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
    mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true })

    capture()
    await setupModule.setupCommand()
    restoreLog()

    assert.ok(logs.some(l => l.includes('opencode')))
    assert.ok(logs.some(l => l.includes('claude-code')))
  }))

  it('handles missing project dir when detecting agents', withTempCwd(async () => {
    mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
    mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true })

    capture()
    await setupModule.setupCommand()
    restoreLog()

    assert.ok(logs.some(l => l.includes('opencode')))
    assert.ok(logs.some(l => l.includes('claude-code')))
  }))

  it('installs a skill when source is provided', withTempCwd(async () => {
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
  }))

  it('dry-run shows plan without installing via setup', withTempCwd(async () => {
    mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
    mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true })

    const skillDir = join(tempDir, 'setup-dry-run-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/setup-dry\nname: setup-dry-test\nContent')

    capture()
    await setupModule.setupCommand(skillDir, { dryRun: true })
    restoreLog()

    assert.ok(logs.some(l => l.includes('[dry-run]')))
    assert.ok(logs.some(l => l.includes('setup-dry-test')))
    assert.ok(!logs.some(l => l.includes('Installed')))
  }))

  it('handles readdir failure in countSkills gracefully', withTempCwd(async () => {
    const agentsSkills = join(tempDir, '.agents', 'skills')
    mkdirSync(join(tempDir, '.agents'), { recursive: true })
    mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true })

    const { rmSync, writeFileSync } = await import('node:fs')
    rmSync(agentsSkills, { recursive: true, force: true })
    writeFileSync(agentsSkills, '')

    capture()
    await setupModule.setupCommand()
    restoreLog()

    assert.ok(logs.some(l => l.includes('opencode')))
  }))
})
