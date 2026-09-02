import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, origCwd, origHome

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-e2e-'))
  origCwd = process.cwd()
  origHome = process.env.HOME
  process.env.HOME = tempDir
  process.chdir(tempDir)
  await mkdir(join(tempDir, '.agents'), { recursive: true })
})

after(async () => {
  process.chdir(origCwd)
  process.env.HOME = origHome
  await rm(tempDir, { recursive: true, force: true })
})

function capture(name = 'log') {
  const orig = console[name]
  const logs = []
  console[name] = (...args) => {
    if (args.length) logs.push(String(args[0]))
  }
  return {
    logs,
    restore: () => {
      console[name] = orig
    },
  }
}

describe('E2E: install → lockfile → verify → doctor', () => {
  const skillName = 'e2e-test-skill'
  const skillSlug = `e2e/${skillName}`
  const skillContent =
    '# slug: e2e/e2e-test-skill\nname: e2e-test-skill\nowner: tester\ndescription: E2E test skill\n\nThis is the content.'

  before(async () => {
    const skillDir = join(tempDir, 'my-e2e-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), skillContent)
    writeFileSync(join(skillDir, 'helper.js'), 'console.log("helper")')
  })

  it('Step 1: install skill to global scope', async () => {
    const { installCommand } = await import('./commands/install.js')
    const skillDir = join(tempDir, 'my-e2e-skill')

    const { logs, restore } = capture()
    await installCommand(skillDir, { global: true, yes: true })
    restore()

    assert.ok(
      logs.some((l) => l.includes('installed')),
      'should show installed',
    )
    assert.ok(
      logs.some((l) => l.includes('e2e-test-skill')),
      'should show skill name',
    )
  })

  it('Step 2: verify lockfile contains the skill', async () => {
    const { readLock } = await import('./utils/lockfile.js')
    const lock = await readLock()

    assert.ok(lock.skills[skillSlug], 'lockfile should contain the skill')
    assert.equal(lock.skills[skillSlug].sourceType, 'local')
    assert.ok(lock.skills[skillSlug].contentSha, 'should have contentSha')
    assert.ok(lock.skills[skillSlug].installedAt, 'should have installedAt')
  })

  it('Step 3: verify skill directory exists on disk', async () => {
    const { getAgentsDir, normalizeSlug } = await import('./utils/lockfile.js')
    const normSlug = normalizeSlug(skillSlug)
    const skillDir = join(getAgentsDir(), normSlug)

    const { existsSync } = await import('node:fs')
    assert.ok(existsSync(skillDir), 'skill directory should exist')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')), 'SKILL.md should exist')
    assert.ok(existsSync(join(skillDir, 'helper.js')), 'helper.js should exist')
  })

  it('Step 4: verify command reports skill as verified', async () => {
    const { verifyCommand } = await import('./commands/verify.js')

    const { logs, restore } = capture()
    await verifyCommand()
    restore()

    assert.ok(
      logs.some((l) => l.includes('verified')),
      'should show verified status',
    )
  })

  it('Step 5: doctor reports skill integrity as pass', async () => {
    const { doctorCommand } = await import('./commands/doctor.js')

    const { logs, restore } = capture()
    await doctorCommand()
    restore()

    assert.ok(
      logs.some((l) => l.includes('checked')),
      'should show integrity check',
    )
    assert.ok(
      logs.some((l) => l.includes('Summary:')),
      'should show summary',
    )
  })

  it('Step 6: doctor shows 1 tracked skill in global lockfile', async () => {
    const { doctorCommand } = await import('./commands/doctor.js')

    const { logs, restore } = capture()
    await doctorCommand()
    restore()

    assert.ok(
      logs.some((l) => l.includes('1 skill(s) tracked')),
      'should show tracked count',
    )
  })

  it('Step 7: verify detects file modification (hash mismatch)', async () => {
    const { getAgentsDir, normalizeSlug } = await import('./utils/lockfile.js')
    const normSlug = normalizeSlug(skillSlug)
    const skillDir = join(getAgentsDir(), normSlug)

    // Tamper with the file
    writeFileSync(join(skillDir, 'SKILL.md'), '# TAMPERED CONTENT')

    const { verifyCommand } = await import('./commands/verify.js')
    const { logs: errors, restore } = capture('error')
    await verifyCommand()
    restore()

    assert.ok(
      errors.some((l) => l.includes('hash mismatch')),
      'should detect hash mismatch',
    )

    // Restore original
    writeFileSync(join(skillDir, 'SKILL.md'), skillContent)
  })

  it('Step 8: remove skill cleans up lockfile and directory', async () => {
    const { removeCommand } = await import('./commands/remove.js')
    const { readLock } = await import('./utils/lockfile.js')
    const { getAgentsDir, normalizeSlug } = await import('./utils/lockfile.js')

    const { restore } = capture()
    await removeCommand(skillSlug, { global: true })
    restore()

    const lock = await readLock()
    assert.ok(!lock.skills[skillSlug], 'skill should be removed from lockfile')

    const normSlug = normalizeSlug(skillSlug)
    const skillDir = join(getAgentsDir(), normSlug)
    const { existsSync } = await import('node:fs')
    assert.ok(!existsSync(skillDir), 'skill directory should be removed')
  })

  it('Step 9: doctor shows no skills after removal', async () => {
    const { doctorCommand } = await import('./commands/doctor.js')

    const { logs, restore } = capture()
    await doctorCommand()
    restore()

    assert.ok(
      logs.some((l) => l.includes('no global skills')),
      'should show no skills',
    )
  })
})

describe('E2E: install → check → update flow', () => {
  const skillSlug = 'e2e/update-test'
  const skillContent =
    '# slug: e2e/update-test\nname: update-test\nowner: tester\nOriginal content'

  before(async () => {
    const skillDir = join(tempDir, 'update-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), skillContent)
  })

  it('install skill for update test', async () => {
    const { installCommand } = await import('./commands/install.js')
    const { logs, restore } = capture()
    await installCommand(join(tempDir, 'update-skill'), {
      global: true,
      yes: true,
    })
    restore()
    assert.ok(logs.some((l) => l.includes('installed')))
  })

  it('check shows the installed skill', async () => {
    const { checkCommand } = await import('./commands/check.js')
    const { logs, restore } = capture()
    await checkCommand()
    restore()
    assert.ok(
      logs.some((l) => l.includes('update-test')),
      'should list the skill',
    )
  })

  it('update re-installs the skill', async () => {
    const { updateCommand } = await import('./commands/update.js')
    const { logs, restore } = capture()
    await updateCommand(skillSlug, { global: true })
    restore()
    assert.ok(
      logs.some((l) => l.includes('update-test')),
      'should show skill name',
    )
  })

  it('cleanup: remove skill', async () => {
    const { removeCommand } = await import('./commands/remove.js')
    const { logs, restore } = capture()
    await removeCommand(skillSlug, { global: true })
    restore()
    assert.ok(logs.some((l) => l.includes('Removed')))
  })
})

describe('E2E: doctor JSON output', () => {
  it('doctor --json produces valid JSON with expected structure', async () => {
    const { doctorCommand } = await import('./commands/doctor.js')

    const { logs, restore } = capture()
    await doctorCommand({ json: true })
    restore()

    const jsonStr = logs.join('')
    const parsed = JSON.parse(jsonStr)

    assert.equal(typeof parsed.status, 'string')
    assert.ok(['healthy', 'degraded', 'unhealthy'].includes(parsed.status))
    assert.ok(typeof parsed.checks === 'object')
    assert.ok(Object.keys(parsed.checks).length > 0)
    assert.equal(typeof parsed.summary, 'object')
    assert.equal(typeof parsed.summary.passed, 'number')
    assert.equal(typeof parsed.summary.total, 'number')
    assert.ok(parsed.summary.total > 0)
  })
})

describe('E2E: dry-run does not modify system', () => {
  it('dry-run shows plan without installing', async () => {
    const dryRunDir = join(tempDir, 'dryrun-skill')
    mkdirSync(dryRunDir, { recursive: true })
    writeFileSync(
      join(dryRunDir, 'SKILL.md'),
      '# slug: e2e/dryrun\ndryrun-skill\nContent',
    )

    const { installCommand } = await import('./commands/install.js')
    const { logs, restore } = capture()
    await installCommand(dryRunDir, { global: true, dryRun: true })
    restore()

    assert.ok(logs.some((l) => l.includes('[dry-run]')))
    assert.ok(!logs.some((l) => l.includes('installed')))

    // Verify nothing was actually installed
    const { readLock } = await import('./utils/lockfile.js')
    const lock = await readLock()
    assert.ok(!lock.skills['e2e/dryrun'], 'should not be in lockfile')
  })
})
