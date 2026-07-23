import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, setupModule, origHome, logs, origLog, origCwd, _origCwdFn

function capture() {
  logs = []
  origLog = console.log
  console.log = (...args) => {
    if (args.length) logs.push(String(args[0]))
  }
}

function restoreLog() {
  console.log = origLog
}

function withTempCwd(fn) {
  return async (...args) => {
    origCwd = process.cwd
    _origCwdFn = origCwd
    process.cwd = () => tempDir
    try {
      await fn(...args)
    } finally {
      process.cwd = origCwd
    }
  }
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-setup-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir
  setupModule = await import('./setup.js')
})

after(async () => {
  process.env.HOME = origHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('setup command', () => {
  it(
    'detects no agents when no directories exist',
    withTempCwd(async () => {
      capture()
      await setupModule.setupCommand()
      restoreLog()
      assert.ok(logs.some((l) => l.includes('No supported agents detected')))
    }),
  )

  it(
    'detects agents when directories exist',
    withTempCwd(async () => {
      mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
      mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true })

      capture()
      await setupModule.setupCommand()
      restoreLog()

      assert.ok(logs.some((l) => l.includes('opencode')))
      assert.ok(logs.some((l) => l.includes('claude-code')))
    }),
  )

  it(
    'handles missing project dir when detecting agents',
    withTempCwd(async () => {
      mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
      mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true })

      capture()
      await setupModule.setupCommand()
      restoreLog()

      assert.ok(logs.some((l) => l.includes('opencode')))
      assert.ok(logs.some((l) => l.includes('claude-code')))
    }),
  )

  it(
    'installs a skill when source is provided',
    withTempCwd(async () => {
      mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
      mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true })

      const skillDir = join(tempDir, 'setup-skill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(
        join(skillDir, 'SKILL.md'),
        '# slug: test/setup-skill\nname: setup-test\nContent',
      )

      capture()
      await setupModule.setupCommand(skillDir)
      restoreLog()

      assert.ok(logs.some((l) => l.includes('setup-test')))
      assert.ok(logs.some((l) => l.includes('Installed')))
    }),
  )

  it(
    'dry-run shows plan without installing via setup',
    withTempCwd(async () => {
      mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
      mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true })

      const skillDir = join(tempDir, 'setup-dry-run-skill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(
        join(skillDir, 'SKILL.md'),
        '# slug: test/setup-dry\nname: setup-dry-test\nContent',
      )

      capture()
      await setupModule.setupCommand(skillDir, { dryRun: true })
      restoreLog()

      assert.ok(logs.some((l) => l.includes('[dry-run]')))
      assert.ok(logs.some((l) => l.includes('setup-dry-test')))
      assert.ok(!logs.some((l) => l.includes('Installed')))
    }),
  )

  it(
    'handles readdir failure in countSkills gracefully',
    withTempCwd(async () => {
      const agentsSkills = join(tempDir, '.agents', 'skills')
      mkdirSync(join(tempDir, '.agents'), { recursive: true })
      mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true })

      const { rmSync, writeFileSync } = await import('node:fs')
      rmSync(agentsSkills, { recursive: true, force: true })
      writeFileSync(agentsSkills, '')

      capture()
      await setupModule.setupCommand()
      restoreLog()

      assert.ok(logs.some((l) => l.includes('opencode')))
    }),
  )

  it(
    'installs from multi-skill source with --skill flag',
    withTempCwd(async () => {
      rmSync(join(tempDir, '.agents'), { recursive: true, force: true })
      mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
      const multiDir = join(tempDir, 'multi-setup-skill')
      mkdirSync(join(multiDir, 'skills', 'pick-me'), { recursive: true })
      mkdirSync(join(multiDir, 'skills', 'not-me'), { recursive: true })
      writeFileSync(
        join(multiDir, 'skills', 'pick-me', 'SKILL.md'),
        '---\nname: pick-me\nslug: multi/pick\ndescription: Pick\n---\nContent',
      )
      writeFileSync(
        join(multiDir, 'skills', 'not-me', 'SKILL.md'),
        '---\nname: not-me\nslug: multi/not\n---\nContent',
      )

      capture()
      await setupModule.setupCommand(multiDir, { skill: ['pick-me'] })
      restoreLog()

      assert.ok(logs.some((l) => l.includes('pick-me')))
      assert.ok(logs.some((l) => l.includes('Installed')))
      assert.ok(!logs.some((l) => l.includes('not-me')))
    }),
  )

  it(
    '--list flag shows skills from source without installing',
    withTempCwd(async () => {
      rmSync(join(tempDir, '.agents'), { recursive: true, force: true })
      mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
      const multiDir = join(tempDir, 'multi-setup-list')
      mkdirSync(join(multiDir, 'skills', 'show-me'), { recursive: true })
      writeFileSync(
        join(multiDir, 'skills', 'show-me', 'SKILL.md'),
        '---\nname: show-me\ndescription: Visible\n---\nHidden',
      )

      capture()
      await setupModule.setupCommand(multiDir, { list: true })
      restoreLog()

      assert.ok(logs.some((l) => l.includes('show-me')))
      assert.ok(logs.some((l) => l.includes('Visible')))
      assert.ok(!logs.some((l) => l.includes('Hidden')))
      assert.ok(!logs.some((l) => l.includes('Installed')))
    }),
  )

  it(
    '--yes installs all skills from multi-skill source without prompt',
    withTempCwd(async () => {
      rmSync(join(tempDir, '.agents'), { recursive: true, force: true })
      mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
      const multiDir = join(tempDir, 'multi-setup-yes')
      mkdirSync(join(multiDir, 'skills', 's1'), { recursive: true })
      mkdirSync(join(multiDir, 'skills', 's2'), { recursive: true })
      writeFileSync(
        join(multiDir, 'skills', 's1', 'SKILL.md'),
        '---\nname: s1\nslug: multi/s1\n---\nA',
      )
      writeFileSync(
        join(multiDir, 'skills', 's2', 'SKILL.md'),
        '---\nname: s2\nslug: multi/s2\n---\nB',
      )

      capture()
      await setupModule.setupCommand(multiDir, { yes: true })
      restoreLog()

      assert.ok(logs.some((l) => l.includes('s1')))
      assert.ok(logs.some((l) => l.includes('s2')))
      assert.ok(logs.some((l) => l.includes('Installed')))
    }),
  )

  it(
    'dry-run with multi-skill source shows all skills',
    withTempCwd(async () => {
      rmSync(join(tempDir, '.agents'), { recursive: true, force: true })
      mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
      const multiDir = join(tempDir, 'multi-setup-dry')
      mkdirSync(join(multiDir, 'skills', 'd1'), { recursive: true })
      mkdirSync(join(multiDir, 'skills', 'd2'), { recursive: true })
      writeFileSync(
        join(multiDir, 'skills', 'd1', 'SKILL.md'),
        '---\nname: d1\nslug: multi/d1\n---\nD1',
      )
      writeFileSync(
        join(multiDir, 'skills', 'd2', 'SKILL.md'),
        '---\nname: d2\nslug: multi/d2\n---\nD2',
      )

      capture()
      await setupModule.setupCommand(multiDir, {
        skill: ['d1', 'd2'],
        dryRun: true,
      })
      restoreLog()

      assert.ok(logs.some((l) => l.includes('[dry-run]')))
      assert.ok(logs.some((l) => l.includes('d1')))
      assert.ok(logs.some((l) => l.includes('d2')))
      assert.ok(!logs.some((l) => l.includes('Installed')))
    }),
  )

  it(
    '--skill flag throws for non-matching names',
    withTempCwd(async () => {
      rmSync(join(tempDir, '.agents'), { recursive: true, force: true })
      mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })
      const multiDir = join(tempDir, 'multi-setup-nomatch')
      mkdirSync(join(multiDir, 'skills', 'exists'), { recursive: true })
      writeFileSync(
        join(multiDir, 'skills', 'exists', 'SKILL.md'),
        '---\nname: exists\n---\nX',
      )

      await assert.rejects(
        () => setupModule.setupCommand(multiDir, { skill: ['nope'] }),
        /No matching skills found/,
      )
    }),
  )
})
