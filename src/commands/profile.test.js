import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync } from 'node:fs'
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, profileCmd, origHome, origCwd

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-profile-cmd-test-'))
  origHome = process.env.HOME
  origCwd = process.cwd
  process.env.HOME = tempDir
  process.cwd = () => join(tempDir, 'project')
  await mkdir(join(tempDir, '.agents', 'profiles'), { recursive: true })
  await mkdir(join(tempDir, 'project'), { recursive: true })
  profileCmd = await import('./profile.js')
})

after(async () => {
  process.cwd = origCwd
  await rm(tempDir, { recursive: true, force: true })
  process.env.HOME = origHome
})

function captureLogs() {
  const logs = []
  mock.method(console, 'log', (...args) => {
    if (args.length) logs.push(String(args[0]))
  })
  return logs
}

describe('profile command dispatcher', () => {
  it('shows usage for --help', async () => {
    const logs = captureLogs()
    await profileCmd.profileCommand(['--help'])
    assert.ok(logs.some(l => l.includes('rolecraft profile')))
  })

  it('shows usage for no args', async () => {
    const logs = captureLogs()
    await profileCmd.profileCommand([])
    assert.ok(logs.some(l => l.includes('rolecraft profile')))
  })

  it('shows error for unknown subcommand', async () => {
    const logs = []
    mock.method(console, 'error', (...args) => {
      if (args.length) logs.push(String(args[0]))
    })
    await profileCmd.profileCommand(['unknown'])
    assert.ok(logs.some(l => l.includes('Unknown profile subcommand')))
  })
})

describe('profile save command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileSaveCommand(null, {}),
      /Missing profile name/
    )
  })

  it('saves a profile with detected agents', async () => {
    const logDir = join(tempDir, 'save-test-1')
    process.env.HOME = logDir
    process.cwd = () => logDir
    const freshCmd = await import('./profile.js')
    await mkdir(join(logDir, '.agents', 'profiles'), { recursive: true })
    await mkdir(join(logDir, '.agents', 'skills'), { recursive: true })
    const opencodeConfig = join(logDir, '.opencode.json')
    await writeFile(opencodeConfig, JSON.stringify({ model: 'gpt-4' }))

    const logs = captureLogs()
    await freshCmd.profileSaveCommand('my-profile', { targets: [] })

    assert.ok(logs.some(l => l.includes('my-profile')))

    const saveDir = join(logDir, '.agents', 'profiles')
    assert.ok(existsSync(join(saveDir, 'my-profile.json')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })

  it('supports dry-run', async () => {
    const logDir = join(tempDir, 'dry-run-test')
    await mkdir(join(logDir, '.agents', 'skills', 'test-skill'), { recursive: true })
    await writeFile(join(logDir, '.opencode.json'), JSON.stringify({ model: 'gpt-4' }))
    process.env.HOME = logDir
    process.cwd = () => logDir
    const freshCmd = await import('./profile.js')

    const logs = captureLogs()
    await freshCmd.profileSaveCommand('test-profile', { dryRun: true, targets: ['agents'] })
    assert.ok(logs.some(l => l.includes('Would save profile')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })

  it('saves with specific agent targets', async () => {
    const logDir = join(tempDir, 'save-test-targets')
    await mkdir(join(logDir, '.agents', 'profiles'), { recursive: true })
    await mkdir(join(logDir, '.agents', 'skills', 'test-skill'), { recursive: true })
    const opencodeConfig = join(logDir, '.opencode.json')
    await writeFile(opencodeConfig, JSON.stringify({ model: 'gpt-4' }))

    process.env.HOME = logDir
    process.cwd = () => logDir
    const freshCmd = await import('./profile.js')

    const logs = captureLogs()
    await freshCmd.profileSaveCommand('targeted-profile', { targets: ['agents'] })

    assert.ok(logs.some(l => l.includes('targeted-profile')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })
})

describe('profile list command', () => {
  it('shows no profiles message', async () => {
    const logs = captureLogs()
    await profileCmd.profileListCommand()
    assert.ok(logs.some(l => l.includes('No profiles saved')))
  })

  it('lists saved profiles', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'list-test-a', agents: { agents: {} } })
    await writeProfile({ name: 'list-test-b', agents: { agents: {}, cursor: {} } })

    const logs = captureLogs()
    await profileCmd.profileListCommand()

    assert.ok(logs.some(l => l.includes('list-test-a')))
    assert.ok(logs.some(l => l.includes('list-test-b')))
    assert.ok(logs.some(l => l.includes('2 profile(s)')))
  })
})

describe('profile show command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileShowCommand(null),
      /Missing profile name/
    )
  })

  it('shows profile contents', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'show-test',
      description: 'Test profile',
      agents: { agents: { config: { global: { model: 'gpt-4' } } } },
    })

    const logs = captureLogs()
    await profileCmd.profileShowCommand('show-test')

    assert.ok(logs.some(l => l.includes('show-test')))
    assert.ok(logs.some(l => l.includes('Test profile')))
    assert.ok(logs.some(l => l.includes('agents')))
  })

  it('throws for missing profile', async () => {
    await assert.rejects(
      () => profileCmd.profileShowCommand('does-not-exist'),
      /not found/
    )
  })
})

describe('profile delete command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileDeleteCommand(null, {}),
      /Missing profile name/
    )
  })

  it('supports dry-run', async () => {
    const logs = captureLogs()
    await profileCmd.profileDeleteCommand('non-existent', { dryRun: true })
    assert.ok(logs.some(l => l.includes('does not exist')))
  })

  it('deletes a profile', async () => {
    const { writeProfile, readProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'delete-me', agents: {} })

    let exists = await readProfile('delete-me')
    assert.ok(exists)

    const logs = captureLogs()
    await profileCmd.profileDeleteCommand('delete-me', {})

    assert.ok(logs.some(l => l.includes('delete-me')))

    exists = await readProfile('delete-me')
    assert.equal(exists, null)
  })

  it('throws for missing profile', async () => {
    await assert.rejects(
      () => profileCmd.profileDeleteCommand('not-here', {}),
      /not found/
    )
  })
})
