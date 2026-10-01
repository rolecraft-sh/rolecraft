import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
} from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import agents from '../agents.js'
import { UserError } from './errors.js'

let tempDir, lockModule, origHome

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-lock-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  lockModule = await import('./lockfile.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
  process.env.HOME = origHome
})

describe('lockfile', () => {
  it('normalizeSlug converts path separators to hyphens', () => {
    assert.equal(
      lockModule.normalizeSlug('owner/group/skill'),
      'owner-group-skill',
    )
    assert.equal(
      lockModule.normalizeSlug('already-normalized'),
      'already-normalized',
    )
  })

  it('getGlobalLockPath returns path inside homedir', () => {
    assert.equal(
      lockModule.getGlobalLockPath(),
      join(tempDir, '.agents', '.skill-lock.json'),
    )
  })

  it('getAgentsDir returns path inside homedir', () => {
    assert.equal(lockModule.getAgentsDir(), join(tempDir, '.agents', 'skills'))
  })

  it('getProjectLockPath returns path relative to cwd', () => {
    assert.equal(
      lockModule.getProjectLockPath(process.cwd()),
      join(process.cwd(), '.agents', '.skill-lock.json'),
    )
  })

  // Verify getDirForAgent matches agents.js data for every agent flag
  describe('getDirForAgent', () => {
    for (const agent of agents) {
      it(`resolves ${agent.flag} → ${agent.label}`, () => {
        const expected = agent.getDir()
        assert.equal(lockModule.getDirForAgent(agent.flag), expected)
      })
    }

    it('falls back to ~/.agents/skills for unknown flag', () => {
      assert.equal(
        lockModule.getDirForAgent('nonexistent'),
        join(tempDir, '.agents', 'skills'),
      )
    })
  })

  it('readLock returns default when no file exists', async () => {
    const lock = await lockModule.readLock()
    assert.deepEqual(lock, {
      version: 3,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    })
  })

  it('readLock parses existing lock file', async () => {
    const data = {
      version: 3,
      skills: { test: { name: 'x' } },
      dismissed: {},
      lastSelectedAgents: [],
    }
    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify(data),
    )
    const lock = await lockModule.readLock()
    assert.deepEqual(lock, data)
  })

  it('writeLock writes lock file', async () => {
    const data = {
      version: 3,
      skills: { w: {} },
      dismissed: {},
      lastSelectedAgents: [],
    }
    await lockModule.writeLock(data)
    const written = JSON.parse(
      readFileSync(join(tempDir, '.agents', '.skill-lock.json'), 'utf-8'),
    )
    assert.deepEqual(written, data)
  })

  describe('writeLock atomicity', () => {
    let atomicDir, lockPath

    beforeEach(() => {
      atomicDir = mkdtempSync(join(tmpdir(), 'rolecraft-lock-atomic-'))
      lockPath = join(atomicDir, '.skill-lock.json')
    })

    afterEach(() => {
      rmSync(atomicDir, { recursive: true, force: true })
    })

    it('leaves no temp files behind on success', async () => {
      const data = {
        version: 3,
        skills: { 'owner/skill': { name: 'Skill' } },
        dismissed: {},
        lastSelectedAgents: [],
      }
      await lockModule.writeLock(data, lockPath)

      const written = JSON.parse(readFileSync(lockPath, 'utf-8'))
      assert.deepEqual(written, data)
      assert.deepEqual(readdirSync(atomicDir), ['.skill-lock.json'])
    })

    // Windows keeps the destination locked for as long as a reader holds it
    // open, so a concurrent reader can starve the rename indefinitely. The
    // torn-read guarantee this covers is a POSIX atomicity property.
    it('never exposes a partially written file to readers', {
      skip: process.platform === 'win32' ? 'POSIX-only guarantee' : false,
    }, async () => {
      // One entry per write, so each payload is large enough that an
      // unsynchronised write to the final path would be observable.
      const build = (n) => ({
        version: 3,
        skills: Object.fromEntries(
          Array.from({ length: 200 }, (_, i) => [
            `owner/skill-${n}-${i}`,
            { filler: 'x'.repeat(256) },
          ]),
        ),
        dismissed: {},
        lastSelectedAgents: [],
      })

      await lockModule.writeLock(build(0), lockPath)

      let reads = 0
      let sampling = true
      // An async reader that yields between reads, so it samples often but
      // still lets the writers' I/O and retry timers run.
      const reader = (async () => {
        while (sampling) {
          reads++
          // Must always be complete, parseable JSON — never a truncated prefix.
          JSON.parse(readFileSync(lockPath, 'utf-8'))
          await new Promise((resolve) => setImmediate(resolve))
        }
      })()

      try {
        await Promise.all(
          Array.from({ length: 8 }, (_, n) =>
            lockModule.writeLock(build(n + 1), lockPath),
          ),
        )
      } finally {
        sampling = false
        await reader
      }

      // The race is only meaningful if the reader actually ran during it.
      assert.ok(reads > 0, 'reader never sampled during the concurrent writes')
      JSON.parse(readFileSync(lockPath, 'utf-8'))
    })

    it('keeps the previous contents when a write fails', async () => {
      const good = {
        version: 3,
        skills: { 'owner/keep': { name: 'Keep' } },
        dismissed: {},
        lastSelectedAgents: [],
      }
      await lockModule.writeLock(good, lockPath)

      // A value that cannot be serialised throws before anything is renamed,
      // so the existing lockfile must survive intact.
      const cyclic = { version: 3, skills: {} }
      cyclic.skills.self = cyclic

      await assert.rejects(
        () => lockModule.writeLock(cyclic, lockPath),
        /circular|Converting circular structure/i,
      )

      assert.deepEqual(JSON.parse(readFileSync(lockPath, 'utf-8')), good)
      assert.deepEqual(readdirSync(atomicDir), ['.skill-lock.json'])
    })

    it('is safe to call concurrently from the same process', async () => {
      const writes = Array.from({ length: 24 }, (_, n) =>
        lockModule.writeLock(
          {
            version: 3,
            skills: { [`owner/skill-${n}`]: { n } },
            dismissed: {},
            lastSelectedAgents: [],
          },
          lockPath,
        ),
      )

      await Promise.all(writes)

      // Last write wins, and it is a complete, valid document.
      const final = JSON.parse(readFileSync(lockPath, 'utf-8'))
      assert.equal(final.version, 3)
      assert.equal(Object.keys(final.skills).length, 1)
      assert.deepEqual(readdirSync(atomicDir), ['.skill-lock.json'])
    })
  })

  describe('concurrent mutations', () => {
    let concDir, lockPath

    const entry = (slug) => ({
      contentSha: `sha-${slug}`,
      fileHashes: {},
      source: slug,
      sourceType: 'github',
    })

    beforeEach(() => {
      concDir = mkdtempSync(join(tmpdir(), 'rolecraft-lock-conc-'))
      lockPath = join(concDir, '.skill-lock.json')
    })

    afterEach(() => {
      rmSync(concDir, { recursive: true, force: true })
    })

    // On main this left a single entry behind: every caller read the same
    // lock, added its own skill, and the last rename discarded the rest.
    it('keeps every skill when many adds run concurrently', async () => {
      const slugs = Array.from({ length: 12 }, (_, n) => `owner/skill-${n}`)

      await Promise.all(
        slugs.map((slug) =>
          lockModule.addSkillToLock(slug, entry(slug), lockPath),
        ),
      )

      const final = JSON.parse(readFileSync(lockPath, 'utf-8'))
      assert.deepEqual(Object.keys(final.skills).sort(), [...slugs].sort())
    })

    it('merges agents for the same skill added concurrently', async () => {
      const agents = ['claude-code', 'cursor', 'windsurf', 'copilot']

      await Promise.all(
        agents.map((agent) =>
          lockModule.addSkillToLock(
            'owner/shared',
            { ...entry('owner/shared'), agents: [agent] },
            lockPath,
          ),
        ),
      )

      const final = JSON.parse(readFileSync(lockPath, 'utf-8'))
      assert.deepEqual(
        [...final.skills['owner/shared'].agents].sort(),
        ['claude-code', 'copilot', 'cursor', 'windsurf'].sort(),
      )
    })

    it('does not lose a concurrent add to a different skill', async () => {
      await lockModule.addSkillToLock(
        'owner/first',
        entry('owner/first'),
        lockPath,
      )

      await Promise.all([
        lockModule.addSkillToLock(
          'owner/second',
          entry('owner/second'),
          lockPath,
        ),
        lockModule.removeSkillFromLock('owner/first', lockPath),
      ])

      const final = JSON.parse(readFileSync(lockPath, 'utf-8'))
      // Whichever order they ran in, the add must not be swallowed by the
      // remove's snapshot.
      assert.ok(final.skills['owner/second'], 'the concurrent add was lost')
    })

    it('rolls back exactly one version per pop under concurrency', async () => {
      const slug = 'owner/rollback'
      const versions = ['v1', 'v2', 'v3']

      for (const sha of versions) {
        await lockModule.addSkillToLock(
          slug,
          { ...entry(slug), contentSha: sha },
          lockPath,
        )
      }

      // Three rolls back against three existing versions. Each must consume
      // exactly one, so a retry cannot compound into rolling back two.
      await Promise.all(
        Array.from({ length: 3 }, () => lockModule.popHistory(slug, lockPath)),
      )

      const final = JSON.parse(readFileSync(lockPath, 'utf-8'))
      assert.equal(final.skills[slug].contentSha, 'v1')
      assert.equal(final.skills[slug].history.length, 0)
    })

    it('leaves no sentinel or temp file behind', async () => {
      await Promise.all(
        Array.from({ length: 6 }, (_, n) =>
          lockModule.addSkillToLock(
            `owner/clean-${n}`,
            entry(`owner/clean-${n}`),
            lockPath,
          ),
        ),
      )

      // No `.update-lock` sentinel and no `.tmp` scratch file survives, so a
      // later run cannot mistake our leftovers for a lock held by someone else.
      assert.deepEqual(readdirSync(concDir), ['.skill-lock.json'])
    })

    it('never has two writers inside the update at once', async () => {
      // Mutual exclusion, checked by holding the lock and proving a second
      // writer cannot get in. Polling for the sentinel and hoping to catch a
      // held window would be a race: the observer can miss every window and
      // still pass, or fail on a fast machine purely on timing. Blocking a
      // known writer and checking it is still blocked has no such window.
      const sentinel = `${lockPath}.update-lock`
      const release = await lockModule.__testing.acquireLock(lockPath, {
        timeoutMs: 50,
        staleMs: 10_000,
      })

      try {
        assert.equal(existsSync(sentinel), true, 'lock was not taken')

        let finished = false
        const contender = lockModule
          .addSkillToLock('owner/probe', entry('probe'), lockPath)
          .then(() => {
            finished = true
          })

        // Many event-loop turns and several filesystem round-trips. If the
        // lock did not exclude, the update would have completed by now.
        for (let i = 0; i < 5; i++) {
          await new Promise((resolve) => setTimeout(resolve, 10))
          assert.equal(finished, false, 'a second writer entered a held update')
          assert.equal(existsSync(sentinel), true, 'held lock disappeared')
        }

        await release()
        await contender

        assert.equal(finished, true, 'contender never completed after release')
      } finally {
        await release()
      }
    })

    it('recovers when a lock file was left behind by a killed process', async () => {
      // A process that dies mid-update cannot release its own lock, so an
      // abandoned sentinel has to expire rather than wedge every later write.
      const sentinel = `${lockPath}.update-lock`
      await writeFile(sentinel, '999999')

      const longAgo = new Date(Date.now() - 60_000)
      utimesSync(sentinel, longAgo, longAgo)

      await lockModule.addSkillToLock(
        'owner/after-crash',
        entry('owner/after-crash'),
        lockPath,
      )

      const final = JSON.parse(readFileSync(lockPath, 'utf-8'))
      assert.ok(final.skills['owner/after-crash'])
      assert.deepEqual(readdirSync(concDir), ['.skill-lock.json'])
    })

    it('does not remove a sentinel that was taken over while stalled', async () => {
      // A holds the lock, stalls past the stale threshold, and B declares it
      // dead and takes over. When A finally wakes and releases, it must not
      // delete B's sentinel, or a third writer could enter B's critical section.
      const sentinel = `${lockPath}.update-lock`

      const release = await lockModule.__testing.acquireLock(lockPath, {
        timeoutMs: 5_000,
        staleMs: 10,
      })
      await writeFile(sentinel, 'someone-elses-token')

      await release()

      // A's token no longer matches, so the sentinel has to survive.
      assert.equal(readFileSync(sentinel, 'utf-8'), 'someone-elses-token')

      await rm(sentinel, { force: true })
    })

    it('removes its own sentinel on a normal release', async () => {
      const sentinel = `${lockPath}.update-lock`

      const release = await lockModule.__testing.acquireLock(lockPath, {
        timeoutMs: 5_000,
        staleMs: 10_000,
      })
      assert.equal(existsSync(sentinel), true)

      await release()

      assert.equal(existsSync(sentinel), false)
    })

    it(
      'times out with a UserError when a live holder keeps the lock',
      async () => {
        // The one failure mode of this mechanism a user can actually reach, so
        // it is exercised through the private export rather than a public
        // timeout argument.
        //
        // The lock is taken for real rather than faked with a stub sentinel
        // file: a real holder refreshes its own mtime, so it is correctly never
        // treated as stale, which is what makes the timeout the outcome.
        const release = await lockModule.__testing.acquireLock(lockPath, {
          timeoutMs: 5_000,
          staleMs: 10_000,
        })

        try {
          await assert.rejects(
            () =>
              lockModule.__testing.acquireLock(lockPath, {
                timeoutMs: 150,
                staleMs: 10_000,
              }),
            /Timed out after 150ms waiting for another rolecraft process/,
          )
        } finally {
          await release()
        }
      },
      { timeout: 30_000 },
    )

    it('does not take the lock to pop a skill that has no history', async () => {
      // Rolling back something that was never updated is a no-op, and it must
      // not acquire the cross-process lock to discover that. Proved by holding
      // the lock for the whole call: a version that acquires first blocks for
      // the whole stale window before giving up, this one returns at once and
      // leaves the holder's sentinel alone.
      await lockModule.addSkillToLock(
        'owner/no-history',
        entry('owner/no-history'),
        lockPath,
      )

      const sentinel = `${lockPath}.update-lock`
      const release = await lockModule.__testing.acquireLock(lockPath, {
        timeoutMs: 5_000,
        staleMs: 10_000,
      })

      try {
        const started = Date.now()
        const popped = await lockModule.popHistory('owner/no-history', lockPath)

        assert.equal(popped, null)
        assert.ok(
          Date.now() - started < 1_000,
          'a no-op pop waited on the lock instead of skipping it',
        )

        // Untouched: not stolen as stale, not deleted on the way out.
        assert.equal(existsSync(sentinel), true)
      } finally {
        await release()
      }
    })

    it('still rolls back when the pre-check sees no history', async () => {
      // The pre-check reads outside the lock, so it can be stale. It must stay
      // advisory: a real rollback cannot be skipped because the snapshot it
      // looked at was out of date.
      // `entry` derives contentSha from the slug, so two distinct versions
      // have to be built by hand or the second add is a no-op and no history
      // is ever recorded.
      const version = (sha) => ({
        contentSha: sha,
        fileHashes: {},
        source: 'owner/two-versions',
        sourceType: 'github',
      })

      await lockModule.addSkillToLock(
        'owner/two-versions',
        version('v1'),
        lockPath,
      )
      await lockModule.addSkillToLock(
        'owner/two-versions',
        version('v2'),
        lockPath,
      )

      // Guard the premise: without two distinct versions there is no history
      // to pop and the assertions below would pass for the wrong reason.
      const seeded = JSON.parse(readFileSync(lockPath, 'utf-8'))
      assert.equal(seeded.skills['owner/two-versions'].history.length, 1)

      const popped = await lockModule.popHistory('owner/two-versions', lockPath)
      assert.equal(popped.contentSha, 'v1')

      const after = JSON.parse(readFileSync(lockPath, 'utf-8'))
      assert.equal(after.skills['owner/two-versions'].contentSha, 'v1')

      // Exactly one version consumed, and a second pop finds nothing.
      assert.equal(
        await lockModule.popHistory('owner/two-versions', lockPath),
        null,
      )
    })

    it('does not rewrite the file when a mutation changes nothing', async () => {
      await lockModule.addSkillToLock(
        'owner/no-history',
        entry('owner/no-history'),
        lockPath,
      )

      const before = readFileSync(lockPath, 'utf-8')

      // Nothing to roll back, so the file must be left byte-identical rather
      // than re-serialised. That keeps a previously-instant path instant.
      assert.equal(
        await lockModule.popHistory('owner/no-history', lockPath),
        null,
      )
      assert.equal(readFileSync(lockPath, 'utf-8'), before)

      // A no-op write must also not strand a lock.
      assert.equal(existsSync(`${lockPath}.update-lock`), false)
    })

    it('releases the lock when a mutation throws', async () => {
      // A self-referencing entry cannot be serialised, so the write throws
      // from inside the locked section. The sentinel has to be released even
      // so, or every later install would wait on a lock nobody holds.
      const cyclic = entry('owner/cyclic')
      cyclic.self = cyclic

      await assert.rejects(
        () => lockModule.addSkillToLock('owner/cyclic', cyclic, lockPath),
        /circular|Converting circular structure/i,
      )

      assert.deepEqual(readdirSync(concDir), [])

      // And the next write still succeeds, so no stale lock is left behind.
      await lockModule.addSkillToLock(
        'owner/after-throw',
        entry('owner/after-throw'),
        lockPath,
      )
      const final = JSON.parse(readFileSync(lockPath, 'utf-8'))
      assert.ok(final.skills['owner/after-throw'])
    })
  })

  it('addSkillToLock adds entry and sets installedAt', async () => {
    await lockModule.addSkillToLock('test/skill', { name: 'Test' })
    const lock = await lockModule.readLock()
    assert.equal(lock.skills['test/skill'].name, 'Test')
    assert.ok(lock.skills['test/skill'].installedAt)
  })

  it('addSkillToLock merges agents instead of overwriting', async () => {
    await lockModule.addSkillToLock('merge-skill', { agents: ['claude-code'] })
    await lockModule.addSkillToLock('merge-skill', {
      agents: ['cursor', 'warp'],
    })
    const lock = await lockModule.readLock()
    const agents = lock.skills['merge-skill'].agents
    assert.ok(agents.includes('claude-code'))
    assert.ok(agents.includes('cursor'))
    assert.ok(agents.includes('warp'))
    assert.equal(agents.length, 3)
  })

  it('removeSkillFromLock removes entry', async () => {
    await lockModule.addSkillToLock('to-remove', {})
    await lockModule.removeSkillFromLock('to-remove')
    const lock = await lockModule.readLock()
    assert.ok(!lock.skills['to-remove'])
  })

  it('computeContentHash produces deterministic hash', () => {
    const h1 = lockModule.computeContentHash({
      'SKILL.md': 'content',
      'helper.js': 'x',
    })
    const h2 = lockModule.computeContentHash({
      'helper.js': 'x',
      'SKILL.md': 'content',
    })
    assert.equal(h1, h2)
    assert.equal(h1.length, 64)
  })

  it('computeContentHash changes when content changes', () => {
    const h1 = lockModule.computeContentHash({
      'SKILL.md': 'same',
      'extra.js': 'a',
    })
    const h2 = lockModule.computeContentHash({
      'SKILL.md': 'same',
      'extra.js': 'b',
    })
    assert.notEqual(h1, h2)
  })

  it('computeContentHash returns different hash for different files', () => {
    const h1 = lockModule.computeContentHash({ 'SKILL.md': 'x' })
    const h2 = lockModule.computeContentHash({
      'SKILL.md': 'x',
      'extra.js': 'y',
    })
    assert.notEqual(h1, h2)
  })

  describe('history', () => {
    const skillSlug = 'test/my-skill'
    const baseEntry = {
      slug: skillSlug,
      contentSha: 'abc123',
      fileHashes: { 'SKILL.md': 'hash1' },
      installedAt: new Date().toISOString(),
      agents: ['cursor'],
      source: 'user/repo',
      sourceType: 'github',
    }

    it('adds history when contentSha changes', async () => {
      await lockModule.addSkillToLock(skillSlug, baseEntry)

      const updatedEntry = {
        ...baseEntry,
        contentSha: 'def456',
        fileHashes: { 'SKILL.md': 'hash2' },
      }
      await lockModule.addSkillToLock(skillSlug, updatedEntry)

      const history = await lockModule.getSkillHistory(skillSlug)
      assert.equal(history.length, 1)
      assert.equal(history[0].contentSha, 'abc123')
      assert.equal(history[0].fileHashes['SKILL.md'], 'hash1')
    })

    it('does not add history when contentSha is the same', async () => {
      const sameEntry = {
        ...baseEntry,
        contentSha: 'def456',
      }
      await lockModule.addSkillToLock(skillSlug, sameEntry)

      const history = await lockModule.getSkillHistory(skillSlug)
      assert.equal(history.length, 1) // Still 1, same contentSha
    })

    it('returns history newest-first', async () => {
      const v3Entry = {
        ...baseEntry,
        contentSha: 'ghi789',
      }
      await lockModule.addSkillToLock(skillSlug, v3Entry)

      const history = await lockModule.getSkillHistory(skillSlug)
      assert.equal(history.length, 2)
      assert.equal(history[0].contentSha, 'def456') // newest first
      assert.equal(history[1].contentSha, 'abc123')
    })

    it('popHistory restores previous version metadata', async () => {
      const prev = await lockModule.popHistory(skillSlug)
      assert.ok(prev)
      assert.equal(prev.contentSha, 'def456')

      // After pop, current entry should have the next oldest contentSha
      const _current = lockModule.readLock().then((l) => l.skills[skillSlug])
      // The current entry was the "ghi789" one, and after pop it should still be
      // but the history was popped
      const lock = await lockModule.readLock()
      assert.equal(lock.skills[skillSlug].contentSha, 'def456')
    })

    it('respects MAX_HISTORY limit', async () => {
      // Push 6 entries to exceed MAX_HISTORY (5)
      for (let i = 0; i < 6; i++) {
        await lockModule.addSkillToLock(skillSlug, {
          ...baseEntry,
          contentSha: `sha-${i}`,
        })
      }

      const history = await lockModule.getSkillHistory(skillSlug)
      assert.equal(history.length, 5) // MAX_HISTORY = 5
    })

    it('returns empty history for never-updated skill', async () => {
      const history = await lockModule.getSkillHistory('nonexistent-slug')
      assert.deepEqual(history, [])
    })

    it('popHistory returns null when no history', async () => {
      const result = await lockModule.popHistory('nonexistent-slug')
      assert.equal(result, null)
    })
  })

  // Issue #324: a damaged lock must be reported, not silently replaced.
  // Before the fix readLock swallowed every read and parse error and handed
  // back an empty lock, so the next write destroyed the original bytes; and
  // it returned whatever JSON.parse produced, so `null`, `{}` and
  // `{"version":3}` reached callers and raised a raw TypeError on
  // `lock.skills[...]`.
  describe('readLock with a damaged lockfile (#324)', () => {
    const lockPath = () => join(tempDir, '.agents', '.skill-lock.json')

    const MALFORMED = [
      ['unparseable JSON', '{ "version": 3, "skills": {'],
      ['null', 'null'],
      ['an object with no skills key', '{"version":3}'],
      ['an empty object', '{}'],
      ['a JSON array', '[1,2,3]'],
      ['a non-object skills value', '{"version":3,"skills":"nope"}'],
    ]

    for (const [label, body] of MALFORMED) {
      it(`throws a UserError for ${label}`, async () => {
        await writeFile(lockPath(), body, 'utf-8')
        await assert.rejects(
          () => lockModule.readLock(),
          (err) => {
            assert.ok(err instanceof UserError, 'expected a UserError')
            assert.match(err.message, /lockfile is corrupted/i)
            assert.ok(err.suggestion, 'a UserError here should say what to do')
            return true
          },
        )
      })

      it(`leaves the file untouched for ${label}`, async () => {
        await writeFile(lockPath(), body, 'utf-8')
        await lockModule.readLock().catch(() => {})
        // The bytes that were there must survive a failed read, or the
        // next write silently overwrites whatever the user had.
        assert.equal(readFileSync(lockPath(), 'utf-8'), body)
      })
    }

    it('still reads a missing lock as empty', async () => {
      await rm(lockPath(), { force: true })
      const lock = await lockModule.readLock()
      assert.deepEqual(lock.skills, {})
    })

    it('still reads a valid empty lock', async () => {
      await writeFile(lockPath(), '{"version":3,"skills":{}}', 'utf-8')
      const lock = await lockModule.readLock()
      assert.deepEqual(lock.skills, {})
      assert.equal(lock.skills['a/b'], undefined) // no crash
    })
  })
})
