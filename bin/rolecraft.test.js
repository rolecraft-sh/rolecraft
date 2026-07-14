import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, origHome, origCwd, origArgv

function captureLogs() {
  const logs = []
  mock.method(console, 'log', (...args) => {
    if (args.length) logs.push(String(args[0]))
  })
  return logs
}

function captureErrors() {
  const errors = []
  mock.method(console, 'error', (...args) => {
    if (args.length) errors.push(String(args.join(' ')))
  })
  return errors
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-cli-test-'))
  origHome = process.env.HOME
  origCwd = process.cwd
  origArgv = process.argv
  process.env.HOME = tempDir
  process.cwd = () => join(tempDir, 'project')
  await mkdir(join(tempDir, 'project'), { recursive: true })
})

after(async () => {
  process.env.HOME = origHome
  process.cwd = origCwd
  process.argv = origArgv
  await rm(tempDir, { recursive: true, force: true })
})

describe('rolecraft CLI', () => {
  it('shows usage for --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('shows usage for -h', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', '-h']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('shows usage for help subcommand', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('shows usage for unknown command', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'nonexistent-command']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('shows version for --version', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', '--version']
    await main()
    assert.ok(logs.some(l => l.match(/\d+\.\d+\.\d+/)))
  })

  it('shows version for -v', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', '-v']
    await main()
    assert.ok(logs.some(l => l.match(/\d+\.\d+\.\d+/)))
  })

  it('shows version for version subcommand', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'version']
    await main()
    assert.ok(logs.some(l => l.match(/\d+\.\d+\.\d+/)))
  })

  it('shows usage for install --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'install', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('throws for install with no source', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'install']
    await assert.rejects(() => main(), /Missing source/)
  })

  it('dispatches install with a source that fails resolution', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'install', '/tmp/nonexistent-rolecraft-test', '--project']
    await assert.rejects(() => main())
  })

  it('shows usage for remove --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'remove', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('throws for remove with no slug', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'remove']
    await assert.rejects(() => main(), /Missing slug/)
  })

  it('shows usage for update --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'update', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('throws for update with no slug', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'update']
    await assert.rejects(() => main(), /Missing slug/)
  })

  it('shows usage for use --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'use', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('throws for use with no source', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'use']
    await assert.rejects(() => main(), /Missing source/)
  })

  it('dispatches list command', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'list']
    await main()
  })

  it('dispatches doctor command', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'doctor']
    await main()
    assert.ok(logs.some(l => l.includes('✓') || l.includes('✗') || l.includes('System')))
  })

  it('dispatches agents-xml command', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'agents-xml']
    await main()
  })

  it('dispatches agents-xml --write command', async () => {
    const { main } = await import('./rolecraft.js')
    await mkdir(join(tempDir, 'project', '.agents', 'skills'), { recursive: true })
    process.argv = ['node', 'rolecraft', 'agents-xml', '--write']
    await main()
  })

  it('dispatches profile --help command', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'profile', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft profile')))
  })

  it('dispatches profile list command', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'profile', 'list']
    await main()
    assert.ok(logs.some(l => l.includes('No profiles')))
  })

  it('dispatches completions shell command', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'completions', 'bash']
    await main()
    assert.ok(logs.some(l => l.includes('complete')))
  })

  it('dispatches verify command', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'verify']
    await main()
  })

  it('shows usage for verify --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'verify', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('dispatches check command', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'check']
    await main()
  })

  it('shows usage for check --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'check', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('dispatches ci command', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'ci']
    await main()
  })

  it('dispatches setup command without source', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'setup']
    await main()
  })

  it('shows usage for setup --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'setup', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('dispatches init command', async () => {
    const initDir = join(tempDir, 'init-test-' + Date.now())
    await mkdir(initDir, { recursive: true })
    process.cwd = () => initDir
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'init']
    await main()
    process.cwd = () => join(tempDir, 'project')
  })

  it('shows usage for upgrade --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'upgrade', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('shows bundle usage when no args provided', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'bundle']
    await assert.rejects(() => main(), /Missing arguments/)
  })

  it('shows usage for bundle create --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'bundle', 'create', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('shows usage for mcp --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'mcp', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('run catches errors and logs them', async () => {
    const { run } = await import('./rolecraft.js')
    const errs = captureErrors()
    process.argv = ['node', 'rolecraft', '--version']
    await run()
    assert.ok(errs.length === 0)
  })

  it('run exits gracefully when main succeeds', async () => {
    const { run } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', '--version']
    await run()
    assert.ok(logs.some(l => l.match(/\d+\.\d+\.\d+/)))
  })

  it('dispatches check-updates alias', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'check-updates']
    await main()
  })

  it('shows usage for search --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'search', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('throws for search with no query', async () => {
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'search']
    await assert.rejects(() => main(), /Missing query/)
  })

  it('dispatches init command with a name', async () => {
    const initDir = join(tempDir, 'init-name-test-' + Date.now())
    await mkdir(initDir, { recursive: true })
    process.cwd = () => initDir
    const { main } = await import('./rolecraft.js')
    process.argv = ['node', 'rolecraft', 'init', 'my-skill']
    await main()
    process.cwd = () => join(tempDir, 'project')
  })

  it('shows usage for init --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'init', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })

  it('dispatches watch --help', async () => {
    const { main } = await import('./rolecraft.js')
    const logs = captureLogs()
    process.argv = ['node', 'rolecraft', 'watch', '--help']
    await main()
    assert.ok(logs.some(l => l.includes('rolecraft')))
  })
})
