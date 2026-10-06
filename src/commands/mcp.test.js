import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let mcpModule, _origHome, _tempDir

function capture(stream) {
  const logs = []
  const orig = stream === 'log' ? console.log : console.error
  const fn = (...args) => logs.push(args.join(' '))
  if (stream === 'log') console.log = fn
  else console.error = fn
  return {
    logs,
    restore() {
      if (stream === 'log') console.log = orig
      else console.error = orig
    },
  }
}

before(async () => {
  mcpModule = await import('./mcp.js')
})

describe('mcp command', () => {
  // mcpListCommand sets process.exitCode when an agent config is unreadable.
  // Reset it here or the whole test file exits non-zero and node --test reports
  // the file as failed even though every case passed.
  afterEach(() => {
    process.exitCode = 0
  })

  describe('mcpInstallCommand', () => {
    it(
      'installs MCP server from npm: source',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await mcpModule.mcpInstallCommand('npm:@test/my-server', {
          yes: true,
          agents: ['agents'],
          name: 'my-server',
        })
        restore()

        assert.ok(logs.some((l) => l.includes('Installed MCP server')))
        const configPath = join(process.env.HOME, '.agents', 'mcp.json')
        assert.ok(existsSync(configPath))
        const config = JSON.parse(readFileSync(configPath, 'utf-8'))
        assert.ok(config.mcpServers['my-server'])
      }),
    )

    it(
      'installs MCP server to specific agents',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await mcpModule.mcpInstallCommand('npm:@test/db', {
          yes: true,
          agents: ['cursor', 'claude'],
          name: 'db-mcp',
        })
        restore()

        assert.ok(logs.some((l) => l.includes('cursor')))
        assert.ok(logs.some((l) => l.includes('claude')))

        const cursorConfig = join(process.env.HOME, '.cursor', 'mcp.json')
        assert.ok(existsSync(cursorConfig))
        const ccConfig = join(process.env.HOME, '.claude.json')
        assert.ok(existsSync(ccConfig))
      }),
    )

    it(
      'dry-run does not install anything',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await mcpModule.mcpInstallCommand('npm:@test/dry', {
          agents: ['agents'],
          name: 'dry-test',
          dryRun: true,
        })
        restore()

        assert.ok(logs.some((l) => l.includes('Would install')))
        const configPath = join(process.env.HOME, '.agents', 'mcp.json')
        assert.ok(!existsSync(configPath))
      }),
    )

    it(
      'reports unsupported agents',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await mcpModule.mcpInstallCommand('npm:@test/foo', {
          yes: true,
          agents: ['agents', 'nonexistent'],
          name: 'foo',
        })
        restore()

        assert.ok(logs.some((l) => l.includes('not supported')))
      }),
    )

    it(
      'warns that MCP servers execute arbitrary code for npm sources',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await assert.rejects(
          mcpModule.mcpInstallCommand('npm:@test/warn', {
            agents: ['agents'],
            name: 'warn-test',
          }),
          { userCode: 'MCP_SECURITY_REVIEW' },
        )
        restore()

        assert.ok(
          logs.some((l) => l.includes('execute arbitrary code when started')),
        )
        assert.ok(logs.some((l) => l.includes('Only install from sources')))
      }),
    )

    it(
      'suppresses arbitrary code warning with yes option',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await mcpModule.mcpInstallCommand('npm:@test/warn-yes', {
          agents: ['agents'],
          name: 'warn-yes',
          yes: true,
        })
        restore()

        assert.ok(
          !logs.some((l) => l.includes('execute arbitrary code when started')),
        )
      }),
    )
  })

  describe('mcpListCommand', () => {
    it(
      'lists no servers when none configured',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await mcpModule.mcpListCommand({ agents: ['agents'] })
        restore()

        assert.ok(logs.some((l) => l.includes('No MCP servers configured')))
      }),
    )

    it(
      'reports an unreadable config and still lists the rest',
      withTempDir(async () => {
        const addModule = await import('../utils/mcp.js')
        await addModule.addMcpServer('agents', 'still-listed', {
          command: 'npx',
          args: ['-y', '@test/ok'],
        })
        const { writeFileSync, mkdirSync } = await import('node:fs')
        mkdirSync(join(process.env.HOME, '.cursor'), { recursive: true })
        writeFileSync(
          join(process.env.HOME, '.cursor', 'mcp.json'),
          '{"mcpServers": {',
        )

        const { logs, restore } = capture('log')
        const errorCapture = capture('error')
        await mcpModule.mcpListCommand({ agents: ['agents', 'cursor'] })
        restore()
        errorCapture.restore()

        assert.ok(
          errorCapture.logs.some(
            (l) => l.includes('cursor') && l.includes('not valid JSON'),
          ),
          `expected the corrupt config to be reported: ${errorCapture.logs.join('; ')}`,
        )
        assert.ok(
          logs.some((l) => l.includes('still-listed')),
          'the healthy agent must still be listed',
        )
        assert.equal(process.exitCode, 1, 'a partial listing must not exit 0')
      }),
    )

    it(
      'lists configured servers',
      withTempDir(async () => {
        const addModule = await import('../utils/mcp.js')
        await addModule.addMcpServer('agents', 'list-test', {
          command: 'npx',
          args: ['-y', '@test/list'],
        })

        const { logs, restore } = capture('log')
        await mcpModule.mcpListCommand({ agents: ['agents'] })
        restore()

        assert.ok(logs.some((l) => l.includes('list-test')))
        assert.ok(!logs.some((l) => l.includes('path gone')))
      }),
    )

    it(
      'reports a server whose command path is gone instead of listing it as fine',
      withTempDir(async () => {
        const { mkdirSync, writeFileSync } = await import('node:fs')
        const addModule = await import('../utils/mcp.js')
        await addModule.addMcpServer('agents', 'gh-gone', {
          command: 'node',
          args: [
            join(process.env.HOME, '.agents', 'mcp', 'owner-repo', 'index.js'),
          ],
        })
        mkdirSync(join(process.env.HOME, '.agents', 'mcp', 'owner-repo'), {
          recursive: true,
        })
        writeFileSync(
          join(process.env.HOME, '.agents', 'mcp', 'owner-repo', 'index.js'),
          '// here',
        )

        const { logs, restore } = capture('log')
        await mcpModule.mcpListCommand({ agents: ['agents'] })
        restore()
        assert.ok(!logs.some((l) => l.includes('path gone')))

        // Now take the clone away, the way an OS temp sweep would.
        const { rmSync } = await import('node:fs')
        rmSync(join(process.env.HOME, '.agents', 'mcp', 'owner-repo'), {
          recursive: true,
          force: true,
        })

        const second = capture('log')
        await mcpModule.mcpListCommand({ agents: ['agents'] })
        second.restore()

        const output = second.logs.join('\n')
        assert.match(
          output,
          /path gone/,
          `expected the break to be reported: ${output}`,
        )
        assert.match(output, /rolecraft mcp install/, 'expected a repair hint')
      }),
    )
  })

  describe('mcpUpdateCommand', () => {
    it(
      'updates an MCP server',
      withTempDir(async () => {
        const addModule = await import('../utils/mcp.js')
        await addModule.addMcpServer('agents', 'update-me', {
          command: 'npx',
          args: ['-y', '@test/old'],
        })

        const { logs, restore } = capture('log')
        await mcpModule.mcpUpdateCommand('npm:@test/new', {
          agents: ['agents'],
          name: 'update-me',
          yes: true,
        })
        restore()

        assert.ok(logs.some((l) => l.includes('Updated')))
        const config = JSON.parse(
          readFileSync(join(process.env.HOME, '.agents', 'mcp.json'), 'utf-8'),
        )
        assert.deepEqual(config.mcpServers['update-me'].args, [
          '-y',
          '@test/new',
        ])
      }),
    )

    it(
      'dry-run does not update',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await mcpModule.mcpUpdateCommand('npm:@test/dry', {
          agents: ['agents'],
          name: 'dry-update',
          dryRun: true,
        })
        restore()

        assert.ok(logs.some((l) => l.includes('Would update')))
      }),
    )

    it(
      'reports unsupported agents',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await mcpModule.mcpUpdateCommand('npm:@test/foo', {
          agents: ['agents', 'nonexistent'],
          name: 'update-foo',
          yes: true,
        })
        restore()

        assert.ok(logs.some((l) => l.includes('not supported')))
      }),
    )

    it(
      'warns that MCP servers execute arbitrary code for npm sources on update',
      withTempDir(async () => {
        const addModule = await import('../utils/mcp.js')
        await addModule.addMcpServer('agents', 'warn-update', {
          command: 'npx',
          args: ['-y', '@test/old'],
        })

        const { logs, restore } = capture('log')
        // npm sources cannot be scanned, so the update now stops at the
        // security gate after the arbitrary-code warning has printed.
        await assert.rejects(
          () =>
            mcpModule.mcpUpdateCommand('npm:@test/new', {
              agents: ['agents'],
              name: 'warn-update',
            }),
          /needs security review/,
        )
        restore()

        assert.ok(
          logs.some((l) => l.includes('execute arbitrary code when started')),
        )
      }),
    )
  })

  describe('mcpRemoveCommand', () => {
    it(
      'removes a configured MCP server',
      withTempDir(async () => {
        const addModule = await import('../utils/mcp.js')
        await addModule.addMcpServer('agents', 'to-remove', {
          command: 'npx',
          args: ['-y', '@test/remove'],
        })

        const { logs, restore } = capture('log')
        await mcpModule.mcpRemoveCommand('to-remove', { agents: ['agents'] })
        restore()

        assert.ok(logs.some((l) => l.includes('Removed')))
        const config = JSON.parse(
          readFileSync(join(process.env.HOME, '.agents', 'mcp.json'), 'utf-8'),
        )
        assert.equal(config.mcpServers['to-remove'], undefined)
      }),
    )

    it(
      'reports when nothing to remove',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await mcpModule.mcpRemoveCommand('nothing-here', { agents: ['agents'] })
        restore()

        assert.ok(logs.some((l) => l.includes('No MCP server')))
      }),
    )

    it(
      'reports unsupported agents',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await mcpModule.mcpRemoveCommand('foo', { agents: ['nonexistent'] })
        restore()

        assert.ok(logs.some((l) => l.includes('not supported')))
      }),
    )

    // #403: `mcp remove --dry-run` deleted the server while printing a preview.
    it(
      'dry-run does not remove anything',
      withTempDir(async () => {
        const addModule = await import('../utils/mcp.js')
        await addModule.addMcpServer('agents', 'keep-me', {
          command: 'npx',
          args: ['-y', '@test/keep'],
        })

        const { logs, restore } = capture('log')
        await mcpModule.mcpRemoveCommand('keep-me', {
          agents: ['agents'],
          dryRun: true,
        })
        restore()

        assert.ok(logs.some((l) => l.includes('dry-run')))
        const config = JSON.parse(
          readFileSync(join(process.env.HOME, '.agents', 'mcp.json'), 'utf-8'),
        )
        assert.ok(config.mcpServers['keep-me'])
      }),
    )

    // The class of bug: a preview flag accepted on a path that ignores it.
    // `bin/rolecraft.js` advertises --dry-run for mcp, so every mutating mcp
    // subcommand has to honour it.
    it(
      'every mutating mcp subcommand forwards dryRun',
      withTempDir(async () => {
        const cases = [
          ['mcpInstallCommand', 'npm:@test/a', { agents: ['agents'] }],
          ['mcpUpdateCommand', 'npm:@test/b', { agents: ['agents'] }],
          ['mcpRemoveCommand', 'some-server', { agents: ['agents'] }],
        ]
        for (const [fn, arg, opts] of cases) {
          const { restore } = capture('log')
          await mcpModule[fn](arg, { ...opts, dryRun: true })
          restore()
        }
        // Nothing was installed, updated or removed by any of the three.
        assert.equal(
          existsSync(join(process.env.HOME, '.agents', 'mcp.json')),
          false,
        )
      }),
    )
  })

  describe('mcpCommand dispatcher', () => {
    it(
      'shows help for unknown subcommand and exits non-zero',
      withTempDir(async () => {
        const out = capture('log')
        const err = capture('error')
        await mcpModule.mcpCommand(['unknown'])
        err.restore()
        out.restore()
        assert.ok(out.logs.some((l) => l.includes('rolecraft mcp')))
        assert.ok(err.logs.some((l) => l.includes('Unknown mcp subcommand')))
        assert.equal(process.exitCode, 1)
      }),
    )

    it(
      'dispatches install subcommand',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await mcpModule.mcpCommand([
          'install',
          'npm:@test/dispatch',
          '--yes',
          '--agents',
          'agents',
          '--name',
          'dispatch-test',
        ])
        restore()
        assert.ok(logs.some((l) => l.includes('Installed MCP server')))
        assert.ok(logs.some((l) => l.includes('dispatch-test')))
      }),
    )

    it('exits when install has no source', async () => {
      const { logs, restore } = capture('error')
      try {
        await assert.rejects(
          () => mcpModule.mcpCommand(['install']),
          /Missing source argument/,
        )
      } finally {
        restore()
      }
      assert.ok(logs.some((l) => l.includes('Usage')))
    })

    it(
      'dispatches list subcommand',
      withTempDir(async () => {
        const addModule = await import('../utils/mcp.js')
        await addModule.addMcpServer('agents', 'list-me', {
          command: 'npx',
          args: ['-y', '@test/list'],
        })
        const { logs, restore } = capture('log')
        await mcpModule.mcpCommand(['list', '--agents', 'agents'])
        restore()
        assert.ok(logs.some((l) => l.includes('list-me')))
      }),
    )

    it(
      'dispatches update subcommand',
      withTempDir(async () => {
        const addModule = await import('../utils/mcp.js')
        await addModule.addMcpServer('agents', 'upd-dispatch', {
          command: 'npx',
          args: ['-y', '@test/old'],
        })
        const { logs, restore } = capture('log')
        await mcpModule.mcpCommand([
          'update',
          'npm:@test/new',
          '--agents',
          'agents',
          '--name',
          'upd-dispatch',
          '--yes',
        ])
        restore()
        assert.ok(logs.some((l) => l.includes('Updated')))
      }),
    )

    it('exits when update has no source', async () => {
      const { logs, restore } = capture('error')
      try {
        await assert.rejects(
          () => mcpModule.mcpCommand(['update']),
          /Missing source argument/,
        )
      } finally {
        restore()
      }
      assert.ok(logs.some((l) => l.includes('Usage')))
    })

    it(
      'dispatches remove subcommand',
      withTempDir(async () => {
        const addModule = await import('../utils/mcp.js')
        await addModule.addMcpServer('agents', 'rm-dispatch', {
          command: 'npx',
          args: ['-y', '@test/rm'],
        })
        const { logs, restore } = capture('log')
        await mcpModule.mcpCommand([
          'remove',
          'rm-dispatch',
          '--agents',
          'agents',
        ])
        restore()
        assert.ok(logs.some((l) => l.includes('Removed')))
      }),
    )

    it('exits when remove has no name', async () => {
      const { logs, restore } = capture('error')
      try {
        await assert.rejects(
          () => mcpModule.mcpCommand(['remove']),
          /Missing name argument/,
        )
      } finally {
        restore()
      }
      assert.ok(logs.some((l) => l.includes('Usage')))
    })

    it(
      'parses --name flag',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await mcpModule.mcpCommand([
          'install',
          'npm:@test/name-flag',
          '--yes',
          '--agents',
          'agents',
          '--name',
          'custom-name',
        ])
        restore()
        assert.ok(logs.some((l) => l.includes('custom-name')))
      }),
    )

    it(
      'parses --all flag',
      withTempDir(async () => {
        const { logs, restore } = capture('log')
        await mcpModule.mcpCommand([
          'install',
          'npm:@test/all-flag',
          '--all',
          '--yes',
        ])
        restore()
        assert.ok(logs.some((l) => l.includes('Installed MCP server')))
      }),
    )
  })
})

describe('mcpSearchCommand', () => {
  it('searches GitHub for MCP servers', async () => {
    mcpModule.setFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            items: [
              {
                full_name: 'owner/mcp-server',
                description: 'Test MCP',
                stargazers_count: 10,
                language: 'Go',
                topics: ['mcp-server'],
              },
            ],
          }),
      }),
    )

    const { logs, restore } = capture('log')
    await mcpModule.mcpSearchCommand('test')
    restore()
    assert.ok(logs.some((l) => l.includes('MCP server search results')))
    assert.ok(logs.some((l) => l.includes('owner/mcp-server')))
  })

  it('searches npm for MCP packages', async () => {
    mcpModule.setFetch(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            objects: [
              {
                package: {
                  name: '@scope/mcp-pkg',
                  description: 'MCP pkg',
                  keywords: ['mcp'],
                },
              },
            ],
            total: 1,
          }),
      }),
    )

    const { logs, restore } = capture('log')
    await mcpModule.mcpSearchCommand('test', { npm: true })
    restore()
    assert.ok(logs.some((l) => l.includes('npm MCP packages')))
    assert.ok(logs.some((l) => l.includes('@scope/mcp-pkg')))
  })

  it('handles GitHub rate limit and exits non-zero', async () => {
    mcpModule.setFetch(() =>
      Promise.resolve({
        ok: false,
        status: 403,
        json: () => Promise.resolve({}),
      }),
    )

    const { logs, restore } = capture('log')
    await mcpModule.mcpSearchCommand('test')
    restore()
    assert.ok(logs.some((l) => l.includes('rate limit')))
    assert.equal(process.exitCode, 1)
    process.exitCode = 0
  })

  it('handles GitHub API error', async () => {
    mcpModule.setFetch(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      }),
    )

    await assert.rejects(
      () => mcpModule.mcpSearchCommand('test'),
      /GitHub API error/,
    )
  })

  it('handles npm API error', async () => {
    mcpModule.setFetch(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      }),
    )

    await assert.rejects(
      () => mcpModule.mcpSearchCommand('test', { npm: true }),
      /npm API error/,
    )
  })

  it('handles network error on GitHub search', async () => {
    mcpModule.setFetch(() => Promise.reject(new Error('network error')))

    await assert.rejects(
      () => mcpModule.mcpSearchCommand('test'),
      /Failed to search GitHub/,
    )
  })

  it('handles network error on npm search', async () => {
    mcpModule.setFetch(() => Promise.reject(new Error('network error')))

    await assert.rejects(
      () => mcpModule.mcpSearchCommand('test', { npm: true }),
      /Failed to search npm/,
    )
  })

  it('shows no results for empty GitHub search', async () => {
    mcpModule.setFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [] }),
      }),
    )

    const { logs, restore } = capture('log')
    await mcpModule.mcpSearchCommand('nonexistent-mcp')
    restore()
    assert.ok(logs.some((l) => l.includes('No MCP servers found')))
  })

  it('shows no results for empty npm search', async () => {
    mcpModule.setFetch(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ objects: [], total: 0 }),
      }),
    )

    const { logs, restore } = capture('log')
    await mcpModule.mcpSearchCommand('nonexistent-mcp', { npm: true })
    restore()
    assert.ok(logs.some((l) => l.includes('No MCP packages found')))
  })
})

function withTempDir(fn) {
  return async () => {
    const td = mkdtempSync(join(tmpdir(), 'rolecraft-mcp-cmd-test-'))
    const origHome = process.env.HOME
    const origCwd = process.cwd
    process.env.HOME = td
    process.cwd = () => td
    try {
      await fn(td)
    } finally {
      process.env.HOME = origHome
      process.cwd = origCwd
      try {
        rmSync(td, { recursive: true, force: true })
      } catch {}
    }
  }
}

describe('mcpCheckCommand', () => {
  after(() => {
    mcpModule.setFetch(undefined)
  })

  it(
    'shows no servers when lockfile is empty',
    withTempDir(async (td) => {
      const { writeFileSync, mkdirSync } = await import('node:fs')
      mkdirSync(join(td, '.agents'), { recursive: true })
      writeFileSync(
        join(td, '.agents', '.mcp-lock.json'),
        JSON.stringify({ version: 1, servers: {} }),
      )

      const { logs, restore } = capture('log')
      await mcpModule.mcpCheckCommand()
      restore()
      assert.ok(logs.some((l) => l.includes('No MCP servers')))
    }),
  )

  it(
    'skips non-npm sources',
    withTempDir(async (td) => {
      const { writeFileSync, mkdirSync } = await import('node:fs')
      mkdirSync(join(td, '.agents'), { recursive: true })
      const lock = {
        version: 1,
        servers: {
          'local-server': { source: './local.js', agents: ['cursor'] },
        },
      }
      writeFileSync(join(td, '.agents', '.mcp-lock.json'), JSON.stringify(lock))

      const { logs, restore } = capture('log')
      await mcpModule.mcpCheckCommand()
      restore()
      assert.ok(logs.some((l) => l.includes('non-npm')))
    }),
  )

  it(
    'reports outdated npm package',
    withTempDir(async (td) => {
      const { writeFileSync, mkdirSync } = await import('node:fs')
      mkdirSync(join(td, '.agents'), { recursive: true })
      const lock = {
        version: 1,
        servers: {
          'test-server': { source: 'npm:@test/pkg@1.0.0', agents: ['cursor'] },
        },
      }
      writeFileSync(join(td, '.agents', '.mcp-lock.json'), JSON.stringify(lock))

      mcpModule.setFetch(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: '2.0.0' }),
        }),
      )

      const { logs, restore } = capture('log')
      await mcpModule.mcpCheckCommand()
      restore()
      assert.ok(logs.some((l) => l.includes('1.0.0')))
      assert.ok(logs.some((l) => l.includes('2.0.0')))
      assert.ok(logs.some((l) => l.includes('update')))
    }),
  )

  it(
    'reports up-to-date npm package',
    withTempDir(async (td) => {
      const { writeFileSync, mkdirSync } = await import('node:fs')
      mkdirSync(join(td, '.agents'), { recursive: true })
      const lock = {
        version: 1,
        servers: {
          'test-server': { source: 'npm:@test/pkg@1.0.0', agents: ['cursor'] },
        },
      }
      writeFileSync(join(td, '.agents', '.mcp-lock.json'), JSON.stringify(lock))

      mcpModule.setFetch(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: '1.0.0' }),
        }),
      )

      const { logs, restore } = capture('log')
      await mcpModule.mcpCheckCommand()
      restore()
      assert.ok(logs.some((l) => l.includes('is latest')))
    }),
  )

  it(
    'handles npm registry fetch failure',
    withTempDir(async (td) => {
      const { writeFileSync, mkdirSync } = await import('node:fs')
      mkdirSync(join(td, '.agents'), { recursive: true })
      const lock = {
        version: 1,
        servers: {
          'test-server': { source: 'npm:@test/pkg@1.0.0', agents: ['cursor'] },
        },
      }
      writeFileSync(join(td, '.agents', '.mcp-lock.json'), JSON.stringify(lock))

      mcpModule.setFetch(() => Promise.resolve({ ok: false, status: 404 }))

      const { logs, restore } = capture('log')
      await mcpModule.mcpCheckCommand()
      restore()
      assert.ok(logs.some((l) => l.includes('could not check')))
    }),
  )

  it(
    'reports no version pinned as up to date',
    withTempDir(async (td) => {
      const { writeFileSync, mkdirSync } = await import('node:fs')
      mkdirSync(join(td, '.agents'), { recursive: true })
      const lock = {
        version: 1,
        servers: {
          'test-server': { source: 'npm:@test/pkg', agents: ['cursor'] },
        },
      }
      writeFileSync(join(td, '.agents', '.mcp-lock.json'), JSON.stringify(lock))

      mcpModule.setFetch(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: '2.0.0' }),
        }),
      )

      const { logs, restore } = capture('log')
      await mcpModule.mcpCheckCommand()
      restore()
      assert.ok(logs.some((l) => l.includes('no version pinned')))
    }),
  )
})
