import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, existsSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { setupApi } from './setup.js'

let tempDir, skillDir
let originalHome, originalCwd

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-setup-test-'))
  originalHome = process.env.HOME
  originalCwd = process.cwd()
  process.env.HOME = tempDir
  process.chdir(tempDir)

  skillDir = join(tempDir, 'my-skill')
  mkdirSync(skillDir, { recursive: true })
  await writeFile(
    join(skillDir, 'SKILL.md'),
    '---\nname: my-skill\nslug: my-skill\nowner: local\ndescription: A test skill\n---\n\nBody\n',
  )
})

after(async () => {
  process.chdir(originalCwd)
  process.env.HOME = originalHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('setupApi', () => {
  it('returns no agents when none are installed and no source is given', async () => {
    const result = await setupApi()
    assert.deepEqual(result, { agents: [] })
  })

  it('detects an installed agent when no source is given', async () => {
    const agentHome = mkdtempSync(join(tmpdir(), 'rolecraft-api-setup-agent-'))
    mkdirSync(join(agentHome, '.claude', 'skills'), { recursive: true })
    process.env.HOME = agentHome

    try {
      const result = await setupApi()
      assert.deepEqual(result.agents, [
        { flag: 'claude', label: 'claude-code' },
      ])
    } finally {
      process.env.HOME = tempDir
      await rm(agentHome, { recursive: true, force: true })
    }
  })

  it('lists skills from a source with the documented shape', async () => {
    const result = await setupApi(skillDir, { list: true })

    assert.deepEqual(result.agents, [])
    assert.equal(result.skills.length, 1)
    assert.deepEqual(Object.keys(result.skills[0]).sort(), [
      'description',
      'files',
      'name',
      'owner',
      'slug',
    ])
    assert.equal(result.skills[0].slug, 'my-skill')
    assert.ok(result.skills[0].files.includes('SKILL.md'))
  })

  it('dry-run returns the install plan without writing anything', async () => {
    const result = await setupApi(skillDir, { dryRun: true })

    assert.equal(result.dryRun, true)
    assert.equal(result.skills.length, 1)
    const [plan] = result.skills
    assert.equal(plan.name, 'my-skill')
    assert.equal(plan.slug, 'my-skill')
    assert.equal(plan.source, skillDir)
    assert.ok(plan.targets.includes('project'))
    assert.ok(!existsSync(join(tempDir, '.agents', 'skills', 'my-skill')))
  })

  it('rejects when --skill matches no skill in the source', async () => {
    await assert.rejects(
      () => setupApi(skillDir, { skill: ['nonexistent'] }),
      /No matching skills found for: nonexistent/,
    )
  })
})
