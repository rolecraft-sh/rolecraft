import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { apiList } from './list.js'

let tempDir, origHome

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-list-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  await writeFile(
    join(tempDir, '.agents', '.skill-lock.json'),
    JSON.stringify({
      version: 3,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    }),
  )
})

after(async () => {
  process.env.HOME = origHome
  await rm(tempDir, { recursive: true, force: true })
})

async function _resetLockfile() {
  await writeFile(
    join(tempDir, '.agents', '.skill-lock.json'),
    JSON.stringify({
      version: 3,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    }),
  )
}

describe('api list', () => {
  it('returns empty when lockfile is empty', async () => {
    const result = await apiList(tempDir)
    assert.equal(result.total, 0)
    assert.deepEqual(result.skills, {})
  })

  it('returns skills from lockfile', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/skill': {
            installedAt: '2025-01-15T10:00:00.000Z',
            source: 'owner/repo',
            sourceType: 'github',
            agents: ['claude'],
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )

    const result = await apiList(tempDir)

    assert.equal(result.total, 1)
    assert.ok(result.skills['test/skill'])
    assert.equal(result.skills['test/skill'].source, 'owner/repo')
    assert.equal(result.skills['test/skill'].sourceType, 'github')
    assert.ok(result.skills['test/skill'].scope.includes('global'))
    assert.ok(result.globals >= 1)
  })

  it('merges global and project skills', async () => {
    const projectDir = join(tempDir, 'merge-project')
    await mkdir(join(projectDir, '.agents'), { recursive: true })

    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/global': { installedAt: '2025-01-01T00:00:00.000Z' },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )

    await writeFile(
      join(projectDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/project': { installedAt: '2025-02-01T00:00:00.000Z' },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )

    const result = await apiList(projectDir)

    assert.equal(result.total, 2)
    assert.ok(result.skills['test/global'])
    assert.equal(result.skills['test/global'].scope, 'global')
    assert.ok(result.skills['test/project'])
    assert.equal(result.skills['test/project'].scope, 'project')

    await rm(projectDir, { recursive: true, force: true })
  })

  it('handles skill in both global and project with scope label', async () => {
    const projectDir = join(tempDir, 'dual-project')
    await mkdir(join(projectDir, '.agents'), { recursive: true })
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/both': {
            source: 'owner/repo',
            installedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )
    await writeFile(
      join(projectDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/both': {
            source: 'owner/repo',
            installedAt: '2025-02-01T00:00:00.000Z',
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )

    const result = await apiList(projectDir)

    assert.equal(result.total, 1)
    assert.equal(result.skills['test/both'].scope, 'global, project')

    await rm(projectDir, { recursive: true, force: true })
  })
})
