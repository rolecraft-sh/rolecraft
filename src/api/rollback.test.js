import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const slug = 'test-rollback'
const backupContent = {
  'SKILL.md': '# Rolled back skill\n',
  'rules.json': '{"key": "old"}',
}

let tempDir, rollbackModule, origHome, origCwd

async function setupLockfile(skills) {
  const lockPath = join(tempDir, '.agents', '.skill-lock.json')
  await writeFile(
    lockPath,
    `${JSON.stringify(
      { version: 3, skills, dismissed: {}, lastSelectedAgents: [] },
      null,
      2,
    )}\n`,
  )
}

function normalizeSlug(s) {
  return s.replace(/\//g, '-')
}

async function setupBackup(slug, content, subdir) {
  const backupDir = join(tempDir, '.agents', '.backups', normalizeSlug(slug))
  await mkdir(backupDir, { recursive: true })
  const ts = subdir || new Date().toISOString().replace(/[:.]/g, '-')
  await writeFile(
    join(backupDir, `${ts}.json`),
    JSON.stringify(content, null, 2),
  )
  return ts
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-rollback-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir
  origCwd = process.cwd
  rollbackModule = await import('./rollback.js')
  await mkdir(join(tempDir, '.agents'), { recursive: true })
})

after(async () => {
  process.env.HOME = origHome
  process.cwd = origCwd
  await rm(tempDir, { recursive: true, force: true }).catch(() => {})
})

describe('apiRollback', () => {
  it('throws when skill is not installed', async () => {
    await assert.rejects(
      () => rollbackModule.apiRollback('nonexistent'),
      /not installed/,
    )
  })

  it('throws when no rollback history exists', async () => {
    await setupLockfile({
      [slug]: {
        slug,
        contentSha: 'abc123',
        agents: ['cursor'],
        installedAt: new Date().toISOString(),
      },
    })
    await assert.rejects(
      () => rollbackModule.apiRollback(slug),
      /No rollback history/,
    )
  })

  it('returns history when --list is used', async () => {
    // Set up with history
    await setupLockfile({
      [slug]: {
        slug,
        contentSha: 'current-version',
        agents: ['cursor', 'claude'],
        installedAt: new Date().toISOString(),
        history: [
          {
            contentSha: 'old-version',
            fileHashes: { 'SKILL.md': 'old-hash' },
            installedAt: '2026-07-01T00:00:00.000Z',
          },
        ],
      },
    })

    const result = await rollbackModule.apiRollback(slug, { list: true })
    assert.equal(result.slug, slug)
    assert.ok(
      result.currentVersion.startsWith('current-'),
      'currentVersion should be a truncation of contentSha',
    )
    assert.equal(result.history.length, 1)
    assert.equal(result.history[0].contentSha, 'old-version')
  })

  it('throws when no backup files exist', async () => {
    // History exists but no backup on disk
    await setupLockfile({
      [slug]: {
        slug,
        contentSha: 'current',
        agents: ['cursor'],
        installedAt: new Date().toISOString(),
        history: [
          {
            contentSha: 'prev',
            fileHashes: {},
            installedAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      },
    })

    await assert.rejects(
      () => rollbackModule.apiRollback(slug),
      /No backup files found/,
    )
  })

  it('dry-run previews rollback without restoring', async () => {
    await setupBackup(slug, backupContent, 'backup-001')

    const result = await rollbackModule.apiRollback(slug, { dryRun: true })
    assert.ok(result.dryRun)
    assert.equal(result.slug, slug)
    assert.ok(result.files.includes('SKILL.md'))
    assert.ok(result.targets.includes('cursor'))
  })

  it('restores files from the most recent backup', async () => {
    // Set up a fresh skill with history + backup
    const freshSlug = 'fresh-rollback'
    const agentDir = join(tempDir, '.cursor', 'skills', 'fresh-rollback')
    await mkdir(agentDir, { recursive: true })
    await writeFile(join(agentDir, 'SKILL.md'), 'old content')
    await writeFile(join(agentDir, 'rules.json'), '{"old": true}')

    // Create lockfile entry with history
    await setupLockfile({
      [freshSlug]: {
        slug: freshSlug,
        contentSha: 'current',
        agents: ['cursor'],
        installedAt: new Date().toISOString(),
        history: [
          {
            contentSha: 'prev',
            fileHashes: { 'SKILL.md': 'old-hash', 'rules.json': 'old-hash' },
            installedAt: '2026-07-01T00:00:00.000Z',
          },
        ],
      },
    })

    // Create backup file
    await setupBackup(
      freshSlug,
      { 'SKILL.md': 'restored content', 'rules.json': '{"old": true}' },
      'backup-001',
    )

    const result = await rollbackModule.apiRollback(freshSlug)
    assert.equal(result.slug, freshSlug)
    assert.ok(result.files.includes('SKILL.md'))
    assert.ok(result.files.includes('rules.json'))
    assert.equal(result.targets.length, 1)
    assert.equal(result.targets[0].target, 'cursor')

    // Verify files were actually restored
    const restoredSkill = await readFile(join(agentDir, 'SKILL.md'), 'utf-8')
    assert.equal(restoredSkill, 'restored content')
  })
})
