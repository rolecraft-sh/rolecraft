import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let mcpModule, origHome, tempDir

function capture(stream) {
  const logs = []
  const orig = stream === 'log' ? console.log : console.error
  const fn = (...args) => logs.push(args.join(' '))
  if (stream === 'log') console.log = fn
  else console.error = fn
  return {
    logs,
    restore() { if (stream === 'log') console.log = orig; else console.error = orig }
  }
}

before(async () => {
  mcpModule = await import('./mcp.js')
})

describe('mcp command', () => {
  describe('mcpInstallCommand', () => {
    it('installs MCP server from npm: source', withTempDir(async () => {
      const { logs, restore } = capture('log')
      await mcpModule.mcpInstallCommand('npm:@test/my-server', { agents: ['agents'], name: 'my-server' })
      restore()

      assert.ok(logs.some(l => l.includes('Installed MCP server')))
      const configPath = join(process.env.HOME, '.agents', 'mcp.json')
      assert.ok(existsSync(configPath))
      const config = JSON.parse(readFileSync(configPath, 'utf-8'))
      assert.ok(config.mcpServers['my-server'])
    }))

    it('installs MCP server to specific agents', withTempDir(async () => {
      const { logs, restore } = capture('log')
      await mcpModule.mcpInstallCommand('npm:@test/db', { agents: ['cursor', 'claude'], name: 'db-mcp' })
      restore()

      assert.ok(logs.some(l => l.includes('cursor')))
      assert.ok(logs.some(l => l.includes('claude')))

      const cursorConfig = join(process.env.HOME, '.cursor', 'mcp.json')
      assert.ok(existsSync(cursorConfig))
      const ccConfig = join(process.env.HOME, '.claude', 'claude_code.json')
      assert.ok(existsSync(ccConfig))
    }))

    it('dry-run does not install anything', withTempDir(async () => {
      const { logs, restore } = capture('log')
      await mcpModule.mcpInstallCommand('npm:@test/dry', { agents: ['agents'], name: 'dry-test', dryRun: true })
      restore()

      assert.ok(logs.some(l => l.includes('Would install')))
      const configPath = join(process.env.HOME, '.agents', 'mcp.json')
      assert.ok(!existsSync(configPath))
    }))

    it('reports unsupported agents', withTempDir(async () => {
      const { logs, restore } = capture('log')
      await mcpModule.mcpInstallCommand('npm:@test/foo', { agents: ['agents', 'nonexistent'], name: 'foo' })
      restore()

      assert.ok(logs.some(l => l.includes('not supported')))
    }))
  })

  describe('mcpListCommand', () => {
    it('lists no servers when none configured', withTempDir(async () => {
      const { logs, restore } = capture('log')
      await mcpModule.mcpListCommand({ agents: ['agents'] })
      restore()

      assert.ok(logs.some(l => l.includes('No MCP servers configured')))
    }))

    it('lists configured servers', withTempDir(async () => {
      const addModule = await import('../utils/mcp.js')
      await addModule.addMcpServer('agents', 'list-test', { command: 'npx', args: ['-y', '@test/list'] })

      const { logs, restore } = capture('log')
      await mcpModule.mcpListCommand({ agents: ['agents'] })
      restore()

      assert.ok(logs.some(l => l.includes('list-test')))
    }))
  })

  describe('mcpUpdateCommand', () => {
    it('updates an MCP server', withTempDir(async () => {
      const addModule = await import('../utils/mcp.js')
      await addModule.addMcpServer('agents', 'update-me', { command: 'npx', args: ['-y', '@test/old'] })

      const { logs, restore } = capture('log')
      await mcpModule.mcpUpdateCommand('npm:@test/new', { agents: ['agents'], name: 'update-me' })
      restore()

      assert.ok(logs.some(l => l.includes('Updated')))
      const config = JSON.parse(readFileSync(join(process.env.HOME, '.agents', 'mcp.json'), 'utf-8'))
      assert.deepEqual(config.mcpServers['update-me'].args, ['-y', '@test/new'])
    }))

    it('dry-run does not update', withTempDir(async () => {
      const { logs, restore } = capture('log')
      await mcpModule.mcpUpdateCommand('npm:@test/dry', { agents: ['agents'], name: 'dry-update', dryRun: true })
      restore()

      assert.ok(logs.some(l => l.includes('Would update')))
    }))

    it('reports unsupported agents', withTempDir(async () => {
      const { logs, restore } = capture('log')
      await mcpModule.mcpUpdateCommand('npm:@test/foo', { agents: ['agents', 'nonexistent'], name: 'update-foo' })
      restore()

      assert.ok(logs.some(l => l.includes('not supported')))
    }))
  })

  describe('mcpRemoveCommand', () => {
    it('removes a configured MCP server', withTempDir(async () => {
      const addModule = await import('../utils/mcp.js')
      await addModule.addMcpServer('agents', 'to-remove', { command: 'npx', args: ['-y', '@test/remove'] })

      const { logs, restore } = capture('log')
      await mcpModule.mcpRemoveCommand('to-remove', { agents: ['agents'] })
      restore()

      assert.ok(logs.some(l => l.includes('Removed')))
      const config = JSON.parse(readFileSync(join(process.env.HOME, '.agents', 'mcp.json'), 'utf-8'))
      assert.equal(config.mcpServers['to-remove'], undefined)
    }))

    it('reports when nothing to remove', withTempDir(async () => {
      const { logs, restore } = capture('log')
      await mcpModule.mcpRemoveCommand('nothing-here', { agents: ['agents'] })
      restore()

      assert.ok(logs.some(l => l.includes('No MCP server')))
    }))

    it('reports unsupported agents', withTempDir(async () => {
      const { logs, restore } = capture('log')
      await mcpModule.mcpRemoveCommand('foo', { agents: ['nonexistent'] })
      restore()

      assert.ok(logs.some(l => l.includes('not supported')))
    }))
  })

  describe('mcpCommand dispatcher', () => {
    it('shows help for unknown subcommand', withTempDir(async () => {
      const { logs, restore } = capture('log')
      await mcpModule.mcpCommand(['unknown'])
      restore()
      assert.ok(logs.some(l => l.includes('rolecraft mcp')))
    }))

    it('dispatches install subcommand', withTempDir(async () => {
      const { logs, restore } = capture('log')
      await mcpModule.mcpCommand(['install', 'npm:@test/dispatch', '--agents', 'agents', '--name', 'dispatch-test'])
      restore()
      assert.ok(logs.some(l => l.includes('Installed MCP server')))
      assert.ok(logs.some(l => l.includes('dispatch-test')))
    }))

    it('exits when install has no source', async () => {
      const origExit = process.exit
      let exitCode
      process.exit = (c) => { exitCode = c; throw new Error('exit') }
      const { logs, restore } = capture('error')
      try {
        await assert.rejects(() => mcpModule.mcpCommand(['install']), /exit/)
      } finally {
        process.exit = origExit
        restore()
      }
      assert.equal(exitCode, 1)
      assert.ok(logs.some(l => l.includes('Usage')))
    })

    it('dispatches list subcommand', withTempDir(async () => {
      const addModule = await import('../utils/mcp.js')
      await addModule.addMcpServer('agents', 'list-me', { command: 'npx', args: ['-y', '@test/list'] })
      const { logs, restore } = capture('log')
      await mcpModule.mcpCommand(['list', '--agents', 'agents'])
      restore()
      assert.ok(logs.some(l => l.includes('list-me')))
    }))

    it('dispatches update subcommand', withTempDir(async () => {
      const addModule = await import('../utils/mcp.js')
      await addModule.addMcpServer('agents', 'upd-dispatch', { command: 'npx', args: ['-y', '@test/old'] })
      const { logs, restore } = capture('log')
      await mcpModule.mcpCommand(['update', 'npm:@test/new', '--agents', 'agents', '--name', 'upd-dispatch'])
      restore()
      assert.ok(logs.some(l => l.includes('Updated')))
    }))

    it('exits when update has no source', async () => {
      const origExit = process.exit
      let exitCode
      process.exit = (c) => { exitCode = c; throw new Error('exit') }
      const { logs, restore } = capture('error')
      try {
        await assert.rejects(() => mcpModule.mcpCommand(['update']), /exit/)
      } finally {
        process.exit = origExit
        restore()
      }
      assert.equal(exitCode, 1)
      assert.ok(logs.some(l => l.includes('Usage')))
    })

    it('dispatches remove subcommand', withTempDir(async () => {
      const addModule = await import('../utils/mcp.js')
      await addModule.addMcpServer('agents', 'rm-dispatch', { command: 'npx', args: ['-y', '@test/rm'] })
      const { logs, restore } = capture('log')
      await mcpModule.mcpCommand(['remove', 'rm-dispatch', '--agents', 'agents'])
      restore()
      assert.ok(logs.some(l => l.includes('Removed')))
    }))

    it('exits when remove has no name', async () => {
      const origExit = process.exit
      let exitCode
      process.exit = (c) => { exitCode = c; throw new Error('exit') }
      const { logs, restore } = capture('error')
      try {
        await assert.rejects(() => mcpModule.mcpCommand(['remove']), /exit/)
      } finally {
        process.exit = origExit
        restore()
      }
      assert.equal(exitCode, 1)
      assert.ok(logs.some(l => l.includes('Usage')))
    })

    it('parses --name flag', withTempDir(async () => {
      const { logs, restore } = capture('log')
      await mcpModule.mcpCommand(['install', 'npm:@test/name-flag', '--agents', 'agents', '--name', 'custom-name'])
      restore()
      assert.ok(logs.some(l => l.includes('custom-name')))
    }))

    it('parses --all flag', withTempDir(async () => {
      const { logs, restore } = capture('log')
      await mcpModule.mcpCommand(['install', 'npm:@test/all-flag', '--all'])
      restore()
      assert.ok(logs.some(l => l.includes('Installed MCP server')))
    }))
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
      try { rmSync(td, { recursive: true, force: true }) } catch {}
    }
  }
}
