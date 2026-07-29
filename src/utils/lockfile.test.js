import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import agents from '../agents.js'

let tempDir, lockModule, origHome

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-lock-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  lockModule = await import('./lockfile.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
  process.env.HOME = origHome
})

describe('lockfile', () => {
  it('getGlobalLockPath returns path inside homedir', () => {
    assert.equal(
      lockModule.getGlobalLockPath(),
      join(tempDir, '.agents', '.skill-lock.json'),
    )
  })

  it('getAgentsDir returns path inside homedir', () => {
    assert.equal(lockModule.getAgentsDir(), join(tempDir, '.agents', 'skills'))
  })

  it('getProjectLockPath returns path relative to cwd', () => {
    assert.equal(
      lockModule.getProjectLockPath(process.cwd()),
      join(process.cwd(), '.agents', '.skill-lock.json'),
    )
  })

  // Verify getDirForAgent matches agents.js data for every agent flag
  describe('getDirForAgent', () => {
    for (const agent of agents) {
      it(`resolves ${agent.flag} → ${agent.label}`, () => {
        const expected = agent.getDir()
        assert.equal(lockModule.getDirForAgent(agent.flag), expected)
      })
    }

    it('falls back to ~/.agents/skills for unknown flag', () => {
      assert.equal(
        lockModule.getDirForAgent('nonexistent'),
        join(tempDir, '.agents', 'skills'),
      )
    })
  })

  it('readLock returns default when no file exists', async () => {
    const lock = await lockModule.readLock()
    assert.deepEqual(lock, {
      version: 3,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    })
  })

  it('readLock parses existing lock file', async () => {
    const data = {
      version: 3,
      skills: { test: { name: 'x' } },
      dismissed: {},
      lastSelectedAgents: [],
    }
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify(data),
    )
    const lock = await lockModule.readLock()
    assert.deepEqual(lock, data)
  })

  it('writeLock writes lock file', async () => {
    const data = {
      version: 3,
      skills: { w: {} },
      dismissed: {},
      lastSelectedAgents: [],
    }
    await lockModule.writeLock(data)
    const written = JSON.parse(
      readFileSync(join(tempDir, '.agents', '.skill-lock.json'), 'utf-8'),
    )
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
    await lockModule.addSkillToLock('merge-skill', {
      agents: ['cursor', 'warp'],
    })
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
    const h1 = lockModule.computeContentHash({
      'SKILL.md': 'content',
      'helper.js': 'x',
    })
    const h2 = lockModule.computeContentHash({
      'helper.js': 'x',
      'SKILL.md': 'content',
    })
    assert.equal(h1, h2)
    assert.equal(h1.length, 64)
  })

  it('computeContentHash changes when content changes', () => {
    const h1 = lockModule.computeContentHash({
      'SKILL.md': 'same',
      'extra.js': 'a',
    })
    const h2 = lockModule.computeContentHash({
      'SKILL.md': 'same',
      'extra.js': 'b',
    })
    assert.notEqual(h1, h2)
  })

  it('computeContentHash returns different hash for different files', () => {
    const h1 = lockModule.computeContentHash({ 'SKILL.md': 'x' })
    const h2 = lockModule.computeContentHash({
      'SKILL.md': 'x',
      'extra.js': 'y',
    })
    assert.notEqual(h1, h2)
  })
})
