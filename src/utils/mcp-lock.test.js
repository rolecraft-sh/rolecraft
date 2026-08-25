import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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

  it('returns an empty lock for missing or corrupt files', async () => {
    const expected = { version: 1, servers: {} }
    assert.deepEqual(await readMcpLock(lockPath), expected)

    await mkdir(join(tempDir, 'nested'), { recursive: true })
    await writeFile(lockPath, '{invalid json', 'utf-8')
    assert.deepEqual(await readMcpLock(lockPath), expected)
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
})
