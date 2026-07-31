import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, removeModule, origHome

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-remove-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir

  await mkdir(join(tempDir, '.agents', 'skills', 'test-skill'), {
    recursive: true,
  })

  const lockPath = join(tempDir, '.agents', '.skill-lock.json')
  await writeFile(
    lockPath,
    JSON.stringify({
      version: 3,
      skills: {
        'test/skill': { name: 'Test Skill' },
        'other/skill': { name: 'Other Skill' },
        'exact/skill': { name: 'Exact Skill' },
      },
      dismissed: {},
      lastSelectedAgents: [],
    }),
  )

  removeModule = await import('./remove.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
  process.env.HOME = origHome
})

describe('remove command', () => {
  it('dry-run shows plan without removing', async () => {
    const logs = []
    mock.method(console, 'log', (...args) => {
      if (args.length) logs.push(String(args[0]))
    })

    await removeModule.removeCommand('test/skill', { dryRun: true })

    assert.ok(logs.some((l) => l.includes('[dry-run]')))
    assert.ok(logs.some((l) => l.includes('test/skill')))
  })

  it('removes an installed skill by exact slug from global', async () => {
    const logs = []
    mock.method(console, 'log', (...args) => {
      if (args.length) logs.push(String(args[0]))
    })

    await removeModule.removeCommand('exact/skill')

    const lock = JSON.parse(
      await readFile(join(tempDir, '.agents', '.skill-lock.json'), 'utf-8'),
    )
    assert.ok(!lock.skills['exact/skill'])
    assert.ok(logs.some((l) => l.includes('Removed')))
  })

  it('removes from project lock when skill is project-scoped', async () => {
    const origCwd = process.cwd
    process.cwd = () => tempDir

    const logs = []
    mock.method(console, 'log', (...args) => {
      if (args.length) logs.push(String(args[0]))
    })

    await removeModule.removeCommand('test/skill')

    const globalLock = JSON.parse(
      await readFile(join(tempDir, '.agents', '.skill-lock.json'), 'utf-8'),
    )
    assert.ok(!globalLock.skills['test/skill'])
    assert.ok(logs.some((l) => l.includes('Removed')))
    process.cwd = origCwd
  })

  it('matches via normalized slug (replacing / with -)', async () => {
    mkdirSync(join(tempDir, '.agents', 'skills', 'other-skill'), {
      recursive: true,
    })

    const logs = []
    mock.method(console, 'log', (...args) => {
      if (args.length) logs.push(String(args[0]))
    })

    await removeModule.removeCommand('other-skill')

    const lock = JSON.parse(
      await readFile(join(tempDir, '.agents', '.skill-lock.json'), 'utf-8'),
    )
    assert.ok(!lock.skills['other/skill'])
    assert.ok(logs.some((l) => l.includes('Removed')))
  })

  it('exits with error when skill not found', async () => {
    await assert.rejects(
      () => removeModule.removeCommand('nonexistent'),
      /not found/,
    )
  })
})
