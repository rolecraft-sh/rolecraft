import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { apiDoctor } from './doctor.js'
import { computeContentHash } from '../utils/lockfile.js'

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

  it('matches normalized slugs and agent-specific skill locations', async () => {
    const globalSkillFiles = {
      'SKILL.md': '---\nname: My Skill\n---\n\nBody\n',
      'run.sh': '#!/bin/sh\n',
    }
    const globalSkillDir = join(tempDir, '.agents', 'skills', 'acme-my-skill')
    await mkdir(globalSkillDir, { recursive: true })
    for (const [name, content] of Object.entries(globalSkillFiles)) {
      await writeFile(join(globalSkillDir, name), content)
    }

    const claudeSkillFiles = {
      'SKILL.md': '---\nname: Claude Skill\n---\n\nBody\n',
    }
    const claudeSkillDir = join(
      tempDir,
      '.claude',
      'skills',
      'acme-claude-skill',
    )
    await mkdir(claudeSkillDir, { recursive: true })
    for (const [name, content] of Object.entries(claudeSkillFiles)) {
      await writeFile(join(claudeSkillDir, name), content)
    }

    await writeGlobalLock({
      version: 3,
      skills: {
        'acme/my-skill': {
          slug: 'acme/my-skill',
          agents: ['agents'],
          contentSha: computeContentHash(globalSkillFiles),
        },
        'acme/claude-skill': {
          slug: 'acme/claude-skill',
          agents: ['claude'],
          contentSha: computeContentHash(claudeSkillFiles),
        },
      },
      dismissed: {},
      lastSelectedAgents: [],
    })

    const result = await apiDoctor(tempDir)

    assert.equal(result.skills.orphaned, 0)
    assert.equal(result.skills.missingDirs, 0)
    assert.equal(result.skills.hashMismatches, 0)
    assert.equal(result.skills.verified, 2)
  })

  it('resolves project-scoped agent skill dirs from the api cwd', async () => {
    const projectDir = join(tempDir, 'api-cwd-project')
    const otherDir = join(tempDir, 'other-cwd')
    const skillFiles = {
      'SKILL.md': '---\nname: Devin Skill\n---\n\nBody\n',
    }
    const skillDir = join(projectDir, '.devin', 'skills', 'acme-devin-skill')
    await mkdir(skillDir, { recursive: true })
    await mkdir(otherDir, { recursive: true })
    for (const [name, content] of Object.entries(skillFiles)) {
      await writeFile(join(skillDir, name), content)
    }
    await writeGlobalLock({
      version: 3,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    })
    await mkdir(join(projectDir, '.agents'), { recursive: true })
    await writeFile(
      join(projectDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'acme/devin-skill': {
            slug: 'acme/devin-skill',
            agents: ['devin'],
            contentSha: computeContentHash(skillFiles),
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )

    const originalCwd = process.cwd()
    process.chdir(otherDir)
    try {
      const result = await apiDoctor(projectDir)

      assert.equal(result.skills.missingDirs, 0)
      assert.equal(result.skills.hashMismatches, 0)
      assert.equal(result.skills.verified, 1)
      assert.equal(
        result.agents.find((a) => a.flag === 'devin')?.dir,
        join(projectDir, '.devin', 'skills'),
      )
    } finally {
      process.chdir(originalCwd)
    }
  })
})
