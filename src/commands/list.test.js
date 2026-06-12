import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, listModule

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-list-test-'))
  process.env.HOME = tempDir
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  listModule = await import('./list.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
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
})
