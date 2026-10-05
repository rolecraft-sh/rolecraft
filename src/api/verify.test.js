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

  // #325: the false-negative this issue was filed for. `contentSha` was computed
  // over a reduced file set and `verify` read that same reduced set, so a
  // tampered file in a subdirectory passed verification permanently.
  it('verifies a skill with nested files', async () => {
    const projectDir = join(tempDir, 'nested-project')
    const skillDir = join(projectDir, '.agents', 'skills', 'owner-nested')
    const files = {
      'SKILL.md': '# Nested\n',
      'scripts/run.sh': 'echo hi\n',
    }
    await mkdir(join(skillDir, 'scripts'), { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), files['SKILL.md'])
    await writeFile(
      join(skillDir, 'scripts', 'run.sh'),
      files['scripts/run.sh'],
    )
    await writeLock(projectDir, {
      'owner/nested': {
        agents: ['project'],
        contentSha: computeContentHash(files),
        fileHashes: computeFileHashes(files),
      },
    })

    const result = await apiVerify(projectDir)

    assert.equal(result.allPassed, true)
    assert.equal(result.totalVerified, 1)
  })

  it('fails verification when a nested file is modified', async () => {
    const projectDir = join(tempDir, 'nested-tampered')
    const skillDir = join(projectDir, '.agents', 'skills', 'owner-tampered')
    const expected = {
      'SKILL.md': '# Nested\n',
      'scripts/run.sh': 'echo hi\n',
    }
    await mkdir(join(skillDir, 'scripts'), { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), expected['SKILL.md'])
    await writeFile(join(skillDir, 'scripts', 'run.sh'), 'echo tampered\n')
    await writeLock(projectDir, {
      'owner/tampered': {
        agents: ['project'],
        contentSha: computeContentHash(expected),
        fileHashes: computeFileHashes(expected),
      },
    })

    const result = await apiVerify(projectDir)

    assert.equal(result.allPassed, false)
    assert.deepEqual(result.failed[0].dirs[0].changes, [
      'modified: scripts/run.sh',
    ])
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

  // Distinct from the file name, so an assertion cannot pass just because the
  // slug itself is echoed back in the failure entry.
  const LEAK_MARKER = 'should-not-be-read-9f2c'

  // A slug of ".." is the form that actually escapes: normalizeSlug turns "/"
  // into "-", so "../../evil" collapses to "..-..-evil" and never leaves the
  // skills directory, while ".." survives normalization and joins to the parent.
  it('does not read outside the skills directory for a traversal slug', async () => {
    const projectDir = join(tempDir, 'traversal-project')
    const agentsDir = join(projectDir, '.agents')
    await mkdir(join(agentsDir, 'skills'), { recursive: true })
    // Reachable from the ".." slug, because verify reads files directly out of
    // the directory it lands on rather than recursing.
    await writeFile(join(agentsDir, 'SECRET.md'), LEAK_MARKER)
    await writeLock(projectDir, {
      '..': {
        source: 'evil/repo',
        agents: ['project'],
        contentSha: 'deadbeef',
      },
    })

    const result = await apiVerify(projectDir)

    assert.equal(result.allPassed, false)
    assert.equal(result.totalFailed, 1)
    assert.equal(result.failed[0].slug, '..')
    assert.match(result.failed[0].reason, /unsafe slug/)

    // The guard is what matters, not just the wording: nothing outside the
    // skills directory may appear anywhere in the result.
    assert.equal(result.verified.length, 0)
    assert.equal(JSON.stringify(result).includes(LEAK_MARKER), false)
  })

  // normalizeSlug does not touch a Windows separator, so this form would traverse
  // there. It cannot fail on a POSIX runner, where "\" is an ordinary character
  // in a file name, so this case is a guard for a Windows runner rather than
  // current coverage — the matrix has none. It is here so that adding one does
  // not mean writing this test from scratch.
  it('does not read outside the skills directory for a backslash traversal slug', async () => {
    const projectDir = join(tempDir, 'backslash-project')
    const agentsDir = join(projectDir, '.agents')
    await mkdir(join(agentsDir, 'skills'), { recursive: true })
    await writeFile(join(agentsDir, 'SECRET.md'), LEAK_MARKER)
    await writeLock(projectDir, {
      '..\\SECRET.md': {
        source: 'evil/repo',
        agents: ['project'],
        contentSha: 'deadbeef',
      },
    })

    const result = await apiVerify(projectDir)

    assert.equal(result.allPassed, false)
    assert.equal(JSON.stringify(result).includes(LEAK_MARKER), false)
  })
})
