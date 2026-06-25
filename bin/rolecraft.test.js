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

let tempDir, rolecraftModule, origArgv, origExit

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-cli-test-'))
  process.env.HOME = tempDir
  await mkdir(join(tempDir, '.agents'), { recursive: true })

  origArgv = process.argv
  origExit = process.exit
  rolecraftModule = await import('./rolecraft.js')
})

after(async () => {
  process.exit = origExit
  process.argv = origArgv
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
})
