import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { apiUpdate } from './update.js'

let tempDir
let originalHome

async function writeLock(path, skills) {
  await mkdir(join(path, '.agents'), { recursive: true })
  await writeFile(
    join(path, '.agents', '.skill-lock.json'),
    JSON.stringify({
      version: 3,
      skills,
      dismissed: {},
      lastSelectedAgents: [],
    }),
  )
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-update-test-'))
  originalHome = process.env.HOME
  process.env.HOME = tempDir
  await writeLock(tempDir, {})
})

after(async () => {
  process.env.HOME = originalHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('api update', () => {
  it('returns the documented dry-run shape for a global skill', async () => {
    await writeLock(tempDir, {
      'owner/example': {
        source: 'owner/repository',
        sourceType: 'github',
      },
    })

    const result = await apiUpdate('example', tempDir, { dryRun: true })

    assert.deepEqual(result, {
      dryRun: true,
      slug: 'owner/example',
      source: 'owner/repository',
      sourceType: 'github',
      targets: ['agents'],
    })
  })

  it('finds skills in the project lockfile', async () => {
    await writeLock(tempDir, {})
    const projectDir = join(tempDir, 'project')
    await writeLock(projectDir, {
      'team/project-skill': {
        source: './skills/project-skill',
        sourceType: 'local',
      },
    })

    const result = await apiUpdate('project-skill', projectDir, {
      dryRun: true,
    })

    assert.equal(result.slug, 'team/project-skill')
    assert.equal(result.sourceType, 'local')
    assert.deepEqual(result.targets, ['agents'])
  })

  it('rejects when the requested skill is not installed', async () => {
    await writeLock(tempDir, {})

    await assert.rejects(
      () => apiUpdate('missing', tempDir),
      /Skill "missing" not found\./,
    )
  })
})
