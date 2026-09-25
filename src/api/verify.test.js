import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { computeContentHash, computeFileHashes } from '../utils/lockfile.js'
import { apiVerify } from './verify.js'

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
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-verify-test-'))
  originalHome = process.env.HOME
  process.env.HOME = tempDir
  await writeLock(tempDir, {})
})

after(async () => {
  process.env.HOME = originalHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('api verify', () => {
  it('returns a passing result when no skills are installed', async () => {
    const result = await apiVerify(tempDir)

    assert.deepEqual(result, {
      verified: [],
      failed: [],
      allPassed: true,
    })
  })

  it('verifies an installed project skill and reports totals', async () => {
    const projectDir = join(tempDir, 'project')
    const skillDir = join(projectDir, '.agents', 'skills', 'owner-example')
    const files = { 'SKILL.md': '# Example\n' }
    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), files['SKILL.md'])
    await writeLock(projectDir, {
      'owner/example': {
        source: 'owner/repository',
        agents: ['project'],
        contentSha: computeContentHash(files),
        fileHashes: computeFileHashes(files),
      },
    })

    const result = await apiVerify(projectDir)

    assert.equal(result.allPassed, true)
    assert.equal(result.totalVerified, 1)
    assert.equal(result.totalFailed, 0)
    assert.equal(result.verified[0].slug, 'owner/example')
    assert.equal(result.verified[0].dirs[0].status, 'match')
  })

  it('describes changed files when verification fails', async () => {
    const projectDir = join(tempDir, 'changed-project')
    const skillDir = join(projectDir, '.agents', 'skills', 'owner-changed')
    const expectedFiles = { 'SKILL.md': '# Original\n' }
    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), '# Changed\n')
    await writeLock(projectDir, {
      'owner/changed': {
        agents: ['project'],
        contentSha: computeContentHash(expectedFiles),
        fileHashes: computeFileHashes(expectedFiles),
      },
    })

    const result = await apiVerify(projectDir)

    assert.equal(result.allPassed, false)
    assert.equal(result.totalVerified, 0)
    assert.equal(result.totalFailed, 1)
    assert.deepEqual(result.failed[0].dirs[0].changes, ['modified: SKILL.md'])
  })

  it('fails frozen verification when a lock entry has no source', async () => {
    const projectDir = join(tempDir, 'frozen-project')
    await writeLock(projectDir, {
      'owner/frozen': { agents: ['project'] },
    })

    const result = await apiVerify(projectDir, true)

    assert.equal(result.allPassed, false)
    assert.deepEqual(result.failed, [
      { slug: 'owner/frozen', reason: 'missing source in lockfile' },
    ])
  })
})
