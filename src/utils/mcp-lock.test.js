import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import {
  addServerToMcpLock,
  readMcpLock,
  removeServerFromMcpLock,
  writeMcpLock,
} from './mcp-lock.js'

let tempDir
let lockPath

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'rolecraft-mcp-lock-test-'))
  lockPath = join(tempDir, 'nested', '.mcp-lock.json')
})

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe('mcp lockfile', () => {
  it('reads a valid lockfile', async () => {
    const data = {
      version: 1,
      servers: { github: { command: 'npx', agents: ['cursor'] } },
    }
    await writeMcpLock(data, lockPath)

    assert.deepEqual(await readMcpLock(lockPath), data)
  })

  it('returns an empty lock for a missing file', async () => {
    const expected = { version: 1, servers: {} }
    assert.deepEqual(await readMcpLock(lockPath), expected)
  })

  it('fails loudly on a corrupt file instead of reporting no servers', async () => {
    await mkdir(join(tempDir, 'nested'), { recursive: true })
    await writeFile(lockPath, '{invalid json', 'utf-8')

    // Reporting an empty lock here is what turned a single bad write into the
    // user's server list disappearing, so this has to be an error.
    await assert.rejects(
      () => readMcpLock(lockPath),
      (err) => {
        assert.equal(err.userCode, 'MCP_LOCK_CORRUPT')
        assert.match(err.message, /not valid JSON/)
        return true
      },
    )

    // And the file must be left exactly as it was, so it can still be recovered.
    assert.equal(await readFile(lockPath, 'utf-8'), '{invalid json')
  })

  it('does not overwrite a corrupt lock when a mutation is attempted', async () => {
    await mkdir(join(tempDir, 'nested'), { recursive: true })
    await writeFile(
      lockPath,
      '{ "version": 1, "servers": { "github": { "agents": ["cursor"] } ',
      'utf-8',
    )

    await assert.rejects(
      () => addServerToMcpLock('new', { command: 'npx' }, lockPath),
      /not valid JSON/,
    )

    // The truncated file is still there, rather than replaced by an empty lock
    // that would have looked like a successful removal of every server.
    const raw = await readFile(lockPath, 'utf-8')
    assert.match(raw, /"github"/)
    assert.throws(() => JSON.parse(raw))
  })

  it('fails loudly when the lock path cannot be read', async () => {
    // A directory where the file should be, so the read fails with EISDIR
    // rather than ENOENT. Portable, unlike permission bits.
    await mkdir(lockPath, { recursive: true })

    await assert.rejects(
      () => readMcpLock(lockPath),
      (err) => {
        assert.equal(err.userCode, 'MCP_LOCK_UNREADABLE')
        return true
      },
    )
  })

  it('writes formatted valid JSON at the requested path', async () => {
    const data = { version: 1, servers: { local: { command: 'node' } } }
    await writeMcpLock(data, lockPath)

    const raw = await readFile(lockPath, 'utf-8')
    assert.equal(raw, `${JSON.stringify(data, null, 2)}\n`)
    assert.deepEqual(JSON.parse(raw), data)
  })

  it('adds servers and merges their agent lists', async () => {
    await addServerToMcpLock(
      'github',
      { command: 'npx', agents: ['cursor'] },
      lockPath,
    )
    const lock = await addServerToMcpLock(
      'github',
      { command: 'uvx', agents: ['cursor', 'zed'] },
      lockPath,
    )

    assert.deepEqual(lock.servers.github, {
      command: 'uvx',
      agents: ['cursor', 'zed'],
    })
    assert.deepEqual(await readMcpLock(lockPath), lock)
  })

  it('removes one agent and deletes the server after the last agent', async () => {
    await addServerToMcpLock(
      'github',
      { command: 'npx', agents: ['cursor', 'zed'] },
      lockPath,
    )

    let lock = await removeServerFromMcpLock('github', 'cursor', lockPath)
    assert.deepEqual(lock.servers.github.agents, ['zed'])

    lock = await removeServerFromMcpLock('github', 'zed', lockPath)
    assert.equal(lock.servers.github, undefined)
    assert.deepEqual(await readMcpLock(lockPath), lock)
  })

  it('returns the default lock without writing for a missing server', async () => {
    const lock = await removeServerFromMcpLock('github', 'cursor', lockPath)

    assert.deepEqual(lock, { version: 1, servers: {} })
    await assert.rejects(readFile(lockPath, 'utf-8'), { code: 'ENOENT' })
  })

  describe('concurrent mutations', () => {
    const server = (name) => ({
      command: 'npx',
      args: ['-y', `pkg-${name}`],
      agents: ['cursor'],
      source: `npm:pkg-${name}`,
    })

    it('keeps every server when many adds run concurrently', async () => {
      const names = Array.from({ length: 12 }, (_, i) => `srv-${i}`)

      // Concurrent adds are the reported failure: each one reads the same
      // snapshot, each adds a different server, and the last write wins.
      const results = await Promise.all(
        names.map((name) => addServerToMcpLock(name, server(name), lockPath)),
      )

      for (const name of names) {
        assert.ok(
          results.some((lock) => lock.servers[name]),
          name,
        )
      }

      const final = await readMcpLock(lockPath)
      assert.equal(Object.keys(final.servers).length, names.length)
      for (const name of names) {
        assert.ok(final.servers[name], `${name} went missing`)
      }
    })

    it('does not lose an add that races a remove on a different server', async () => {
      await addServerToMcpLock('keep', server('keep'), lockPath)
      await addServerToMcpLock('drop', server('drop'), lockPath)

      await Promise.all([
        addServerToMcpLock('fresh', server('fresh'), lockPath),
        removeServerFromMcpLock('drop', 'cursor', lockPath),
      ])

      const final = await readMcpLock(lockPath)
      // Whichever order the two ran in, both changes must survive: an add and a
      // remove on different servers cannot both be right unless the write that
      // landed last saw the other's result.
      assert.ok(final.servers.keep, 'keep was lost')
      assert.ok(final.servers.fresh, 'the concurrent add was lost')
      assert.equal(final.servers.drop, undefined, 'the remove was lost')
    })

    it('merges agent lists for the same server added concurrently', async () => {
      await Promise.all([
        addServerToMcpLock(
          'github',
          { ...server('github'), agents: ['cursor'] },
          lockPath,
        ),
        addServerToMcpLock(
          'github',
          { ...server('github'), agents: ['zed'] },
          lockPath,
        ),
        addServerToMcpLock(
          'github',
          { ...server('github'), agents: ['cursor'] },
          lockPath,
        ),
      ])

      const final = await readMcpLock(lockPath)
      assert.deepEqual([...final.servers.github.agents].sort(), [
        'cursor',
        'zed',
      ])
    })

    it('never lets a reader observe a partial or shrinking lock', async () => {
      // A direct write to the final path truncates it and then fills it back in,
      // so a reader landing in that window sees a partial document. Two things
      // make that window catchable: a document big enough for the write to take
      // real time, and a reader that samples continuously rather than once.
      //
      // SEED is not a guess. Measured against a direct write, 100 servers was
      // caught in 4 of 8 runs and 200 in 25 of 25, so 200 is the smallest size
      // tried that reliably detects the bug. The fixed write is never caught.
      const SEED = 200
      for (let i = 0; i < SEED; i++) {
        await addServerToMcpLock(
          `seed/a-fairly-long-server-name-${i}`,
          {
            command: 'npx',
            args: ['-y', `a-fairly-long-package-name-${i}`],
            agents: ['cursor', 'zed', 'claude', 'vscode'],
            source: `npm:a-fairly-long-package-name-${i}`,
          },
          lockPath,
        )
      }

      let reading = true
      let samples = 0
      let unparseable = 0
      let empty = 0
      let short = 0
      let smallest = Infinity

      // The reader records rather than throws, so a torn read is reported as the
      // failure it is instead of escaping as an unhandled rejection, and so the
      // loop can always be stopped below.
      const reader = (async () => {
        while (reading) {
          let count

          try {
            count = Object.keys((await readMcpLock(lockPath)).servers).length
          } catch {
            // A loud read means a torn file now surfaces as a parse error
            // rather than as a silently empty server list. Same bug either way.
            unparseable++
            samples++
            await new Promise((resolve) => setImmediate(resolve))
            continue
          }

          samples++
          if (count === 0) empty++
          if (count < SEED) short++
          if (count < smallest) smallest = count

          // Yield so the writers' I/O and timers still run.
          await new Promise((resolve) => setImmediate(resolve))
        }
      })()

      // In a finally, so the reader is always stopped and awaited. Letting it
      // outlive a failure would have it reading a directory the next test is
      // about to create, which turns one failure into a confusing second one.
      try {
        // Adds only grow the set, so the server count is monotonically
        // non-decreasing and any read below SEED is data that went missing.
        for (let i = 0; i < 25; i++) {
          await addServerToMcpLock(
            `added/server-${i}`,
            server(`server-${i}`),
            lockPath,
          )
        }
      } finally {
        reading = false
        await reader
      }

      assert.ok(
        samples > 20,
        `only ${samples} samples, too few to mean anything`,
      )
      assert.equal(
        unparseable,
        0,
        `${unparseable} of ${samples} reads hit a partial file`,
      )
      assert.equal(empty, 0, `${empty} of ${samples} reads saw an empty lock`)
      assert.equal(
        short,
        0,
        `${short} of ${samples} reads saw fewer than the seed`,
      )
      assert.ok(
        smallest >= SEED,
        `smallest read was ${smallest}, seed was ${SEED}`,
      )
    })

    it('leaves no sentinel or temp file behind', async () => {
      await Promise.all([
        addServerToMcpLock('one', server('one'), lockPath),
        addServerToMcpLock('two', server('two'), lockPath),
      ])
      await removeServerFromMcpLock('one', 'cursor', lockPath)

      const left = readdirSync(join(tempDir, 'nested'))
      assert.deepEqual(left, ['.mcp-lock.json'])
    })

    it('does not rewrite the file when a remove changes nothing', async () => {
      await addServerToMcpLock('github', server('github'), lockPath)
      const before = await readFile(lockPath, 'utf-8')

      // Nothing to remove, so the file must be left byte-identical rather than
      // re-serialised, and no sentinel may be stranded.
      await removeServerFromMcpLock('absent', 'cursor', lockPath)

      assert.equal(await readFile(lockPath, 'utf-8'), before)
    })
  })
})
