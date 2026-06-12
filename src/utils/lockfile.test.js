import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, lockModule

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-lock-test-'))
  const oldHome = process.env.HOME
  process.env.HOME = tempDir
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  lockModule = await import('./lockfile.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe('lockfile', () => {
  it('getGlobalLockPath returns path inside homedir', () => {
    assert.equal(lockModule.getGlobalLockPath(), join(tempDir, '.agents', '.skill-lock.json'))
  })

  it('getAgentsDir returns path inside homedir', () => {
    assert.equal(lockModule.getAgentsDir(), join(tempDir, '.agents', 'skills'))
  })

  it('getClaudeDir returns path inside homedir', () => {
    assert.equal(lockModule.getClaudeDir(), join(tempDir, '.claude', 'skills'))
  })

  it('readLock returns default when no file exists', async () => {
    const lock = await lockModule.readLock()
    assert.deepEqual(lock, {
      version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [],
    })
  })

  it('readLock parses existing lock file', async () => {
    const data = { version: 3, skills: { test: { name: 'x' } }, dismissed: {}, lastSelectedAgents: [] }
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify(data))
    const lock = await lockModule.readLock()
    assert.deepEqual(lock, data)
  })

  it('writeLock writes lock file', async () => {
    const data = { version: 3, skills: { w: {} }, dismissed: {}, lastSelectedAgents: [] }
    await lockModule.writeLock(data)
    const written = JSON.parse(readFileSync(join(tempDir, '.agents', '.skill-lock.json'), 'utf-8'))
    assert.deepEqual(written, data)
  })

  it('addSkillToLock adds entry and sets installedAt', async () => {
    await lockModule.addSkillToLock('test/skill', { name: 'Test' })
    const lock = await lockModule.readLock()
    assert.equal(lock.skills['test/skill'].name, 'Test')
    assert.ok(lock.skills['test/skill'].installedAt)
  })

  it('removeSkillFromLock removes entry', async () => {
    await lockModule.addSkillToLock('to-remove', {})
    await lockModule.removeSkillFromLock('to-remove')
    const lock = await lockModule.readLock()
    assert.ok(!lock.skills['to-remove'])
  })
})
