import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, lockModule

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-lock-test-'))
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

  it('getCommandCodeDir returns path inside homedir', () => {
    assert.equal(lockModule.getCommandCodeDir(), join(tempDir, '.commandcode', 'skills'))
  })

  it('getCortexDir returns path inside homedir', () => {
    assert.equal(lockModule.getCortexDir(), join(tempDir, '.snowflake', 'cortex', 'skills'))
  })

  it('getMistralVibeDir returns path inside homedir', () => {
    assert.equal(lockModule.getMistralVibeDir(), join(tempDir, '.vibe', 'skills'))
  })

  it('getQwenCodeDir returns path inside homedir', () => {
    assert.equal(lockModule.getQwenCodeDir(), join(tempDir, '.qwen', 'skills'))
  })

  it('getOpenClawDir returns path inside homedir', () => {
    assert.equal(lockModule.getOpenClawDir(), join(tempDir, '.openclaw', 'skills'))
  })

  it('getCodeBuddyDir returns path inside homedir', () => {
    assert.equal(lockModule.getCodeBuddyDir(), join(tempDir, '.codebuddy', 'skills'))
  })

  it('getMuxDir returns path inside homedir', () => {
    assert.equal(lockModule.getMuxDir(), join(tempDir, '.mux', 'skills'))
  })

  it('getPiDir returns path inside homedir', () => {
    assert.equal(lockModule.getPiDir(), join(tempDir, '.pi', 'agent', 'skills'))
  })

  it('getAutohandCodeDir returns path inside homedir', () => {
    assert.equal(lockModule.getAutohandCodeDir(), join(tempDir, '.autohand', 'skills'))
  })

  it('getRovoDevDir returns path inside homedir', () => {
    assert.equal(lockModule.getRovoDevDir(), join(tempDir, '.rovodev', 'skills'))
  })

  it('getFirebenderDir returns path inside homedir', () => {
    assert.equal(lockModule.getFirebenderDir(), join(tempDir, '.firebender', 'skills'))
  })

  it('getBobDir returns path inside homedir', () => {
    assert.equal(lockModule.getBobDir(), join(tempDir, '.bob', 'skills'))
  })

  it('getAiderDeskDir returns path inside homedir', () => {
    assert.equal(lockModule.getAiderDeskDir(), join(tempDir, '.aider-desk', 'skills'))
  })

  it('getCopilotDir returns path inside homedir', () => {
    assert.equal(lockModule.getCopilotDir(), join(tempDir, '.copilot', 'skills'))
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

  it('addSkillToLock merges agents instead of overwriting', async () => {
    await lockModule.addSkillToLock('merge-skill', { agents: ['claude-code'] })
    await lockModule.addSkillToLock('merge-skill', { agents: ['cursor', 'warp'] })
    const lock = await lockModule.readLock()
    const agents = lock.skills['merge-skill'].agents
    assert.ok(agents.includes('claude-code'))
    assert.ok(agents.includes('cursor'))
    assert.ok(agents.includes('warp'))
    assert.equal(agents.length, 3)
  })

  it('removeSkillFromLock removes entry', async () => {
    await lockModule.addSkillToLock('to-remove', {})
    await lockModule.removeSkillFromLock('to-remove')
    const lock = await lockModule.readLock()
    assert.ok(!lock.skills['to-remove'])
  })

  it('computeContentHash produces deterministic hash', () => {
    const h1 = lockModule.computeContentHash({ 'SKILL.md': 'content', 'helper.js': 'x' })
    const h2 = lockModule.computeContentHash({ 'helper.js': 'x', 'SKILL.md': 'content' })
    assert.equal(h1, h2)
    assert.equal(h1.length, 64)
  })

  it('computeContentHash changes when content changes', () => {
    const h1 = lockModule.computeContentHash({ 'SKILL.md': 'same', 'extra.js': 'a' })
    const h2 = lockModule.computeContentHash({ 'SKILL.md': 'same', 'extra.js': 'b' })
    assert.notEqual(h1, h2)
  })

  it('computeContentHash returns different hash for different files', () => {
    const h1 = lockModule.computeContentHash({ 'SKILL.md': 'x' })
    const h2 = lockModule.computeContentHash({ 'SKILL.md': 'x', 'extra.js': 'y' })
    assert.notEqual(h1, h2)
  })
})
