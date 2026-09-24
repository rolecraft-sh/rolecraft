import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { UserError } from '../utils/errors.js'

let tempDir, watchModule, origHome, origCwd

async function writeLockFile(home, skills) {
  await mkdir(join(home, '.agents'), { recursive: true })
  await writeFile(
    join(home, '.agents', '.skill-lock.json'),
    JSON.stringify({
      version: 3,
      skills,
      dismissed: {},
      lastSelectedAgents: [],
    }),
  )
}

function localEntry(source) {
  return {
    name: 'Skill',
    source,
    sourceType: 'local',
    installedAt: new Date().toISOString(),
    agents: ['opencode'],
  }
}

function writeSkill(dir, slug) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${slug}\nslug: ${slug}\n---\nContent`,
  )
}

async function waitFor(events, predicate, timeoutMs = 5000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (events.some(predicate)) return true
    await new Promise((r) => setTimeout(r, 50))
  }
  return events.some(predicate)
}

async function rmRetry(path, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await rm(path, { recursive: true, force: true })
      return
    } catch (e) {
      if (e.code !== 'ENOTEMPTY' && e.code !== 'EBUSY') throw e
      await new Promise((r) => setTimeout(r, 200 * (i + 1)))
    }
  }
  await rm(path, { recursive: true, force: true })
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-watch-api-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir
  origCwd = process.cwd
  process.cwd = () => tempDir

  writeSkill(join(tempDir, 'source-local'), 'local-skill')
  await writeLockFile(tempDir, {
    'local-skill': localEntry(join(tempDir, 'source-local')),
    'remote-skill': {
      name: 'Remote Skill',
      source: 'someuser/some-repo',
      sourceType: 'github',
      installedAt: new Date().toISOString(),
      agents: ['opencode'],
    },
  })

  watchModule = await import('./watch.js')
})

after(async () => {
  process.env.HOME = origHome
  process.cwd = origCwd
  await rmRetry(tempDir)
})

describe('watchApi', () => {
  it('dry-run returns skills with source and expanded path', async () => {
    const result = await watchModule.watchApi(undefined, tempDir, {
      dryRun: true,
    })

    assert.equal(result.dryRun, true)
    assert.deepEqual(result.skills, [
      {
        slug: 'local-skill',
        source: join(tempDir, 'source-local'),
        path: join(tempDir, 'source-local'),
      },
    ])
  })

  it('throws UserError with WATCH_SKILL_NOT_FOUND for unknown slug', async () => {
    await assert.rejects(
      () => watchModule.watchApi('nonexistent', tempDir),
      (err) => {
        assert.ok(err instanceof UserError)
        assert.equal(err.userCode, 'WATCH_SKILL_NOT_FOUND')
        assert.match(err.message, /not found/)
        return true
      },
    )
  })

  it('returns empty result with installedCount 0 when nothing installed', async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'rolecraft-watch-api-empty-'))
    process.env.HOME = emptyDir
    const events = []

    try {
      const result = await watchModule.watchApi(undefined, emptyDir, {
        onEvent: (e) => events.push(e),
      })
      assert.equal(result.installedCount, 0)
      assert.deepEqual(result.skills, [])
      assert.deepEqual(result.watchers, [])
      assert.equal(typeof result.close, 'function')
      result.close()
      assert.equal(events.length, 0)
    } finally {
      process.env.HOME = tempDir
      await rmRetry(emptyDir)
    }
  })

  it('returns no skills and emits no events when none are local', async () => {
    const remoteDir = mkdtempSync(join(tmpdir(), 'rolecraft-watch-api-remote-'))
    process.env.HOME = remoteDir
    const events = []

    try {
      await writeLockFile(remoteDir, {
        'gh-skill': {
          source: 'user/repo',
          sourceType: 'github',
          agents: ['opencode'],
          installedAt: new Date().toISOString(),
        },
      })
      const result = await watchModule.watchApi(undefined, remoteDir, {
        onEvent: (e) => events.push(e),
      })
      assert.equal(result.installedCount, 1)
      assert.deepEqual(result.skills, [])
      result.close()
      assert.equal(events.length, 0)
    } finally {
      process.env.HOME = tempDir
      await rmRetry(remoteDir)
    }
  })

  it('emits start then watching for local skills', async () => {
    const events = []
    const result = await watchModule.watchApi(undefined, tempDir, {
      onEvent: (e) => events.push(e),
    })
    result.close()

    assert.deepEqual(result.skills, ['local-skill'])
    assert.equal(result.installedCount, 2)
    assert.deepEqual(
      events.map((e) => e.type),
      ['start', 'watching'],
    )
    assert.deepEqual(events[0].slugs, ['local-skill'])
    assert.equal(events[1].slug, 'local-skill')
    assert.equal(events[1].path, join(tempDir, 'source-local'))
  })

  it('emits skip for a remote slug and starts no watcher', async () => {
    const events = []
    const result = await watchModule.watchApi('remote-skill', tempDir, {
      onEvent: (e) => events.push(e),
    })
    result.close()

    assert.equal(result.watchers.length, 0)
    assert.deepEqual(
      events.map((e) => e.type),
      ['start', 'skip'],
    )
    assert.equal(events[1].sourceType, 'github')
  })

  it('works without an onEvent callback', async () => {
    const result = await watchModule.watchApi('local-skill', tempDir)
    assert.equal(result.watchers.length, 1)
    result.close()
  })

  it('emits syncing then synced ok on file change', async () => {
    const events = []
    const result = await watchModule.watchApi('local-skill', tempDir, {
      onEvent: (e) => events.push(e),
    })

    try {
      await writeFile(join(tempDir, 'source-local', 'CHANGE.md'), 'change')
      await waitFor(events, (e) => e.type === 'synced')
    } finally {
      result.close()
    }

    const syncing = events.find((e) => e.type === 'syncing')
    const synced = events.find((e) => e.type === 'synced')
    assert.ok(syncing, 'expected a syncing event')
    assert.equal(syncing.slug, 'local-skill')
    assert.ok(syncing.startedAt instanceof Date)
    assert.ok(synced, 'expected a synced event')
    assert.equal(synced.ok, true)
    assert.equal(synced.startedAt, syncing.startedAt)
  })

  it('emits synced with ok=false when reinstall fails', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rolecraft-watch-api-fail-'))
    process.env.HOME = dir
    const events = []

    try {
      writeSkill(join(dir, 'broken-source'), 'fail-skill')
      await writeLockFile(dir, {
        'fail-skill': localEntry(join(dir, 'broken-source')),
      })
      const result = await watchModule.watchApi('fail-skill', dir, {
        onEvent: (e) => events.push(e),
      })

      try {
        await rm(join(dir, 'broken-source', 'SKILL.md'), { force: true })
        await writeFile(join(dir, 'broken-source', 'OTHER.md'), 'change')
        await waitFor(events, (e) => e.type === 'synced')
      } finally {
        result.close()
      }

      const synced = events.find((e) => e.type === 'synced')
      assert.ok(synced, 'expected a synced event')
      assert.equal(synced.ok, false)
    } finally {
      process.env.HOME = tempDir
      await rmRetry(dir)
    }
  })

  it('close() is idempotent and silences pending sync events', async () => {
    const events = []
    const result = await watchModule.watchApi('local-skill', tempDir, {
      onEvent: (e) => events.push(e),
    })

    await writeFile(join(tempDir, 'source-local', 'CLOSE.md'), 'change')
    result.close()
    result.close()

    await new Promise((r) => setTimeout(r, 800))

    assert.equal(result.watchers.length, 0)
    assert.ok(!events.some((e) => e.type === 'syncing'))
    assert.ok(!events.some((e) => e.type === 'synced'))
  })
})
