import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { apiCheck } from './check.js'

let tempDir, origHome, origCwd

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-check-test-'))
  origHome = process.env.HOME
  origCwd = process.cwd()
  process.env.HOME = tempDir
  process.chdir(tempDir)
  await mkdir(join(tempDir, '.agents'), { recursive: true })
})

after(async () => {
  process.chdir(origCwd)
  process.env.HOME = origHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('api check', () => {
  it('returns empty when no skills installed', async () => {
    const result = await apiCheck(process.cwd())
    assert.equal(result.total, 0)
    assert.equal(result.updatesAvailable, 0)
    assert.deepEqual(result.skills, [])
  })

  it('reports skill with no source info', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: { 'test/no-source': { slug: 'test/no-source' } },
      dismissed: {},
      lastSelectedAgents: [],
    }))

    const result = await apiCheck(process.cwd())

    assert.equal(result.total, 1)
    assert.equal(result.skills[0].status, 'skipped')
    assert.equal(result.skills[0].reason, 'no source info')
  })

  it('reports skill as up to date when hash matches', async () => {
    const { computeContentHash } = await import('../utils/lockfile.js')
    const skillDir = join(tempDir, 'test-skill')
    await mkdir(skillDir, { recursive: true })
    const content = `---
name: test
---
# Test
Some content.`
    await writeFile(join(skillDir, 'SKILL.md'), content)
    const contentSha = computeContentHash({ 'SKILL.md': content })

    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: {
        'test/match': { slug: 'test/match', source: skillDir, contentSha },
      },
      dismissed: {},
      lastSelectedAgents: [],
    }))

    const result = await apiCheck(process.cwd())

    assert.equal(result.total, 1)
    assert.equal(result.skills[0].status, 'up_to_date')
  })

  it('reports update available when hash differs', async () => {
    const skillDir = join(tempDir, 'agents', 'skill-update')
    mkdirSync: mkdir
    await mkdir(skillDir, { recursive: true })
    const content = `---
name: skill-update
---
# Updated
New content.`
    await writeFile(join(skillDir, 'SKILL.md'), content)

    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: {
        'test/update': {
          source: skillDir,
          contentSha: 'old-hash-that-does-not-match',
        },
      },
      dismissed: {},
      lastSelectedAgents: [],
    }))

    const result = await apiCheck(process.cwd())

    assert.equal(result.total, 1)
    assert.equal(result.skills[0].status, 'update_available')
    assert.equal(result.updatesAvailable, 1)
  })
})