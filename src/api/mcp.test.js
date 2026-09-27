import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  apiMcpCheck,
  apiMcpInstall,
  apiMcpList,
  apiMcpRemove,
  apiMcpSearch,
  apiMcpUpdate,
  setFetch,
} from './mcp.js'

let tempDir
let originalHome

function readJson(...parts) {
  return JSON.parse(readFileSync(join(tempDir, ...parts), 'utf-8'))
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body
    },
  }
}

async function writeMcpLock(servers) {
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  await writeFile(
    join(tempDir, '.agents', '.mcp-lock.json'),
    JSON.stringify({ version: 1, servers }),
  )
}

before(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-mcp-test-'))
  originalHome = process.env.HOME
  process.env.HOME = tempDir
})

beforeEach(async () => {
  await rm(join(tempDir, '.agents'), { recursive: true, force: true })
  await rm(join(tempDir, '.cursor'), { recursive: true, force: true })
})

after(async () => {
  setFetch(globalThis.fetch)
  process.env.HOME = originalHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('api mcp install/list/update/remove', () => {
  it('installs an npm server into the requested agents and the lockfile', async () => {
    const result = await apiMcpInstall('npm:@test/server@1.2.3', {
      agents: ['agents', 'cursor'],
    })

    assert.equal(result.name, '@test/server')
    assert.equal(result.source, 'npm:@test/server@1.2.3')
    assert.deepEqual(result.resolved, {
      command: 'npx',
      args: ['-y', '@test/server@1.2.3'],
    })
    assert.deepEqual(result.results, [
      { agent: 'agents', name: '@test/server', success: true },
      { agent: 'cursor', name: '@test/server', success: true },
    ])
    assert.equal(typeof result.scanResult.score, 'number')

    assert.deepEqual(readJson('.agents', 'mcp.json').mcpServers, {
      '@test/server': { command: 'npx', args: ['-y', '@test/server@1.2.3'] },
    })
    assert.ok(readJson('.cursor', 'mcp.json').mcpServers['@test/server'])

    const lock = readJson('.agents', '.mcp-lock.json')
    assert.equal(lock.servers['@test/server'].source, 'npm:@test/server@1.2.3')
    assert.deepEqual(lock.servers['@test/server'].agents, ['agents', 'cursor'])
  })

  it('uses options.name instead of the package name', async () => {
    const result = await apiMcpInstall('npm:@test/server', {
      agents: ['agents'],
      name: 'custom',
    })

    assert.equal(result.name, 'custom')
    assert.ok(readJson('.agents', 'mcp.json').mcpServers.custom)
  })

  it('lists installed servers per agent with a total', async () => {
    await apiMcpInstall('npm:@test/one', { agents: ['agents'], name: 'one' })
    await apiMcpInstall('npm:@test/two', { agents: ['cursor'], name: 'two' })

    const result = await apiMcpList({ agents: ['agents', 'cursor'] })

    assert.deepEqual(result, {
      servers: [
        {
          agent: 'agents',
          name: 'one',
          command: 'npx',
          args: ['-y', '@test/one'],
        },
        {
          agent: 'cursor',
          name: 'two',
          command: 'npx',
          args: ['-y', '@test/two'],
        },
      ],
      total: 2,
    })
  })

  it('returns an empty list when no servers are configured', async () => {
    const result = await apiMcpList({ agents: ['agents'] })
    assert.deepEqual(result, { servers: [], total: 0 })
  })

  it('updates an existing server to the new resolved source', async () => {
    await apiMcpInstall('npm:@test/server@1.0.0', {
      agents: ['agents'],
      name: 'srv',
    })

    const result = await apiMcpUpdate('npm:@test/server@2.0.0', {
      agents: ['agents'],
      name: 'srv',
    })

    assert.deepEqual(result, {
      name: 'srv',
      source: 'npm:@test/server@2.0.0',
      resolved: { command: 'npx', args: ['-y', '@test/server@2.0.0'] },
      results: [{ agent: 'agents', name: 'srv', success: true }],
    })
    assert.deepEqual(readJson('.agents', 'mcp.json').mcpServers.srv.args, [
      '-y',
      '@test/server@2.0.0',
    ])
  })

  it('removes a server and reports success per agent', async () => {
    await apiMcpInstall('npm:@test/server', { agents: ['agents'], name: 'srv' })

    const result = await apiMcpRemove('srv', { agents: ['agents'] })

    assert.deepEqual(result, {
      name: 'srv',
      results: [{ agent: 'agents', name: 'srv', success: true }],
    })
    assert.equal(readJson('.agents', 'mcp.json').mcpServers.srv, undefined)
  })

  it('reports success false when removing an unknown server', async () => {
    const result = await apiMcpRemove('missing', { agents: ['agents'] })
    assert.deepEqual(result.results, [
      { agent: 'agents', name: 'missing', success: false },
    ])
  })
})

describe('api mcp check', () => {
  it('returns an empty result when the lockfile has no servers', async () => {
    assert.deepEqual(await apiMcpCheck(), { servers: [], updatesAvailable: 0 })
  })

  it('classifies pinned, unpinned, non-npm and unreachable servers', async () => {
    await writeMcpLock({
      old: { source: 'npm:@test/old@1.0.0', agents: ['agents'] },
      current: {
        source: 'npm:@test/current@2.0.0',
        agents: ['agents', 'cursor'],
      },
      floating: { source: 'npm:floating', agents: ['agents'] },
      local: { source: './local-server', agents: ['agents'] },
      gone: { source: 'npm:gone', agents: ['agents'] },
    })
    const requests = []
    setFetch(async (url) => {
      requests.push(url)
      if (url.includes('/gone/')) return jsonResponse({}, 404)
      if (url.includes('floating')) return jsonResponse({ version: '3.1.0' })
      return jsonResponse({ version: '2.0.0' })
    })

    const result = await apiMcpCheck()

    assert.equal(result.updatesAvailable, 1)
    assert.equal(result.total, 5)
    assert.deepEqual(result.servers, [
      {
        name: 'old',
        status: 'update_available',
        installedVersion: '1.0.0',
        latestVersion: '2.0.0',
        agents: 'agents',
        versionPinned: true,
      },
      {
        name: 'current',
        status: 'up_to_date',
        version: '2.0.0',
        agents: 'agents, cursor',
        versionPinned: true,
      },
      {
        name: 'floating',
        status: 'up_to_date',
        version: '3.1.0',
        agents: 'agents',
        versionPinned: false,
      },
      { name: 'local', status: 'skipped', reason: 'non-npm source' },
      {
        name: 'gone',
        status: 'error',
        reason: 'could not check (registry unreachable)',
      },
    ])
    assert.ok(
      requests.includes('https://registry.npmjs.org/@test%2Fold/latest'),
    )
    assert.equal(requests.length, 4)
  })

  it('reports check failed when fetch throws', async () => {
    await writeMcpLock({ broken: { source: 'npm:broken', agents: [] } })
    setFetch(async () => {
      throw new Error('network down')
    })

    const result = await apiMcpCheck()

    assert.deepEqual(result.servers, [
      { name: 'broken', status: 'error', reason: 'check failed' },
    ])
  })
})

describe('api mcp search', () => {
  it('maps GitHub results to gh: install sources', async () => {
    const requests = []
    setFetch(async (url) => {
      requests.push(url)
      return jsonResponse({
        items: [
          {
            full_name: 'owner/db-mcp',
            description: 'Database server',
            stargazers_count: 7,
            language: 'TypeScript',
            topics: ['mcp-server'],
          },
        ],
      })
    })

    const result = await apiMcpSearch('database')

    assert.match(requests[0], /q=topic:mcp-server\+database/)
    assert.deepEqual(result, {
      results: [
        {
          name: 'owner/db-mcp',
          description: 'Database server',
          stargazers_count: 7,
          language: 'TypeScript',
          topics: ['mcp-server'],
          installSource: 'gh:owner/db-mcp',
        },
      ],
      source: 'github',
      total: 1,
    })
  })

  it('maps npm results to npm: install sources', async () => {
    setFetch(async () =>
      jsonResponse({
        objects: [
          {
            package: {
              name: '@test/fs-mcp',
              description: 'Filesystem server',
              keywords: ['mcp'],
              version: '0.4.0',
            },
          },
        ],
        total: 1,
      }),
    )

    const result = await apiMcpSearch('fs', { npm: true })

    assert.deepEqual(result, {
      results: [
        {
          name: '@test/fs-mcp',
          description: 'Filesystem server',
          keywords: ['mcp'],
          version: '0.4.0',
          installSource: 'npm:@test/fs-mcp',
        },
      ],
      source: 'npm',
      total: 1,
    })
  })

  it('throws on GitHub rate limiting', async () => {
    setFetch(async () => jsonResponse({}, 403))
    await assert.rejects(() => apiMcpSearch('x'), /rate limit reached/)
  })

  it('throws with the status code on other API errors', async () => {
    setFetch(async () => jsonResponse({}, 500))
    await assert.rejects(() => apiMcpSearch('x'), /GitHub API error: 500/)
    await assert.rejects(
      () => apiMcpSearch('x', { npm: true }),
      /npm API error: 500/,
    )
  })
})
