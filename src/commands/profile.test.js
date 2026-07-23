import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, writeFileSync, unlinkSync } from 'node:fs'
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, profileCmd, origHome, origCwd, origEditor
let editHelperPath

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-profile-cmd-test-'))
  origHome = process.env.HOME
  origCwd = process.cwd
  origEditor = process.env.EDITOR
  process.env.HOME = tempDir
  process.cwd = () => join(tempDir, 'project')

  editHelperPath = join(tempDir, 'edit-helper.cjs')
  writeFileSync(
    editHelperPath,
    `
const fs = require('fs')
const p = process.argv[2]
const d = JSON.parse(fs.readFileSync(p, 'utf8'))
d.description = 'edited via editor'
fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\\n', 'utf8')
`,
  )

  await mkdir(join(tempDir, '.agents', 'profiles'), { recursive: true })
  await mkdir(join(tempDir, 'project'), { recursive: true })
  profileCmd = await import('./profile.js')
})

after(async () => {
  process.cwd = origCwd
  process.env.EDITOR = origEditor
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
    assert.ok(logs.some((l) => l.includes('rolecraft profile')))
    assert.ok(logs.some((l) => l.includes('save')))
    assert.ok(logs.some((l) => l.includes('apply')))
  })

  it('shows usage for -h', async () => {
    const logs = captureLogs()
    await profileCmd.profileCommand(['-h'])
    assert.ok(logs.some((l) => l.includes('rolecraft profile')))
    assert.ok(logs.some((l) => l.includes('save')))
  })

  it('shows usage for no args', async () => {
    const logs = captureLogs()
    await profileCmd.profileCommand([])
    assert.ok(logs.some((l) => l.includes('rolecraft profile')))
    assert.ok(logs.some((l) => l.includes('save')))
  })

  it('shows error for unknown subcommand', async () => {
    const logs = []
    mock.method(console, 'error', (...args) => {
      if (args.length) logs.push(String(args[0]))
    })
    await profileCmd.profileCommand(['unknown'])
    assert.ok(logs.some((l) => l.includes('Unknown profile subcommand')))
  })

  it('dispatches export with --file through parseArgs', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'dispatch-export', agents: { agents: {} } })

    const exportPath = join(tempDir, 'dispatch-export.json')
    const _logs = captureLogs()
    await profileCmd.profileCommand([
      'export',
      'dispatch-export',
      '--file',
      exportPath,
    ])
    assert.ok(existsSync(exportPath))
  })

  it('parses --file when followed by another flag', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'dispatch-file-flag', agents: { agents: {} } })

    const exportPath = join(tempDir, 'dispatch-file-flag.json')
    const _logs = captureLogs()
    await profileCmd.profileCommand([
      'export',
      'dispatch-file-flag',
      '--file',
      exportPath,
      '--dry-run',
    ])
    assert.ok(existsSync(exportPath))
  })

  it('parses --agents flag to add targets', async () => {
    const saveDir = join(tempDir, `agents-flag-${Date.now()}`)
    await mkdir(join(saveDir, '.agents', 'profiles'), { recursive: true })
    await mkdir(join(saveDir, '.agents', 'skills', 'test-skill'), {
      recursive: true,
    })
    const opencodeConfig = join(saveDir, '.opencode.json')
    await writeFile(opencodeConfig, JSON.stringify({ model: 'gpt-4' }))

    process.env.HOME = saveDir
    process.cwd = () => saveDir
    const freshCmd = await import('./profile.js')

    const logs = captureLogs()
    await freshCmd.profileCommand(['save', 'agents-flag-prof', '--agents'])

    assert.ok(logs.some((l) => l.includes('agents-flag-prof')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })

  it('dispatches import with --file through parseArgs', async () => {
    const importPath = join(tempDir, 'dispatch-import.json')
    await writeFile(
      importPath,
      JSON.stringify({ name: 'dispatch-import', agents: { agents: {} } }),
    )

    const logs = captureLogs()
    await profileCmd.profileCommand(['import', importPath])
    assert.ok(logs.some((l) => l.includes('dispatch-import')))
  })

  it('dispatches save subcommand', async () => {
    const saveDir = join(tempDir, `dispatch-save-${Date.now()}`)
    await mkdir(join(saveDir, '.agents', 'profiles'), { recursive: true })
    await mkdir(join(saveDir, '.agents', 'skills', 'test-skill'), {
      recursive: true,
    })
    await writeFile(
      join(saveDir, '.opencode.json'),
      JSON.stringify({ model: 'gpt-4' }),
    )

    process.env.HOME = saveDir
    process.cwd = () => saveDir
    const freshCmd = await import('./profile.js')
    const logs = []
    mock.method(console, 'log', (...args) => {
      if (args.length) logs.push(String(args[0]))
    })
    await freshCmd.profileCommand(['save', 'saved-via-dispatch'])
    assert.ok(logs.some((l) => l.includes('saved-via-dispatch')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })

  it('dispatches apply subcommand', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'apply-via-dispatch',
      agents: { agents: { config: { global: { model: 'gpt-4' } } } },
    })
    const logs = captureLogs()
    await profileCmd.profileCommand([
      'apply',
      'apply-via-dispatch',
      '--dry-run',
    ])
    assert.ok(logs.some((l) => l.includes('Would apply')))
  })

  it('dispatches diff subcommand', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'diff-via-dispatch',
      agents: { agents: { config: { global: { model: 'gpt-4' } } } },
    })
    const logs = captureLogs()
    await profileCmd.profileCommand(['diff', 'diff-via-dispatch'])
    assert.ok(logs.some((l) => l.includes('diff-via-dispatch')))
  })

  it('dispatches list subcommand', async () => {
    const logs = captureLogs()
    await profileCmd.profileCommand(['list'])
    assert.ok(
      logs.some((l) => l.includes('profile') || l.includes('No profiles')),
    )
  })

  it('dispatches show subcommand', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'show-via-dispatch', agents: { agents: {} } })
    const logs = captureLogs()
    await profileCmd.profileCommand(['show', 'show-via-dispatch'])
    assert.ok(logs.some((l) => l.includes('show-via-dispatch')))
  })

  it('dispatches link subcommand', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'link-via-dispatch', agents: {} })
    const linkPath = join(process.cwd(), '.agent-profile.json')
    try {
      const { unlinkSync } = await import('node:fs')
      unlinkSync(linkPath)
    } catch {}
    const logs = captureLogs()
    await profileCmd.profileCommand(['link', 'link-via-dispatch'])
    assert.ok(logs.some((l) => l.includes('link-via-dispatch')))
    try {
      const { unlinkSync } = await import('node:fs')
      unlinkSync(linkPath)
    } catch {}
  })

  it('dispatches delete subcommand', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'del-via-dispatch', agents: {} })
    const logs = captureLogs()
    await profileCmd.profileCommand(['delete', 'del-via-dispatch'])
    assert.ok(logs.some((l) => l.includes('del-via-dispatch')))
  })

  it('dispatches edit subcommand', async () => {
    const { writeProfile, readProfile } = await import('../utils/profile.js')
    const editName = 'edit-via-dispatch'
    await writeProfile({
      name: editName,
      description: 'original',
      agents: { agents: {} },
    })
    const editScriptPath = join(tempDir, 'edit-dispatch-helper.cjs')
    const { writeFileSync } = await import('node:fs')
    writeFileSync(
      editScriptPath,
      `
const fs = require('fs')
const p = process.argv[2]
const d = JSON.parse(fs.readFileSync(p, 'utf8'))
d.description = 'edited via dispatch'
fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\\n', 'utf8')
`,
    )
    process.env.EDITOR = `node ${editScriptPath}`
    const logs = captureLogs()
    await profileCmd.profileCommand(['edit', editName])
    assert.ok(logs.some((l) => l.includes('updated')))
    const updated = await readProfile(editName)
    assert.equal(updated.description, 'edited via dispatch')
    process.env.EDITOR = origEditor
  })
})

describe('profile save command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileSaveCommand(null, {}),
      /Missing profile name/,
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

    assert.ok(logs.some((l) => l.includes('my-profile')))

    const saveDir = join(logDir, '.agents', 'profiles')
    assert.ok(existsSync(join(saveDir, 'my-profile.json')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })

  it('supports dry-run', async () => {
    const logDir = join(tempDir, 'dry-run-test')
    await mkdir(join(logDir, '.agents', 'skills', 'test-skill'), {
      recursive: true,
    })
    await writeFile(
      join(logDir, '.opencode.json'),
      JSON.stringify({ model: 'gpt-4' }),
    )
    process.env.HOME = logDir
    process.cwd = () => logDir
    const freshCmd = await import('./profile.js')

    const logs = captureLogs()
    await freshCmd.profileSaveCommand('test-profile', {
      dryRun: true,
      targets: ['agents'],
    })
    assert.ok(logs.some((l) => l.includes('Would save profile')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })

  it('saves with specific agent targets', async () => {
    const logDir = join(tempDir, 'save-test-targets')
    await mkdir(join(logDir, '.agents', 'profiles'), { recursive: true })
    await mkdir(join(logDir, '.agents', 'skills', 'test-skill'), {
      recursive: true,
    })
    const opencodeConfig = join(logDir, '.opencode.json')
    await writeFile(opencodeConfig, JSON.stringify({ model: 'gpt-4' }))

    process.env.HOME = logDir
    process.cwd = () => logDir
    const freshCmd = await import('./profile.js')

    const logs = captureLogs()
    await freshCmd.profileSaveCommand('targeted-profile', {
      targets: ['agents'],
    })

    assert.ok(logs.some((l) => l.includes('targeted-profile')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })
})

describe('profile list command', () => {
  it('shows no profiles message', async () => {
    const listDir = join(tempDir, `list-empty-${Date.now()}`)
    await mkdir(join(listDir, '.agents', 'profiles'), { recursive: true })
    process.env.HOME = listDir
    process.cwd = () => listDir

    const freshCmd = await import('./profile.js')
    const logs = captureLogs()
    await freshCmd.profileListCommand()
    assert.ok(logs.some((l) => l.includes('No profiles saved')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })

  it('lists saved profiles', async () => {
    const listDir = join(tempDir, `list-with-${Date.now()}`)
    await mkdir(join(listDir, '.agents', 'profiles'), { recursive: true })
    process.env.HOME = listDir
    process.cwd = () => listDir

    const freshCmd = await import('./profile.js')
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'list-test-a', agents: { agents: {} } })
    await writeProfile({
      name: 'list-test-b',
      agents: { agents: {}, cursor: {} },
    })

    const logs = captureLogs()
    await freshCmd.profileListCommand()

    assert.ok(logs.some((l) => l.includes('list-test-a')))
    assert.ok(logs.some((l) => l.includes('list-test-b')))
    assert.ok(logs.some((l) => l.includes('2 profile(s)')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })
})

describe('profile show command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileShowCommand(null),
      /Missing profile name/,
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

    assert.ok(logs.some((l) => l.includes('show-test')))
    assert.ok(logs.some((l) => l.includes('Test profile')))
    assert.ok(logs.some((l) => l.includes('agents')))
  })

  it('throws for missing profile', async () => {
    await assert.rejects(
      () => profileCmd.profileShowCommand('does-not-exist'),
      /not found/,
    )
  })

  it('shows (not set) for missing description and version', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'no-meta',
      agents: { agents: {} },
    })

    const data = await (await import('../utils/profile.js')).readProfile(
      'no-meta',
    )
    data.description = undefined
    data.version = undefined
    delete data.description
    delete data.version

    const { writeFile } = await import('node:fs/promises')
    const { profilePath } = await import('../utils/profile.js')
    await writeFile(profilePath('no-meta'), JSON.stringify(data, null, 2))

    const logs = captureLogs()
    await profileCmd.profileShowCommand('no-meta')

    assert.ok(logs.some((l) => l.includes('(not set)')))
  })
})

describe('profile delete command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileDeleteCommand(null, {}),
      /Missing profile name/,
    )
  })

  it('supports dry-run', async () => {
    const logs = captureLogs()
    await profileCmd.profileDeleteCommand('non-existent', { dryRun: true })
    assert.ok(logs.some((l) => l.includes('does not exist')))
  })

  it('dry-run on existing profile shows would-delete', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'dry-del', agents: {} })

    const logs = captureLogs()
    await profileCmd.profileDeleteCommand('dry-del', { dryRun: true })
    assert.ok(logs.some((l) => l.includes('Would delete')))
  })

  it('deletes a profile', async () => {
    const { writeProfile, readProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'delete-me', agents: {} })

    let exists = await readProfile('delete-me')
    assert.ok(exists)

    const logs = captureLogs()
    await profileCmd.profileDeleteCommand('delete-me', {})

    assert.ok(logs.some((l) => l.includes('delete-me')))

    exists = await readProfile('delete-me')
    assert.equal(exists, null)
  })

  it('throws for missing profile', async () => {
    await assert.rejects(
      () => profileCmd.profileDeleteCommand('not-here', {}),
      /not found/,
    )
  })
})

describe('profile apply command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileApplyCommand(null, {}),
      /Missing profile name/,
    )
  })

  it('throws for missing profile', async () => {
    await assert.rejects(
      () => profileCmd.profileApplyCommand('not-here', {}),
      /not found/,
    )
  })

  it('shows dry-run plan', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'apply-dry',
      agents: { agents: { config: { global: { model: 'gpt-4' } } } },
    })

    const logs = captureLogs()
    await profileCmd.profileApplyCommand('apply-dry', {
      dryRun: true,
      targets: [],
      skipMcp: false,
      skipSkills: false,
    })
    assert.ok(logs.some((l) => l.includes('Would apply profile')))
  })

  it('applies a profile and shows results', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'apply-full',
      agents: {
        agents: {
          config: { global: { model: 'gpt-4' } },
        },
      },
    })

    const opencodeConfig = join(tempDir, '.opencode.json')
    await writeFile(opencodeConfig, JSON.stringify({ model: 'gpt-3.5' }))

    const logs = captureLogs()
    await profileCmd.profileApplyCommand('apply-full', {
      dryRun: false,
      targets: [],
      skipMcp: true,
      skipSkills: true,
    })

    assert.ok(logs.some((l) => l.includes('Applied profile')))
    assert.ok(logs.some((l) => l.includes('agents')))
  })

  it('applies with specific agent targets in dry-run', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'apply-targeted',
      agents: {
        agents: { config: { global: { model: 'gpt-4' } } },
        cursor: { instructions: [{ file: '.cursorrules' }] },
      },
    })

    const logs = captureLogs()
    await profileCmd.profileApplyCommand('apply-targeted', {
      dryRun: true,
      targets: ['agents'],
      skipMcp: false,
      skipSkills: false,
    })

    assert.ok(logs.some((l) => l.includes('Would apply profile')))
    assert.ok(logs.some((l) => l.includes('agents')))
    assert.equal(
      logs.some((l) => l.includes('cursor')),
      false,
    )
  })

  it('applies with specific agent targets', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'apply-targeted-real',
      agents: {
        agents: { config: { global: { model: 'gpt-4' } } },
      },
    })

    const logs = captureLogs()
    await profileCmd.profileApplyCommand('apply-targeted-real', {
      dryRun: false,
      targets: ['agents'],
      skipMcp: true,
      skipSkills: true,
    })

    assert.ok(logs.some((l) => l.includes('Applied profile')))
    assert.ok(logs.some((l) => l.includes('agents')))
  })
})

describe('profile diff command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileDiffCommand(null),
      /Missing profile name/,
    )
  })

  it('throws for missing profile', async () => {
    await assert.rejects(
      () => profileCmd.profileDiffCommand('not-here'),
      /not found/,
    )
  })

  it('shows differences between profile and current config', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'diff-test',
      agents: {
        agents: {
          config: { global: { model: 'gpt-4' } },
          skills: ['owner/skill-a'],
        },
      },
    })

    const logs = captureLogs()
    await profileCmd.profileDiffCommand('diff-test')

    assert.ok(logs.some((l) => l.includes('diff-test')))
    assert.ok(logs.some((l) => l.includes('skills differ')))
  })

  it('shows no differences when profile matches current', async () => {
    const appDir = join(tempDir, 'diff-match')
    await mkdir(join(appDir, '.agents', 'profiles'), { recursive: true })

    const opencodeConfig = join(appDir, '.opencode.json')
    await writeFile(opencodeConfig, JSON.stringify({ model: 'gpt-4' }))

    process.env.HOME = appDir
    process.cwd = () => appDir

    const freshCmd = await import('./profile.js')
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'diff-match-prof',
      agents: {
        agents: {
          config: { global: { model: 'gpt-4' } },
          instructions: [
            { file: opencodeConfig, contentSha: null, scope: 'global' },
          ],
        },
      },
    })

    const logs = captureLogs()
    await freshCmd.profileDiffCommand('diff-match-prof')

    assert.ok(logs.some((l) => l.includes('no differences')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })

  it('detects config and MCP differences', async () => {
    const diffDir = join(tempDir, 'diff-config-mcp')
    await mkdir(join(diffDir, '.agents', 'profiles'), { recursive: true })

    process.env.HOME = diffDir
    process.cwd = () => diffDir

    const freshCmd = await import('./profile.js')
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'diff-config-mcp-prof',
      agents: {
        agents: {
          config: { global: { model: 'gpt-5' } },
          mcpServers: {
            'test-mcp': { command: 'npx', args: ['-y', '@test/one'] },
          },
        },
      },
    })

    const opencodeConfig = join(diffDir, '.opencode.json')
    await writeFile(opencodeConfig, JSON.stringify({ model: 'gpt-4' }))

    const { addMcpServer } = await import('../utils/mcp.js')
    await addMcpServer('agents', 'test-mcp', {
      command: 'npx',
      args: ['-y', '@test/two'],
    })

    const logs = captureLogs()
    await freshCmd.profileDiffCommand('diff-config-mcp-prof')

    assert.ok(logs.some((l) => l.includes('config differs')))
    assert.ok(logs.some((l) => l.includes('MCP servers differ')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })
})

describe('profile edit command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileEditCommand(null),
      /Missing profile name/,
    )
  })

  it('throws for missing profile', async () => {
    await assert.rejects(
      () => profileCmd.profileEditCommand('not-here'),
      /not found/,
    )
  })

  it('opens editor and saves changes', async () => {
    const { writeProfile, readProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'edit-test',
      description: 'original',
      agents: { agents: { config: { global: { model: 'gpt-4' } } } },
    })

    process.env.EDITOR = `node ${editHelperPath}`

    const logs = captureLogs()
    await profileCmd.profileEditCommand('edit-test')

    assert.ok(logs.some((l) => l.includes('updated')))

    const updated = await readProfile('edit-test')
    assert.equal(updated.description, 'edited via editor')
  })

  it('saves unchanged file when editor does not modify', async () => {
    const { writeProfile, readProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'edit-nochange',
      description: 'same',
      agents: { agents: {} },
    })

    process.env.EDITOR = 'true'

    const logs = captureLogs()
    await profileCmd.profileEditCommand('edit-nochange')

    assert.ok(logs.some((l) => l.includes('updated')))

    const updated = await readProfile('edit-nochange')
    assert.equal(updated.description, 'same')
  })

  it('throws on editor error (non-zero exit)', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'edit-error',
      description: 'will fail',
      agents: { agents: {} },
    })

    process.env.EDITOR = 'false'

    await assert.rejects(
      () => profileCmd.profileEditCommand('edit-error'),
      /Command failed/,
    )
  })

  it('throws on invalid JSON after editing', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'edit-bad-json',
      description: 'will become invalid',
      agents: { agents: {} },
    })

    const scriptPath = join(tempDir, 'write-invalid-json.sh')
    await writeFile(scriptPath, '#!/bin/sh\nprintf "not valid json" > "$1"\n')
    const { chmodSync } = await import('node:fs')
    chmodSync(scriptPath, 0o755)

    process.env.EDITOR = `/bin/sh ${scriptPath}`

    await assert.rejects(
      () => profileCmd.profileEditCommand('edit-bad-json'),
      /Invalid JSON/,
    )
  })
})

describe('profile export command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileExportCommand(null, {}),
      /Missing profile name/,
    )
  })

  it('throws for missing profile', async () => {
    await assert.rejects(
      () => profileCmd.profileExportCommand('not-here', {}),
      /not found/,
    )
  })

  it('exports profile as JSON to stdout', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'export-test',
      description: 'to export',
      agents: { agents: { config: { global: { model: 'gpt-4' } } } },
    })

    const logs = captureLogs()
    await profileCmd.profileExportCommand('export-test', {
      relative: false,
      filePath: null,
    })

    assert.ok(logs.some((l) => l.includes('"name": "export-test"')))
    assert.ok(logs.some((l) => l.includes('"agents"')))
  })

  it('exports to file with --file option', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'file-export',
      agents: { agents: {} },
    })

    const exportPath = join(tempDir, 'exports', 'my-profile.json')
    await profileCmd.profileExportCommand('file-export', {
      relative: false,
      filePath: exportPath,
    })

    const exported = JSON.parse(await readFile(exportPath, 'utf-8'))
    assert.equal(exported.name, 'file-export')
  })

  it('strips metadata on export', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'clean-export',
      description: 'test',
      createdAt: '2026-01-01',
      updatedAt: '2026-06-01',
      version: 2,
      agents: { agents: {} },
    })

    const exportPath = join(tempDir, 'exports', 'clean.json')
    await profileCmd.profileExportCommand('clean-export', {
      relative: false,
      filePath: exportPath,
    })

    const exported = JSON.parse(await readFile(exportPath, 'utf-8'))
    assert.equal(exported.name, 'clean-export')
    assert.equal(exported.createdAt, undefined)
    assert.equal(exported.updatedAt, undefined)
    assert.equal(exported.version, undefined)
  })
})

describe('profile import command', () => {
  it('throws if no source given', async () => {
    await assert.rejects(
      () => profileCmd.profileImportCommand(null),
      /Missing source path/,
    )
  })

  it('imports from a local JSON file', async () => {
    const importFile = join(tempDir, 'imports', 'imported-profile.json')
    await mkdir(dirname(importFile), { recursive: true })
    await writeFile(
      importFile,
      JSON.stringify({
        name: 'imported',
        agents: { agents: { config: { global: { model: 'gpt-4' } } } },
      }),
    )

    const logs = captureLogs()
    await profileCmd.profileImportCommand(importFile)

    assert.ok(logs.some((l) => l.includes('imported')))

    const data = await (await import('../utils/profile.js')).readProfile(
      'imported',
    )
    assert.ok(data)
    assert.equal(data.name, 'imported')
  })

  it('assigns name from filename when missing', async () => {
    const importFile = join(tempDir, 'imports', 'nameless.json')
    await mkdir(dirname(importFile), { recursive: true })
    await writeFile(
      importFile,
      JSON.stringify({
        agents: { agents: {} },
      }),
    )

    const logs = captureLogs()
    await profileCmd.profileImportCommand(importFile)

    assert.ok(logs.some((l) => l.includes('nameless')))
  })

  it('throws on invalid JSON', async () => {
    const importFile = join(tempDir, 'imports', 'bad.json')
    await mkdir(dirname(importFile), { recursive: true })
    await writeFile(importFile, 'not json')

    await assert.rejects(
      () => profileCmd.profileImportCommand(importFile),
      /Invalid JSON/,
    )
  })

  it('imports from a URL', async () => {
    const urlDir = join(tempDir, `url-import-${Date.now()}`)
    await mkdir(join(urlDir, '.agents', 'profiles'), { recursive: true })

    process.env.HOME = urlDir
    process.cwd = () => urlDir
    const freshCmd = await import('./profile.js')

    const fetchMock = mock.method(global, 'fetch', async () => ({
      ok: true,
      text: async () =>
        JSON.stringify({ name: 'url-profile', agents: { agents: {} } }),
    }))

    const logs = captureLogs()
    await freshCmd.profileImportCommand('https://example.com/test-profile.json')

    assert.ok(logs.some((l) => l.includes('url-profile')))
    fetchMock.mock.restore()

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })

  it('does not show diff hint when no agents detected', async () => {
    const logDir = join(tempDir, 'import-noagents')
    await mkdir(join(logDir, '.agents', 'profiles'), { recursive: true })

    process.env.HOME = logDir
    process.cwd = () => logDir
    const freshCmd = await import('./profile.js')

    const importFile = join(logDir, 'noagent-import.json')
    await writeFile(
      importFile,
      JSON.stringify({ name: 'noagent', agents: { agents: {} } }),
    )

    const logs = captureLogs()
    await freshCmd.profileImportCommand(importFile)

    assert.ok(logs.some((l) => l.includes('noagent')))
    assert.equal(
      logs.some((l) => l.includes('diff')),
      false,
    )

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })

  it('shows diff hint when current agents have config', async () => {
    const hintDir = join(tempDir, 'import-hint')
    await mkdir(join(hintDir, '.agents', 'profiles'), { recursive: true })
    await mkdir(join(hintDir, '.agents', 'skills'), { recursive: true })
    await writeFile(
      join(hintDir, '.opencode.json'),
      JSON.stringify({ model: 'gpt-4' }),
    )

    process.env.HOME = hintDir
    process.cwd = () => hintDir
    const freshCmd = await import('./profile.js')

    const importFile = join(hintDir, 'hint-import.json')
    await writeFile(
      importFile,
      JSON.stringify({
        name: 'hint-profile',
        agents: { agents: { config: { global: { model: 'gpt-4' } } } },
      }),
    )

    const logs = captureLogs()
    await freshCmd.profileImportCommand(importFile)

    assert.ok(logs.some((l) => l.includes('hint-profile')))
    assert.ok(logs.some((l) => l.includes('diff')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })
})

describe('profile link command', () => {
  after(async () => {
    const linkPath = join(process.cwd(), '.agent-profile.json')
    try {
      unlinkSync(linkPath)
    } catch {}
  })

  it('shows no link message when no link exists', async () => {
    const logs = captureLogs()
    await profileCmd.profileLinkCommand(undefined, { unlink: false })
    assert.ok(logs.some((l) => l.includes('No profile linked')))
  })

  it('creates a link to a profile', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'linkable', agents: {} })

    const logs = captureLogs()
    await profileCmd.profileLinkCommand('linkable', { unlink: false })

    assert.ok(logs.some((l) => l.includes('linkable')))

    const linkPath = join(process.cwd(), '.agent-profile.json')
    assert.ok(existsSync(linkPath))

    const link = JSON.parse(await readFile(linkPath, 'utf-8'))
    assert.equal(link.profile, 'linkable')
  })

  it('shows linked profile info', async () => {
    const logs = captureLogs()
    await profileCmd.profileLinkCommand(undefined, { unlink: false })

    assert.ok(logs.some((l) => l.includes('linkable')))
  })

  it('unlinks a profile', async () => {
    const logs = captureLogs()
    await profileCmd.profileLinkCommand(undefined, { unlink: true })

    assert.ok(logs.some((l) => l.includes('removed')))

    const linkPath = join(process.cwd(), '.agent-profile.json')
    assert.equal(existsSync(linkPath), false)
  })

  it('throws for non-existent profile when linking', async () => {
    await assert.rejects(
      () => profileCmd.profileLinkCommand('not-here', { unlink: false }),
      /not found/,
    )
  })

  it('shows unlink message when no link exists', async () => {
    const logs = captureLogs()
    await profileCmd.profileLinkCommand(undefined, { unlink: true })
    assert.ok(logs.some((l) => l.includes('No project link')))
  })

  it('shows invalid message for corrupted link file', async () => {
    const linkPath = join(process.cwd(), '.agent-profile.json')
    writeFileSync(linkPath, 'not valid json', 'utf-8')

    const logs = captureLogs()
    await profileCmd.profileLinkCommand(undefined, { unlink: false })
    assert.ok(logs.some((l) => l.includes('Link file is invalid')))

    unlinkSync(linkPath)
  })

  it('shows invalid message for link file without profile field', async () => {
    const linkPath = join(process.cwd(), '.agent-profile.json')
    writeFileSync(linkPath, JSON.stringify({ projectDir: '/tmp' }), 'utf-8')

    const logs = captureLogs()
    await profileCmd.profileLinkCommand(undefined, { unlink: false })
    assert.ok(logs.some((l) => l.includes('Link file is invalid')))

    unlinkSync(linkPath)
  })
})

describe('profile edge cases', () => {
  it('save with no agents shows empty message', async () => {
    const logDir = join(tempDir, 'edge-no-agents')
    await mkdir(join(logDir, '.agents', 'profiles'), { recursive: true })

    process.env.HOME = logDir
    process.cwd = () => logDir
    const freshCmd = await import('./profile.js')

    const logs = captureLogs()
    await freshCmd.profileSaveCommand('empty-profile', { targets: [] })
    assert.ok(logs.some((l) => l.includes('No agent configurations')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })

  it('diff with empty agents shows message', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'empty-agents', agents: {} })

    const logs = captureLogs()
    await profileCmd.profileDiffCommand('empty-agents')

    assert.ok(logs.some((l) => l.includes('has no agent data')))
  })

  it('export with --relative handles paths', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'rel-export',
      description: 'relative test',
      agents: {
        agents: {
          config: { global: { model: 'gpt-4' } },
          instructions: [
            {
              file: '/absolute/path/to/rules.md',
              contentSha: null,
              scope: 'global',
            },
          ],
        },
      },
    })

    const exportPath = join(tempDir, 'exports', 'relative.json')
    await mkdir(dirname(exportPath), { recursive: true })
    await profileCmd.profileExportCommand('rel-export', {
      relative: true,
      filePath: exportPath,
    })

    const exported = JSON.parse(await readFile(exportPath, 'utf-8'))
    const instr = exported.agents.agents.instructions[0]
    assert.ok(instr.file.startsWith('..') || !instr.file.startsWith('/'))
  })

  it('import from non-existent file throws', async () => {
    await assert.rejects(
      () => profileCmd.profileImportCommand('/nonexistent/path/file.json'),
      /ENOENT/,
    )
  })

  it('export to non-existent directory creates it', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'deep-export', agents: {} })

    const deepPath = join(tempDir, 'deep', 'nested', 'dir', 'profile.json')
    await profileCmd.profileExportCommand('deep-export', {
      relative: false,
      filePath: deepPath,
    })

    assert.ok(existsSync(deepPath))
  })
})
