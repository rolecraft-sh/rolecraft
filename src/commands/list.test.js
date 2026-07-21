import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, listModule, projectDir, origHome, origUserProfile

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-list-test-'))
  projectDir = join(tempDir, 'some-project')
  origHome = process.env.HOME
  origUserProfile = process.env.USERPROFILE
  process.env.HOME = tempDir
  process.env.USERPROFILE = tempDir
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  await mkdir(join(projectDir, '.agents'), { recursive: true })
  listModule = await import('./list.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
  process.env.HOME = origHome
  process.env.USERPROFILE = origUserProfile
})

function captureLogs() {
  const logs = []
  mock.method(console, 'log', (...args) => {
    if (args.length) logs.push(String(args[0]))
  })
  return logs
}

describe('list command', () => {
  it('shows no skills message when lock is empty', async () => {
    const logs = captureLogs()

    await listModule.listCommand()

    assert.ok(logs.some(l => l.includes('No skills installed')))
  })

  it('outputs JSON when json option is enabled', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/skill': {
            installedAt: '2025-01-15T10:00:00.000Z',
            source: 'owner/repo',
            sourceType: 'github',
            agents: ['cursor', 'claude'],
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      })
    )

    const logs = captureLogs()

    await listModule.listCommand(undefined, { json: true })

    const output = JSON.parse(logs.join('\n'))

    assert.equal(output.total, 1)
    assert.ok(output.skills['test/skill'])
    assert.equal(output.skills['test/skill'].scope, 'global')
    assert.equal(output.skills['test/skill'].source, 'owner/repo')
    assert.equal(output.skills['test/skill'].sourceType, 'github')
    assert.deepEqual(output.skills['test/skill'].agents, ['cursor', 'claude'])
  })

  it('filters installed skills by agent case-insensitively', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'cursor/skill': { agents: ['cursor'] },
          'shared/skill': { agents: ['Cursor', 'claude-code'] },
          'claude/skill': { agents: ['claude-code'] },
        },
        dismissed: {},
        lastSelectedAgents: [],
      })
    )

    const logs = captureLogs()

    await listModule.listCommand(undefined, { agent: 'CURSOR' })

    assert.ok(logs.some(l => l.includes('Installed skills for cursor')))
    assert.ok(logs.some(l => l.includes('cursor/skill')))
    assert.ok(logs.some(l => l.includes('shared/skill')))
    assert.ok(logs.every(l => !l.includes('claude/skill')))
    assert.ok(logs.some(l => l.includes('2 skill(s) total for cursor')))
  })

  it('shows an agent-specific message when no skills match', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'cursor/skill': { agents: ['cursor'] },
        },
        dismissed: {},
        lastSelectedAgents: [],
      })
    )

    const logs = captureLogs()

    await listModule.listCommand(undefined, { agent: 'nonexistent' })

    assert.deepEqual(logs, ['No skills installed for nonexistent.'])
  })

  it('lists installed skills with details', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/skill': {
            installedAt: '2025-01-15T10:00:00.000Z',
            source: 'owner/repo',
            sourceType: 'github',
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      })
    )

    const logs = captureLogs()

    await listModule.listCommand()

    assert.ok(logs.some(l => l.includes('test/skill')))
    assert.ok(logs.some(l => l.includes('Source: owner/repo')))
    assert.ok(logs.some(l => l.includes('Type: github')))
    assert.ok(logs.some(l => l.includes('1 skill(s)')))
  })

  it('handles skill without optional fields', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'minimal/skill': {
            installedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      })
    )

    const logs = captureLogs()

    await listModule.listCommand()

    assert.ok(logs.some(l => l.includes('minimal/skill')))
    assert.ok(logs.some(l => l.includes('1 skill(s)')))
  })

  it('handles skill with unknown installedAt', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'nodate/skill': {},
        },
        dismissed: {},
        lastSelectedAgents: [],
      })
    )

    const logs = captureLogs()

    await listModule.listCommand()

    assert.ok(logs.some(l => l.includes('nodate/skill')))
  })

  it('merges project-scoped skills when cwd is given', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'global/only': {
            installedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      })
    )

    await writeFile(
      join(projectDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'project/only': {
            installedAt: '2025-06-01T00:00:00.000Z',
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      })
    )

    const logs = captureLogs()

    await listModule.listCommand(projectDir)

    assert.ok(logs.some(l => l.includes('global/only')))
    assert.ok(logs.some(l => l.includes('project/only')))
    assert.ok(logs.some(l => l.includes('2 skill(s)')))
  })

  it('shows scope as project for skills only in project lock', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {},
        dismissed: {},
        lastSelectedAgents: [],
      })
    )

    await writeFile(
      join(projectDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'proj/skill': {
            installedAt: '2025-06-01T00:00:00.000Z',
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      })
    )

    const logs = captureLogs()

    await listModule.listCommand(projectDir)

    assert.ok(logs.some(l => l.includes('Scope: project')))
  })

  it('shows scope as global, project when skill exists in both', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'shared/skill': {
            installedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      })
    )

    await writeFile(
      join(projectDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'shared/skill': {
            installedAt: '2025-06-01T00:00:00.000Z',
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      })
    )

    const logs = captureLogs()

    await listModule.listCommand(projectDir)

    assert.ok(logs.some(l => l.includes('Scope: global, project')))
  })
})
