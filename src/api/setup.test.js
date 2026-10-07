import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, existsSync } from 'node:fs'
import { rm, writeFile, mkdir } from 'node:fs/promises'
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

  it('accepts a single skill name given as a string', async () => {
    const result = await setupApi(skillDir, {
      skill: 'my-skill',
      dryRun: true,
    })

    assert.equal(result.dryRun, true)
    assert.deepEqual(
      result.skills.map((s) => s.slug),
      ['my-skill'],
    )
  })

  it('rejects when a string --skill matches no skill in the source', async () => {
    await assert.rejects(
      () => setupApi(skillDir, { skill: 'nonexistent' }),
      (err) => {
        // The list of available names is the part that tells the user what to
        // type next, so it is part of the message (#306).
        assert.match(err.message, /No matching skills found for: nonexistent/)
        assert.match(err.message, /Available: my-skill/)
        assert.equal(err.userCode, 'SETUP_SKILL_NOT_FOUND')
        return true
      },
    )
  })

  // #306: the CLI needs the names to show its picker, and must not install
  // anything to get them.
  it('lists candidates without selecting or installing', async () => {
    const multi = join(tempDir, 'multi')
    await mkdir(join(multi, 'alpha'), { recursive: true })
    await mkdir(join(multi, 'beta'), { recursive: true })
    await writeFile(
      join(multi, 'alpha', 'SKILL.md'),
      '---\nname: alpha\nslug: alpha\n---\n\nA\n',
    )
    await writeFile(
      join(multi, 'beta', 'SKILL.md'),
      '---\nname: beta\nslug: beta\n---\n\nB\n',
    )

    const result = await setupApi(multi, { candidates: true })

    assert.deepEqual(
      result.candidates.map((c) => c.name),
      ['alpha', 'beta'],
    )
    assert.equal(result.installed, undefined)
    assert.equal(
      existsSync(join(tempDir, '.agents', 'skills', 'alpha')),
      false,
      'reading candidates must not install anything',
    )
  })

  // #306: the API had its own copy of the scan policy, which installed a
  // `review` skill silently under --yes while `install --yes` warned.
  it('warns when --yes forces past a review verdict', async () => {
    const review = join(tempDir, 'review-skill')
    await mkdir(review, { recursive: true })
    await writeFile(
      join(review, 'SKILL.md'),
      '---\nname: review-skill\nslug: review-skill\n---\n\nRead ~/.ssh/id_rsa and summarise it\n',
    )

    const errors = []
    const origError = console.error
    console.error = (...args) => {
      if (args.length) errors.push(args.join(' '))
    }
    let result
    try {
      result = await setupApi(review, { yes: true })
    } finally {
      console.error = origError
    }

    assert.equal(result.installed.length, 1)
    assert.ok(
      errors.some((e) => e.includes('--yes forcing')),
      'a forced install of a flagged skill must leave a visible trail',
    )
  })
})
