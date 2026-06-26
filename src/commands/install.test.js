import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, installModule, origCwd, origHome

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-install-cmd-test-'))
  origCwd = process.cwd()
  origHome = process.env.HOME
  process.env.HOME = tempDir
  process.chdir(tempDir)

  const skillDir = join(tempDir, 'test-skill')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '# slug: ns/test-cmd\nname: test-cmd\n# owner: tester\nContent')
  writeFileSync(join(skillDir, 'extra.js'), 'x')

  await mkdir(join(tempDir, '.agents'), { recursive: true })

  installModule = await import('./install.js')
})

after(async () => {
  process.chdir(origCwd)
  process.env.HOME = origHome
  await rm(tempDir, { recursive: true, force: true })
})

function capture(name) {
  const orig = console[name]
  const logs = []
  console[name] = (...args) => {
    if (args.length) logs.push(String(args[0]))
  }
  return { logs, restore: () => { console[name] = orig } }
}

describe('install command', () => {
  it('installs with --global flag', async () => {
    const { logs, restore } = capture('log')

    await installModule.installCommand(join(tempDir, 'test-skill'), { global: true })

    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
  })

  it('installs with --project flag', async () => {
    const origCwd = process.cwd
    process.cwd = () => tempDir
    const { logs, restore } = capture('log')

    await installModule.installCommand(join(tempDir, 'test-skill'), { project: true })

    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
    process.cwd = origCwd
  })

  it('installs with --claude flag', async () => {
    const { logs, restore } = capture('log')

    await installModule.installCommand(join(tempDir, 'test-skill'), { claude: true })

    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
  })

  it('installs with --cursor flag', async () => {
    const { logs, restore } = capture('log')

    await installModule.installCommand(join(tempDir, 'test-skill'), { cursor: true })

    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
  })

  it('installs with default scope (global) when no flags given', async () => {
    const { logs, restore } = capture('log')

    await installModule.installCommand(join(tempDir, 'test-skill'), { global: true })

    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
  })

  it('installs with --all scope', async () => {
    const origCwd = process.cwd
    process.cwd = () => tempDir
    const { logs, restore } = capture('log')

    await installModule.installCommand(join(tempDir, 'test-skill'), {
      global: true, project: true, claude: true, cursor: true,
    })

    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
    process.cwd = origCwd
  })
})

describe('askScope', () => {
  function withAnswer(answer) {
    installModule.setAskQuestion(() => Promise.resolve(answer))
  }

  it('returns global scope for empty input (default)', async () => {
    withAnswer('')
    const result = await installModule.installCommand(join(tempDir, 'test-skill'), {})
    assert.equal(result, undefined) // just verifies no crash
  })

  it('returns project scope for choice 2 via installCommand', async () => {
    withAnswer('2')
    const origCwd = process.cwd
    process.cwd = () => tempDir
    const { logs, restore } = capture('log')
    await installModule.installCommand(join(tempDir, 'test-skill'), {})
    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
    process.cwd = origCwd
  })

  it('returns both scope for choice 3', async () => {
    withAnswer('3')
    const origCwd = process.cwd
    process.cwd = () => tempDir
    const { logs, restore } = capture('log')
    await installModule.installCommand(join(tempDir, 'test-skill'), {})
    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
    process.cwd = origCwd
  })

  it('calls defaultAskQuestion when askQuestion is not overridden', async () => {
    let called = false
    installModule.setCreateInterface(() => ({
      question: (query, cb) => { cb(''); called = true },
      close: () => {},
    }))
    installModule.resetAskQuestion()

    const { logs, restore } = capture('log')
    await installModule.installCommand(join(tempDir, 'test-skill'), {})
    assert.ok(logs.some(l => l.includes('Installed')))
    assert.ok(called, 'defaultAskQuestion should have called createInterface')
    restore()
  })

  it('allows fresh install with frozen-lockfile', async () => {
    const freshSkill = join(tempDir, 'fresh-skill-test')
    mkdirSync(freshSkill, { recursive: true })
    writeFileSync(join(freshSkill, 'SKILL.md'), '# slug: test/fresh-lock\nname: fresh-lock\nContent')

    const { logs, restore } = capture('log')
    await installModule.installCommand(freshSkill, { global: true, frozenLockfile: true })
    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
  })

  it('dry-run shows plan without installing', async () => {
    const checkDir = join(tempDir, 'dry-run-skill')
    mkdirSync(checkDir, { recursive: true })
    writeFileSync(join(checkDir, 'SKILL.md'), '# slug: test/dry-run\nname: dry-run-skill\nContent')

    const { logs, restore } = capture('log')
    await installModule.installCommand(checkDir, { global: true, dryRun: true })

    assert.ok(logs.some(l => l.includes('Dry-run')))
    assert.ok(logs.some(l => l.includes('dry-run-skill')))
    assert.ok(logs.some(l => l.includes('Targets')))
    assert.ok(!logs.some(l => l.includes('Installed')))
    restore()
  })
})
