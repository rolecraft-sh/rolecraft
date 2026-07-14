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
  writeFileSync(editHelperPath, `
const fs = require('fs')
const p = process.argv[2]
const d = JSON.parse(fs.readFileSync(p, 'utf8'))
d.description = 'edited via editor'
fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\\n', 'utf8')
`)

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
    assert.ok(logs.some(l => l.includes('rolecraft profile')))
    assert.ok(logs.some(l => l.includes('save')))
    assert.ok(logs.some(l => l.includes('apply')))
  })

  it('shows usage for -h', async () => {
    const logs = captureLogs()
    await profileCmd.profileCommand(['-h'])
    assert.ok(logs.some(l => l.includes('rolecraft profile')))
    assert.ok(logs.some(l => l.includes('save')))
  })

  it('shows usage for no args', async () => {
    const logs = captureLogs()
    await profileCmd.profileCommand([])
    assert.ok(logs.some(l => l.includes('rolecraft profile')))
    assert.ok(logs.some(l => l.includes('save')))
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

describe('profile apply command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileApplyCommand(null, {}),
      /Missing profile name/
    )
  })

  it('throws for missing profile', async () => {
    await assert.rejects(
      () => profileCmd.profileApplyCommand('not-here', {}),
      /not found/
    )
  })

  it('shows dry-run plan', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'apply-dry',
      agents: { agents: { config: { global: { model: 'gpt-4' } } } },
    })

    const logs = captureLogs()
    await profileCmd.profileApplyCommand('apply-dry', { dryRun: true, targets: [], skipMcp: false, skipSkills: false })
    assert.ok(logs.some(l => l.includes('Would apply profile')))
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
    await profileCmd.profileApplyCommand('apply-full', { dryRun: false, targets: [], skipMcp: true, skipSkills: true })

    assert.ok(logs.some(l => l.includes('Applied profile')))
    assert.ok(logs.some(l => l.includes('agents')))
  })

})

describe('profile diff command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileDiffCommand(null),
      /Missing profile name/
    )
  })

  it('throws for missing profile', async () => {
    await assert.rejects(
      () => profileCmd.profileDiffCommand('not-here'),
      /not found/
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

    assert.ok(logs.some(l => l.includes('diff-test')))
    assert.ok(logs.some(l => l.includes('skills differ')))
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
          instructions: [{ file: opencodeConfig, contentSha: null, scope: 'global' }],
        },
      },
    })

    const logs = captureLogs()
    await freshCmd.profileDiffCommand('diff-match-prof')

    assert.ok(logs.some(l => l.includes('no differences')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })
})

describe('profile edit command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileEditCommand(null),
      /Missing profile name/
    )
  })

  it('throws for missing profile', async () => {
    await assert.rejects(
      () => profileCmd.profileEditCommand('not-here'),
      /not found/
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

    assert.ok(logs.some(l => l.includes('updated')))

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

    assert.ok(logs.some(l => l.includes('updated')))

    const updated = await readProfile('edit-nochange')
    assert.equal(updated.description, 'same')
  })
})

describe('profile export command', () => {
  it('throws if no name given', async () => {
    await assert.rejects(
      () => profileCmd.profileExportCommand(null, {}),
      /Missing profile name/
    )
  })

  it('throws for missing profile', async () => {
    await assert.rejects(
      () => profileCmd.profileExportCommand('not-here', {}),
      /not found/
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
    await profileCmd.profileExportCommand('export-test', { relative: false, filePath: null })

    assert.ok(logs.some(l => l.includes('"name": "export-test"')))
    assert.ok(logs.some(l => l.includes('"agents"')))
  })

  it('exports to file with --file option', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'file-export',
      agents: { agents: {} },
    })

    const exportPath = join(tempDir, 'exports', 'my-profile.json')
    await profileCmd.profileExportCommand('file-export', { relative: false, filePath: exportPath })

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
    await profileCmd.profileExportCommand('clean-export', { relative: false, filePath: exportPath })

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
      /Missing source path/
    )
  })

  it('imports from a local JSON file', async () => {
    const importFile = join(tempDir, 'imports', 'imported-profile.json')
    await mkdir(dirname(importFile), { recursive: true })
    await writeFile(importFile, JSON.stringify({
      name: 'imported',
      agents: { agents: { config: { global: { model: 'gpt-4' } } } },
    }))

    const logs = captureLogs()
    await profileCmd.profileImportCommand(importFile)

    assert.ok(logs.some(l => l.includes('imported')))

    const data = await (await import('../utils/profile.js')).readProfile('imported')
    assert.ok(data)
    assert.equal(data.name, 'imported')
  })

  it('assigns name from filename when missing', async () => {
    const importFile = join(tempDir, 'imports', 'nameless.json')
    await mkdir(dirname(importFile), { recursive: true })
    await writeFile(importFile, JSON.stringify({
      agents: { agents: {} },
    }))

    const logs = captureLogs()
    await profileCmd.profileImportCommand(importFile)

    assert.ok(logs.some(l => l.includes('nameless')))
  })

  it('throws on invalid JSON', async () => {
    const importFile = join(tempDir, 'imports', 'bad.json')
    await mkdir(dirname(importFile), { recursive: true })
    await writeFile(importFile, 'not json')

    await assert.rejects(
      () => profileCmd.profileImportCommand(importFile),
      /Invalid JSON/
    )
  })
})

describe('profile link command', () => {
  after(async () => {
    const linkPath = join(process.cwd(), '.agent-profile.json')
    try { unlinkSync(linkPath) } catch {}
  })

  it('shows no link message when no link exists', async () => {
    const logs = captureLogs()
    await profileCmd.profileLinkCommand(undefined, { unlink: false })
    assert.ok(logs.some(l => l.includes('No profile linked')))
  })

  it('creates a link to a profile', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'linkable', agents: {} })

    const logs = captureLogs()
    await profileCmd.profileLinkCommand('linkable', { unlink: false })

    assert.ok(logs.some(l => l.includes('linkable')))

    const linkPath = join(process.cwd(), '.agent-profile.json')
    assert.ok(existsSync(linkPath))

    const link = JSON.parse(await readFile(linkPath, 'utf-8'))
    assert.equal(link.profile, 'linkable')
  })

  it('shows linked profile info', async () => {
    const logs = captureLogs()
    await profileCmd.profileLinkCommand(undefined, { unlink: false })

    assert.ok(logs.some(l => l.includes('linkable')))
  })

  it('unlinks a profile', async () => {
    const logs = captureLogs()
    await profileCmd.profileLinkCommand(undefined, { unlink: true })

    assert.ok(logs.some(l => l.includes('removed')))

    const linkPath = join(process.cwd(), '.agent-profile.json')
    assert.equal(existsSync(linkPath), false)
  })

  it('throws for non-existent profile when linking', async () => {
    await assert.rejects(
      () => profileCmd.profileLinkCommand('not-here', { unlink: false }),
      /not found/
    )
  })

  it('shows unlink message when no link exists', async () => {
    const logs = captureLogs()
    await profileCmd.profileLinkCommand(undefined, { unlink: true })
    assert.ok(logs.some(l => l.includes('No project link')))
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
    assert.ok(logs.some(l => l.includes('No agent configurations')))

    process.env.HOME = tempDir
    process.cwd = () => join(tempDir, 'project')
  })

  it('diff with empty agents shows message', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'empty-agents', agents: {} })

    const logs = captureLogs()
    await profileCmd.profileDiffCommand('empty-agents')

    assert.ok(logs.some(l => l.includes('has no agent data')))
  })

  it('export with --relative handles paths', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({
      name: 'rel-export',
      description: 'relative test',
      agents: {
        agents: {
          config: { global: { model: 'gpt-4' } },
          instructions: [{ file: '/absolute/path/to/rules.md', contentSha: null, scope: 'global' }],
        },
      },
    })

    const exportPath = join(tempDir, 'exports', 'relative.json')
    await mkdir(dirname(exportPath), { recursive: true })
    await profileCmd.profileExportCommand('rel-export', { relative: true, filePath: exportPath })

    const exported = JSON.parse(await readFile(exportPath, 'utf-8'))
    const instr = exported.agents.agents.instructions[0]
    assert.ok(instr.file.startsWith('..') || !instr.file.startsWith('/'))
  })

  it('import from non-existent file throws', async () => {
    await assert.rejects(
      () => profileCmd.profileImportCommand('/nonexistent/path/file.json'),
      /ENOENT/
    )
  })

  it('export to non-existent directory creates it', async () => {
    const { writeProfile } = await import('../utils/profile.js')
    await writeProfile({ name: 'deep-export', agents: {} })

    const deepPath = join(tempDir, 'deep', 'nested', 'dir', 'profile.json')
    await profileCmd.profileExportCommand('deep-export', { relative: false, filePath: deepPath })

    assert.ok(existsSync(deepPath))
  })
})
