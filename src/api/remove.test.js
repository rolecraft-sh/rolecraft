import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { apiRemove } from './remove.js'

let tempDir, origHome

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-remove-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  await mkdir(join(tempDir, '.agents', 'skills'), { recursive: true })
  await writeFile(
    join(tempDir, '.agents', '.skill-lock.json'),
    JSON.stringify({
      version: 3,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    }),
  )
})

after(async () => {
  process.env.HOME = origHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('api remove', () => {
  it('throws when skill not found', async () => {
    await assert.rejects(apiRemove('nonexistent', tempDir), /not found/)
  })

  it('shows dryRun plan', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/dry-remove': { installedAt: new Date().toISOString() },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )
    await mkdir(join(tempDir, '.agents', 'skills', 'test-dry-remove'), {
      recursive: true,
    })

    const result = await apiRemove('test/dry-remove', tempDir, { dryRun: true })

    assert.equal(result.dryRun, true)
    assert.equal(result.slug, 'test/dry-remove')
    assert.ok(result.dirs.length >= 1)
  })

  it('removes a skill by exact slug', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/exact': { installedAt: new Date().toISOString() },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )
    await mkdir(join(tempDir, '.agents', 'skills', 'test-exact'), {
      recursive: true,
    })

    const result = await apiRemove('test/exact', tempDir)
    assert.equal(result.slug, 'test/exact')
    assert.ok(result.removed.length >= 1)
  })

  it('removes a skill from a recorded per-agent target', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/per-agent': { agents: ['pi'] },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )
    const skillDir = join(tempDir, '.pi', 'agent', 'skills', 'test-per-agent')
    await mkdir(skillDir, { recursive: true })

    const result = await apiRemove('test/per-agent', tempDir)

    assert.equal(existsSync(skillDir), false)
    assert.deepEqual(result.removed, [{ scope: 'global', path: skillDir }])
  })

  it('removes a skill from every recorded agent target', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/multi-agent': { agents: ['claude', 'omp'] },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )
    const claudeDir = join(tempDir, '.claude', 'skills', 'test-multi-agent')
    const ompDir = join(tempDir, '.omp', 'agent', 'skills', 'test-multi-agent')
    await mkdir(claudeDir, { recursive: true })
    await mkdir(ompDir, { recursive: true })

    const result = await apiRemove('test/multi-agent', tempDir)

    assert.equal(existsSync(claudeDir), false)
    assert.equal(existsSync(ompDir), false)
    assert.deepEqual(result.removed, [
      { scope: 'global', path: claudeDir },
      { scope: 'global', path: ompDir },
    ])
  })

  it('deduplicates shared agent directories in dry-run output', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/shared-dir': { agents: ['codex', 'warp', 'pi'] },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )
    const sharedDir = join(tempDir, '.agents', 'skills', 'test-shared-dir')
    const piDir = join(tempDir, '.pi', 'agent', 'skills', 'test-shared-dir')
    await mkdir(sharedDir, { recursive: true })
    await mkdir(piDir, { recursive: true })

    const result = await apiRemove('test/shared-dir', tempDir, { dryRun: true })

    assert.deepEqual(result.dirs, [
      { scope: 'global', path: sharedDir },
      { scope: 'global', path: piDir },
    ])
    assert.equal(existsSync(sharedDir), true)
    assert.equal(existsSync(piDir), true)
  })

  it('supports agent names written by current installer versions', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/agent-name': { agents: ['oh-my-pi'] },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )
    const skillDir = join(tempDir, '.omp', 'agent', 'skills', 'test-agent-name')
    await mkdir(skillDir, { recursive: true })

    await apiRemove('test/agent-name', tempDir)

    assert.equal(existsSync(skillDir), false)
  })

  it('resolves project-relative agents against the given cwd', async () => {
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/proj-agent': { agents: ['devin'] },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )
    const skillDir = join(tempDir, '.devin', 'skills', 'test-proj-agent')
    await mkdir(skillDir, { recursive: true })

    const result = await apiRemove('test/proj-agent', tempDir)

    assert.equal(existsSync(skillDir), false)
    assert.deepEqual(result.removed, [{ scope: 'global', path: skillDir }])
  })
})
