import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { apiDoctor } from './doctor.js'

let tempDir
let originalHome

async function writeGlobalLock(lock) {
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  await writeFile(
    join(tempDir, '.agents', '.skill-lock.json'),
    JSON.stringify(lock),
  )
}

before(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-doctor-test-'))
  originalHome = process.env.HOME
  process.env.HOME = tempDir
})

after(async () => {
  process.env.HOME = originalHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('api doctor', () => {
  it('returns structured checks and summary counts', async () => {
    await writeGlobalLock({
      version: 3,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    })

    const result = await apiDoctor(tempDir)

    assert.ok(['healthy', 'degraded'].includes(result.status))
    assert.ok(result.checks.length > 0)
    assert.equal(
      result.summary.total,
      result.summary.passed + result.summary.warnings + result.summary.errors,
    )
    assert.deepEqual(result.skills, {
      global: 0,
      project: 0,
      orphaned: 0,
      missingDirs: 0,
      hashMismatches: 0,
      verified: 0,
      brokenSymlinks: 0,
    })
    assert.ok(
      result.checks.some(
        (check) =>
          check.label === 'Global lockfile schema' && check.status === 'pass',
      ),
    )
  })

  it('marks an invalid lockfile schema as unhealthy', async () => {
    await writeGlobalLock({ version: '3', skills: {} })

    const result = await apiDoctor(tempDir)

    assert.equal(result.status, 'unhealthy')
    assert.equal(result.summary.errors, 1)
    assert.ok(
      result.checks.some(
        (check) =>
          check.label === 'Global lockfile schema' &&
          check.status === 'error' &&
          check.detail === 'version missing or not a number',
      ),
    )
  })

  it('runs deep conflict detection and keeps the result in the response', async () => {
    await writeGlobalLock({
      version: 3,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    })

    const result = await apiDoctor(tempDir, { deep: true })

    assert.deepEqual(result.conflicts, [])
    assert.ok(
      result.checks.some(
        (check) =>
          check.label === 'Conflict detection' && check.status === 'pass',
      ),
    )
  })
})
