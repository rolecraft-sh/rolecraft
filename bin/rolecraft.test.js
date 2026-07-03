import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))
const VERSION = pkg.version

let tempDir, rolecraftModule, origArgv, origExit, origCwd, origHome

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-cli-test-'))
  origHome = process.env.HOME
  origCwd = process.cwd()
  process.env.HOME = tempDir
  process.chdir(tempDir)
  await mkdir(join(tempDir, '.agents'), { recursive: true })

  origArgv = process.argv
  origExit = process.exit
  rolecraftModule = await import('./rolecraft.js')
})

after(async () => {
  process.exit = origExit
  process.argv = origArgv
  process.chdir(origCwd)
  process.env.HOME = origHome
  await rm(tempDir, { recursive: true, force: true })
})

function capture(name, obj = console) {
  const logs = []
  const orig = obj[name]
  obj[name] = (...args) => {
    if (args.length) logs.push(String(args[0]))
  }
  return { logs, restore: () => { obj[name] = orig } }
}

function mockExit() {
  const orig = process.exit
  process.exit = (code) => { throw new Error(`exit:${code}`) }
  return () => { process.exit = orig }
}

describe('rolecraft CLI', () => {
  it('shows usage for help command', async () => {
    process.argv = ['node', 'rolecraft', 'help']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('rolecraft')))
    restore()
  })

  it('shows usage for --help flag', async () => {
    process.argv = ['node', 'rolecraft', '--help']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('rolecraft')))
    restore()
  })

  it('shows usage for unknown command', async () => {
    process.argv = ['node', 'rolecraft', 'unknown']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('rolecraft')))
    restore()
  })

  it('errors when install has no source', async () => {
    process.argv = ['node', 'rolecraft', 'install']
    const { logs: errors, restore: restoreErr } = capture('error')
    const restoreExit = mockExit()

    try {
      await rolecraftModule.main()
    } catch (e) {
      assert.ok(e.message.includes('exit:1'))
    }

    assert.ok(errors.some(e => e.includes('Usage: rolecraft install <source>')))
    restoreErr()
    restoreExit()
  })

  it('runs install with --global flag', async () => {
    const skillDir = join(tempDir, 'my-cli-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: cli/cli-skill\nname: cli-skill\nContent')

    process.argv = ['node', 'rolecraft', 'install', skillDir, '--global']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
  })

  it('errors when remove has no slug', async () => {
    process.argv = ['node', 'rolecraft', 'remove']
    const { logs: errors, restore: restoreErr } = capture('error')
    const restoreExit = mockExit()

    try {
      await rolecraftModule.main()
    } catch (e) {
      assert.ok(e.message.includes('exit:1'))
    }

    assert.ok(errors.some(e => e.includes('Usage: rolecraft remove <slug>')))
    restoreErr()
    restoreExit()
  })

  it('dispatches list command without errors', async () => {
    process.argv = ['node', 'rolecraft', 'list']

    await rolecraftModule.main()

    assert.ok(true)
  })

  it('runs remove command with existing skill', async () => {
    const skillDir = join(tempDir, 'removable-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/removable\nname: removable\nContent')

    process.argv = ['node', 'rolecraft', 'install', skillDir, '--global']
    await rolecraftModule.main()

    process.argv = ['node', 'rolecraft', 'remove', 'test/removable']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('Removed')))
    restore()
  })

  it('runs remove command with nonexistent skill', async () => {
    process.argv = ['node', 'rolecraft', 'remove', 'nonexistent']
    const { logs: errors, restore: restoreErr } = capture('error')
    const restoreExit = mockExit()

    try {
      await rolecraftModule.main()
    } catch (e) {
      assert.ok(e.message.includes('exit:1'))
    }

    assert.ok(errors.some(e => e.includes('not found')))
    restoreErr()
    restoreExit()
  })

  it('errors when update has no slug', async () => {
    process.argv = ['node', 'rolecraft', 'update']
    const { logs: errors, restore: restoreErr } = capture('error')
    const restoreExit = mockExit()

    try {
      await rolecraftModule.main()
    } catch (e) {
      assert.ok(e.message.includes('exit:1'))
    }

    assert.ok(errors.some(e => e.includes('Usage: rolecraft update <slug>')))
    restoreErr()
    restoreExit()
  })

  it('runs update command with existing skill', async () => {
    const skillDir = join(tempDir, 'updatable-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/updatable\nname: updatable\nContent')

    process.argv = ['node', 'rolecraft', 'install', skillDir, '--global']
    await rolecraftModule.main()

    process.argv = ['node', 'rolecraft', 'update', 'test/updatable']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('Updated')))
    restore()
  })

  it('run() catches errors', async () => {
    process.argv = ['node', 'rolecraft', 'install']
    const { logs: errors, restore: restoreErr } = capture('error')
    const restoreExit = mockExit()

    try {
      await rolecraftModule.run()
    } catch (e) {
      assert.ok(e.message.includes('exit:1'))
    }

    assert.ok(errors.some(e => e.includes('Usage: rolecraft install <source>')))
    restoreErr()
    restoreExit()
  })

  it('shows version for version command', async () => {
    process.argv = ['node', 'rolecraft', 'version']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l === VERSION))
    restore()
  })

  it('shows version for --version flag', async () => {
    process.argv = ['node', 'rolecraft', '--version']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l === VERSION))
    restore()
  })

  it('shows version for -v flag', async () => {
    process.argv = ['node', 'rolecraft', '-v']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l === VERSION))
    restore()
  })

  it('entry point invokes run() when executed directly', async () => {
    const { execSync } = await import('node:child_process')
    const binPath = new URL('./rolecraft.js', import.meta.url).pathname
    const result = execSync(`node "${binPath}" help`, {
      encoding: 'utf-8',
      env: { ...process.env, HOME: tempDir },
    })
    assert.ok(result.includes('rolecraft'))
  })

  it('entry point shows version when run with --version', async () => {
    const { execSync } = await import('node:child_process')
    const binPath = new URL('./rolecraft.js', import.meta.url).pathname
    const result = execSync(`node "${binPath}" --version`, {
      encoding: 'utf-8',
      env: { ...process.env, HOME: tempDir },
    })
    assert.equal(result.trim(), VERSION)
  })

  it('errors when use has no source', async () => {
    process.argv = ['node', 'rolecraft', 'use']
    const { logs: errors, restore: restoreErr } = capture('error')
    const restoreExit = mockExit()

    try {
      await rolecraftModule.main()
    } catch (e) {
      assert.ok(e.message.includes('exit:1'))
    }

    assert.ok(errors.some(e => e.includes('Usage: rolecraft use <source>')))
    restoreErr()
    restoreExit()
  })

  it('runs use command with existing source', async () => {
    const skillDir = join(tempDir, 'use-cli-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/use-skill\nname: use-skill\nContent')

    process.argv = ['node', 'rolecraft', 'use', skillDir]
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('use-skill')))
    assert.ok(logs.some(l => l.includes('SKILL.md')))
    assert.ok(logs.some(l => l.includes('Content')))
    restore()
  })

  it('runs setup command without source', async () => {
    process.argv = ['node', 'rolecraft', 'setup']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('Detecting agents')))
    restore()
  })

  it('runs setup command with source', async () => {
    const skillDir = join(tempDir, 'setup-cli-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/setup-cli\nname: setup-cli-test\nContent')

    process.argv = ['node', 'rolecraft', 'setup', skillDir]
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('setup-cli-test')))
    restore()
  })

  it('runs init command without name', async () => {
    process.argv = ['node', 'rolecraft', 'init']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('Created skill scaffold')))
    assert.ok(logs.some(l => l.includes('my-skill')))
    restore()
  })

  it('runs init command with name', async () => {
    process.argv = ['node', 'rolecraft', 'init', 'my-custom-skill']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('my-custom-skill')))
    restore()
  })

  it('runs init command with namespaced name', async () => {
    process.argv = ['node', 'rolecraft', 'init', 'namespace/my-skill']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('namespace/my-skill')))
    assert.ok(logs.some(l => l.includes('namespace-my-skill')))
    restore()
  })

  it('errors when search has no query', async () => {
    process.argv = ['node', 'rolecraft', 'search']
    const { logs: errors, restore: restoreErr } = capture('error')
    const restoreExit = mockExit()

    try {
      await rolecraftModule.main()
    } catch (e) {
      assert.ok(e.message.includes('exit:1'))
    }

    assert.ok(errors.some(e => e.includes('Usage: rolecraft search <query>')))
    restoreErr()
    restoreExit()
  })

  it('handles search rate limit gracefully', async () => {
    process.argv = ['node', 'rolecraft', 'search', 'test-query']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('rate limit') || l.includes('No skills found') || l.includes('Search results')))
    restore()
  })

  it('installs with --frozen-lockfile flag on fresh skill', async () => {
    const skillDir = join(tempDir, 'fresh-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/fresh\nname: fresh-skill\nContent')

    process.argv = ['node', 'rolecraft', 'install', skillDir, '--global', '--frozen-lockfile']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
  })

  it('fails with --frozen-lockfile when skill already exists', async () => {
    const skillDir = join(tempDir, 'dupe-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/dupe\nname: dupe-skill\nContent')

    process.argv = ['node', 'rolecraft', 'install', skillDir, '--global']
    await rolecraftModule.main()

    process.argv = ['node', 'rolecraft', 'install', skillDir, '--global', '--frozen-lockfile']
    const { logs: errors, restore: restoreErr } = capture('error')
    const restoreExit = mockExit()

    try {
      await rolecraftModule.main()
    } catch (e) {
      assert.ok(e.message.includes('exit:1'), `Expected exit:1 but got: ${e.message}`)
    }

    assert.ok(errors.some(e => e.includes('already installed')), `Expected 'already installed' in: ${errors.join(', ')}`)
    restoreErr()
    restoreExit()
  })

  it('runs verify command with no skills', async () => {
    process.argv = ['node', 'rolecraft', 'verify']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('Verifying')))
    restore()
  })

  it('runs ci command with no skills', async () => {
    writeFileSync(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({ version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [] }))

    process.argv = ['node', 'rolecraft', 'ci']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('No skills in lockfile')))
    restore()
  })

  it('installs with --symlink flag', async () => {
    const skillDir = join(tempDir, 'symlink-cli-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/symlink-cli\nname: symlink-cli\nContent')

    process.argv = ['node', 'rolecraft', 'install', skillDir, '--global', '--symlink']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('Installed')))
    restore()
  })

  it('shows dry-run plan without installing', async () => {
    const skillDir = join(tempDir, 'dry-run-cli-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/dry-run-cli\nname: dry-run-cli\nContent')

    process.argv = ['node', 'rolecraft', 'install', skillDir, '--global', '--dry-run']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('Dry-run')))
    assert.ok(logs.some(l => l.includes('dry-run-cli')))
    restore()
  })

  it('runs upgrade command with dry-run', async () => {
    process.argv = ['node', 'rolecraft', 'upgrade', '--dry-run']
    const { logs, restore } = capture('log')

    await rolecraftModule.main()

    assert.ok(logs.some(l => l.includes('rolecraft')))
    restore()
  })
})
