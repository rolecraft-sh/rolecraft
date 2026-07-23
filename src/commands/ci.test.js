import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, originalCwd, originalHome, ciModule, lockModule

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-ci-test-'))
  originalCwd = process.cwd()
  originalHome = process.env.HOME
  process.env.HOME = tempDir
  process.chdir(tempDir)

  await mkdir(join(tempDir, '.agents'), { recursive: true })
  await mkdir(join(tempDir, '.agents', 'skills'), { recursive: true })
  await writeFile(
    join(tempDir, '.agents', '.skill-lock.json'),
    JSON.stringify({
      version: 3,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    }),
  )

  ciModule = await import('./ci.js')
  lockModule = await import('../utils/lockfile.js')
})

after(async () => {
  process.chdir(originalCwd)
  process.env.HOME = originalHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('ci command', () => {
  it('shows no skills message when lockfile is empty', async () => {
    const logs = []
    const origLog = console.log
    console.log = (...args) => {
      if (args.length) logs.push(String(args[0]))
    }
    try {
      await ciModule.ciCommand()
    } finally {
      console.log = origLog
    }
    assert.ok(logs.some((l) => l.includes('No skills')))
  })

  it('reports missing source in lockfile entry', async () => {
    await lockModule.addSkillToLock('test/no-source', {
      slug: 'test/no-source',
    })

    const errors = []
    const origErr = console.error
    console.error = (...args) => {
      if (args.length) errors.push(String(args[0]))
    }
    const origExit = process.exit
    process.exit = () => {
      throw new Error('exit')
    }
    try {
      await ciModule.ciCommand()
    } catch {}
    console.error = origErr
    process.exit = origExit
    assert.ok(errors.some((l) => l.includes('missing source')))
  })

  it('installs skill from local source in lockfile', async () => {
    const lockPath = lockModule.getGlobalLockPath()
    await writeFile(
      lockPath,
      JSON.stringify({
        version: 3,
        skills: {
          'test/ci-skill': {
            slug: 'test/ci-skill',
            source: join(tempDir, 'ci-source-skill'),
            sourceType: 'local',
            contentSha: 'hash',
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )

    const sourceDir = join(tempDir, 'ci-source-skill')
    mkdirSync(sourceDir, { recursive: true })
    writeFileSync(
      join(sourceDir, 'SKILL.md'),
      '# slug: test/ci-skill\nname: ci-skill\nContent',
    )

    const logs = []
    const origLog = console.log
    console.log = (...args) => {
      if (args.length) logs.push(String(args[0]))
    }
    const origExit = process.exit
    process.exit = () => {
      throw new Error('exit')
    }
    try {
      await ciModule.ciCommand()
    } catch {}
    console.log = origLog
    process.exit = origExit
    assert.ok(logs.some((l) => l.includes('installed')))
  })

  it('handles installation failure gracefully', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/fail-install': {
            slug: 'test/fail-install',
            source: join(tempDir, 'nonexistent-source-dir'),
            sourceType: 'local',
            contentSha: 'hash',
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )

    const errors = []
    const origErr = console.error
    console.error = (...args) => {
      if (args.length) errors.push(args.map((a) => String(a)).join(' '))
    }
    const origExit = process.exit
    process.exit = () => {
      throw new Error('exit')
    }
    try {
      await ciModule.ciCommand()
    } catch {}
    console.error = origErr
    process.exit = origExit
    assert.ok(errors.some((l) => l.includes('fail-install')))
  })
})
