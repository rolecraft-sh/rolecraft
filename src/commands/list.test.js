import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, listModule, projectDir, origHome

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-list-test-'))
  projectDir = join(tempDir, 'some-project')
  origHome = process.env.HOME
  process.env.HOME = tempDir
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  await mkdir(join(projectDir, '.agents'), { recursive: true })
  listModule = await import('./list.js')
})

after(async () => {
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

describe('list command', () => {
  it('shows no skills message when lock is empty', async () => {
    const logs = captureLogs()

    await listModule.listCommand()

    assert.ok(logs.some(l => l.includes('No skills installed')))
  })

  it('lists installed skills with details', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
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
    }))

    const logs = captureLogs()

    await listModule.listCommand()

    assert.ok(logs.some(l => l.includes('test/skill')))
    assert.ok(logs.some(l => l.includes('Source: owner/repo')))
    assert.ok(logs.some(l => l.includes('Type: github')))
    assert.ok(logs.some(l => l.includes('1 skill(s)')))
  })

  it('handles skill without optional fields', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: { 'minimal/skill': { installedAt: '2025-01-01T00:00:00.000Z' } },
      dismissed: {},
      lastSelectedAgents: [],
    }))

    const logs = captureLogs()

    await listModule.listCommand()

    assert.ok(logs.some(l => l.includes('minimal/skill')))
    assert.ok(logs.some(l => l.includes('1 skill(s)')))
  })

  it('handles skill with unknown installedAt', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: { 'nodate/skill': {} },
      dismissed: {},
      lastSelectedAgents: [],
    }))

    const logs = captureLogs()

    await listModule.listCommand()

    assert.ok(logs.some(l => l.includes('nodate/skill')))
  })

  it('merges project-scoped skills when cwd is given', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: { 'global/only': { installedAt: '2025-01-01T00:00:00.000Z' } },
      dismissed: {},
      lastSelectedAgents: [],
    }))

    await writeFile(join(projectDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: { 'project/only': { installedAt: '2025-06-01T00:00:00.000Z' } },
      dismissed: {},
      lastSelectedAgents: [],
    }))

    const logs = captureLogs()

    await listModule.listCommand(projectDir)

    assert.ok(logs.some(l => l.includes('global/only')), 'should show global skill')
    assert.ok(logs.some(l => l.includes('project/only')), 'should show project skill')
    assert.ok(logs.some(l => l.includes('2 skill(s)')))
  })

  it('shows scope as project for skills only in project lock', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [],
    }))

    await writeFile(join(projectDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: { 'proj/skill': { installedAt: '2025-06-01T00:00:00.000Z' } },
      dismissed: {},
      lastSelectedAgents: [],
    }))

    const logs = captureLogs()

    await listModule.listCommand(projectDir)

    assert.ok(logs.some(l => l.includes('Scope: project')))
  })

  it('shows scope as global, project when skill exists in both', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: { 'shared/skill': { installedAt: '2025-01-01T00:00:00.000Z' } },
      dismissed: {},
      lastSelectedAgents: [],
    }))

    await writeFile(join(projectDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: { 'shared/skill': { installedAt: '2025-06-01T00:00:00.000Z' } },
      dismissed: {},
      lastSelectedAgents: [],
    }))

    const logs = captureLogs()

    await listModule.listCommand(projectDir)

    assert.ok(logs.some(l => l.includes('Scope: global, project')))
  })
})
