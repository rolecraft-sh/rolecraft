import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { apiRemove } from './remove.js'

let tempDir, origHome

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-remove-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  await mkdir(join(tempDir, '.agents', 'skills'), { recursive: true })
  await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
    version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [],
  }))
})

after(async () => {
  process.env.HOME = origHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('api remove', () => {
  it('throws when skill not found', async () => {
    await assert.rejects(
      apiRemove('nonexistent', tempDir),
      /not found/
    )
  })

  it('shows dryRun plan', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: {
        'test/dry-remove': { installedAt: new Date().toISOString() },
      },
      dismissed: {},
      lastSelectedAgents: [],
    }))
    await mkdir(join(tempDir, '.agents', 'skills', 'test-dry-remove'), { recursive: true })

    const result = await apiRemove('test/dry-remove', tempDir, { dryRun: true })

    assert.equal(result.dryRun, true)
    assert.equal(result.slug, 'test/dry-remove')
    assert.ok(result.dirs.length >= 1)
  })

  it('removes a skill by exact slug', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: {
        'test/exact': { installedAt: new Date().toISOString() },
      },
      dismissed: {},
      lastSelectedAgents: [],
    }))
    await mkdir(join(tempDir, '.agents', 'skills', 'test-exact'), { recursive: true })

    const result = await apiRemove('test/exact', tempDir)
    assert.equal(result.slug, 'test/exact')
    assert.ok(result.removed.length >= 1)
  })
})