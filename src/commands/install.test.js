import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, installModule

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-install-cmd-test-'))
  process.env.HOME = tempDir

  const skillDir = join(tempDir, 'test-skill')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '# slug: ns/test-cmd\nname: test-cmd\n# owner: tester\nContent')
  writeFileSync(join(skillDir, 'extra.js'), 'x')

  await mkdir(join(tempDir, '.agents'), { recursive: true })

  installModule = await import('./install.js')
})

after(async () => {
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

  it('installs with default scope (global) when no flags given', async () => {
    const { logs, restore } = capture('log')

    await installModule.installCommand(join(tempDir, 'test-skill'), {})

    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
  })

  it('installs with --all scope', async () => {
    const origCwd = process.cwd
    process.cwd = () => tempDir
    const { logs, restore } = capture('log')

    await installModule.installCommand(join(tempDir, 'test-skill'), {
      global: true, project: true, claude: true,
    })

    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
    process.cwd = origCwd
  })
})
