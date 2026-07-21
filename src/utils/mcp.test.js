import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let mcpModule

before(async () => {
  mcpModule = await import('./mcp.js')
})

function withTempDir(fn) {
  return async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-mcp-test-'))
    const origHome = process.env.HOME
    process.env.HOME = tempDir
    try {
      await fn(tempDir)
    } finally {
      process.env.HOME = origHome
      try { rmSync(tempDir, { recursive: true, force: true }) } catch {}
    }
  }
}

describe('mcp', () => {
  describe('getSupportedMcpAgents', () => {
    it('returns only agents with MCP support', () => {
      const agents = mcpModule.getSupportedMcpAgents()
      const supported = ['agents', 'claude', 'cursor', 'windsurf', 'devin', 'copilot', 'continue']
      assert.equal(agents.length, supported.length)
      for (const flag of supported) {
        assert.ok(agents.includes(flag), `expected ${flag} to be in supported list`)
      }
    })
  })

  describe('addMcpServer', () => {
    it('adds an MCP server to agents (opencode) config', withTempDir(async () => {
      const success = await mcpModule.addMcpServer('agents', 'test-server', {
        command: 'npx',
        args: ['-y', '@test/server'],
      })
      assert.ok(success)

      const configPath = join(process.env.HOME, '.agents', 'mcp.json')
      assert.ok(existsSync(configPath))
      const config = JSON.parse(readFileSync(configPath, 'utf-8'))
      assert.ok(config.mcpServers['test-server'])
      assert.equal(config.mcpServers['test-server'].command, 'npx')
      assert.deepEqual(config.mcpServers['test-server'].args, ['-y', '@test/server'])
    }))

    it('adds an MCP server to cursor config', withTempDir(async () => {
      const success = await mcpModule.addMcpServer('cursor', 'db-server', {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/postgres'],
      })
      assert.ok(success)

      const configPath = join(process.env.HOME, '.cursor', 'mcp.json')
      assert.ok(existsSync(configPath))
      const config = JSON.parse(readFileSync(configPath, 'utf-8'))
      assert.ok(config.mcpServers['db-server'])
    }))

    it('adds an MCP server to claude config', withTempDir(async () => {
      await mcpModule.addMcpServer('claude', 'github-server', {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/github'],
      })

      const configPath = join(process.env.HOME, '.claude.json')
      assert.ok(existsSync(configPath))
      const config = JSON.parse(readFileSync(configPath, 'utf-8'))
      assert.ok(config.mcpServers['github-server'])
    }))

    it('adds an MCP server with env vars', withTempDir(async () => {
      await mcpModule.addMcpServer('agents', 'api-server', {
        command: 'node',
        args: ['server.js'],
        env: { API_KEY: 'sk-test' },
      })

      const config = JSON.parse(readFileSync(join(process.env.HOME, '.agents', 'mcp.json'), 'utf-8'))
      assert.equal(config.mcpServers['api-server'].env.API_KEY, 'sk-test')
    }))

    it('adds an MCP server to copilot format', withTempDir(async () => {
      const origCwd = process.cwd
      process.cwd = () => process.env.HOME
      try {
        await mcpModule.addMcpServer('copilot', 'copilot-server', {
          command: 'npx',
          args: ['-y', '@test/copilot-mcp'],
        })

        const configPath = join(process.env.HOME, '.github', 'copilot', '.mcp.json')
        assert.ok(existsSync(configPath))
        const config = JSON.parse(readFileSync(configPath, 'utf-8'))
        assert.ok(config.servers['copilot-server'])
        assert.ok(Array.isArray(config.inputs))
      } finally {
        process.cwd = origCwd
      }
    }))

    it('adds an MCP server to continue format', withTempDir(async () => {
      await mcpModule.addMcpServer('continue', 'continue-server', {
        command: 'npx',
        args: ['-y', '@test/continue-mcp'],
      })

      const configPath = join(process.env.HOME, '.continue', 'config.json')
      assert.ok(existsSync(configPath))
      const config = JSON.parse(readFileSync(configPath, 'utf-8'))
      assert.ok(config.experimental.mcpServers)
      const found = config.experimental.mcpServers.find(s => s.name === 'continue-server')
      assert.ok(found)
      assert.equal(found.command, 'npx')
    }))

    it('updates existing server entry', withTempDir(async () => {
      await mcpModule.addMcpServer('agents', 'update-test', {
        command: 'npx',
        args: ['-y', '@test/v1'],
      })
      await mcpModule.addMcpServer('agents', 'update-test', {
        command: 'npx',
        args: ['-y', '@test/v2'],
      })

      const config = JSON.parse(readFileSync(join(process.env.HOME, '.agents', 'mcp.json'), 'utf-8'))
      assert.deepEqual(config.mcpServers['update-test'].args, ['-y', '@test/v2'])
    }))

    it('returns false for unsupported agent', async () => {
      const success = await mcpModule.addMcpServer('nonexistent-agent', 'test', {
        command: 'npx',
        args: [],
      })
      assert.equal(success, false)
    })
  })

  describe('updateMcpServer', () => {
    it('replaces existing MCP server configuration', withTempDir(async () => {
      await mcpModule.addMcpServer('agents', 'my-server', {
        command: 'npx',
        args: ['-y', '@test/v1'],
      })
      const success = await mcpModule.updateMcpServer('agents', 'my-server', {
        command: 'npx',
        args: ['-y', '@test/v2'],
      })
      assert.ok(success)

      const config = JSON.parse(readFileSync(join(process.env.HOME, '.agents', 'mcp.json'), 'utf-8'))
      assert.deepEqual(config.mcpServers['my-server'].args, ['-y', '@test/v2'])
    }))

    it('updates copilot format server', withTempDir(async () => {
      const origCwd = process.cwd
      process.cwd = () => process.env.HOME
      try {
        await mcpModule.addMcpServer('copilot', 'copilot-update', {
          command: 'npx',
          args: ['-y', '@test/v1'],
        })
        const success = await mcpModule.updateMcpServer('copilot', 'copilot-update', {
          command: 'npx',
          args: ['-y', '@test/v2'],
        })
        assert.ok(success)
        const config = JSON.parse(readFileSync(join(process.env.HOME, '.github', 'copilot', '.mcp.json'), 'utf-8'))
        assert.deepEqual(config.servers['copilot-update'].args, ['-y', '@test/v2'])
      } finally {
        process.cwd = origCwd
      }
    }))

    it('updates continue format server', withTempDir(async () => {
      await mcpModule.addMcpServer('continue', 'cont-update', {
        command: 'npx',
        args: ['-y', '@test/v1'],
      })
      const success = await mcpModule.updateMcpServer('continue', 'cont-update', {
        command: 'npx',
        args: ['-y', '@test/v2'],
      })
      assert.ok(success)
      const config = JSON.parse(readFileSync(join(process.env.HOME, '.continue', 'config.json'), 'utf-8'))
      const found = config.experimental.mcpServers.find(s => s.name === 'cont-update')
      assert.ok(found)
      assert.deepEqual(found.args, ['-y', '@test/v2'])
    }))
  })

  describe('removeMcpServer', () => {
    it('removes an MCP server from config', withTempDir(async () => {
      await mcpModule.addMcpServer('agents', 'to-remove', {
        command: 'npx',
        args: ['-y', '@test/to-remove'],
      })
      const success = await mcpModule.removeMcpServer('agents', 'to-remove')
      assert.ok(success)

      const config = JSON.parse(readFileSync(join(process.env.HOME, '.agents', 'mcp.json'), 'utf-8'))
      assert.equal(config.mcpServers['to-remove'], undefined)
    }))

    it('removes copilot format server', withTempDir(async () => {
      const origCwd = process.cwd
      process.cwd = () => process.env.HOME
      try {
        await mcpModule.addMcpServer('copilot', 'copilot-rm', {
          command: 'npx',
          args: ['-y', '@test/copilot-rm'],
        })
        const success = await mcpModule.removeMcpServer('copilot', 'copilot-rm')
        assert.ok(success)
        const config = JSON.parse(readFileSync(join(process.env.HOME, '.github', 'copilot', '.mcp.json'), 'utf-8'))
        assert.equal(config.servers['copilot-rm'], undefined)
      } finally {
        process.cwd = origCwd
      }
    }))

    it('removes continue format server', withTempDir(async () => {
      await mcpModule.addMcpServer('continue', 'cont-rm', {
        command: 'npx',
        args: ['-y', '@test/cont-rm'],
      })
      const success = await mcpModule.removeMcpServer('continue', 'cont-rm')
      assert.ok(success)
      const config = JSON.parse(readFileSync(join(process.env.HOME, '.continue', 'config.json'), 'utf-8'))
      assert.equal(config.experimental.mcpServers.length, 0)
    }))

    it('returns false when server does not exist', withTempDir(async () => {
      const success = await mcpModule.removeMcpServer('agents', 'non-existent')
      assert.equal(success, false)
    }))

    it('returns false for unsupported agent', async () => {
      const success = await mcpModule.removeMcpServer('nonexistent', 'test')
      assert.equal(success, false)
    })
  })

  describe('listMcpServers', () => {
    it('returns empty array when no servers configured', withTempDir(async () => {
      const servers = await mcpModule.listMcpServers('agents')
      assert.deepEqual(servers, [])
    }))

    it('lists configured servers', withTempDir(async () => {
      await mcpModule.addMcpServer('agents', 'list-test-1', {
        command: 'npx',
        args: ['-y', '@test/one'],
      })
      await mcpModule.addMcpServer('agents', 'list-test-2', {
        command: 'node',
        args: ['server.js'],
      })

      const servers = await mcpModule.listMcpServers('agents')
      assert.equal(servers.length, 2)
      assert.ok(servers.some(s => s.name === 'list-test-1'))
      assert.ok(servers.some(s => s.name === 'list-test-2'))
    }))

    it('lists copilot format servers', withTempDir(async () => {
      const origCwd = process.cwd
      process.cwd = () => process.env.HOME
      try {
        await mcpModule.addMcpServer('copilot', 'copilot-list', {
          command: 'npx',
          args: ['-y', '@test/cp-list'],
        })
        const servers = await mcpModule.listMcpServers('copilot')
        assert.equal(servers.length, 1)
        assert.equal(servers[0].name, 'copilot-list')
      } finally {
        process.cwd = origCwd
      }
    }))

    it('lists continue format servers', withTempDir(async () => {
      await mcpModule.addMcpServer('continue', 'cont-list', {
        command: 'npx',
        args: ['-y', '@test/cont-list'],
      })
      const servers = await mcpModule.listMcpServers('continue')
      assert.equal(servers.length, 1)
      assert.equal(servers[0].name, 'cont-list')
    }))
  })

  describe('parseMcpServersFromSkill', () => {
    it('parses mcp_servers from SKILL.md frontmatter', () => {
      const content = `---
name: my-skill
description: Test skill
mcp_servers:
  - name: github
    source: gh:github/github-mcp-server
  - name: postgres
    source: npm:@anthropic/postgres-mcp
---

# Skill content here
`
      const servers = mcpModule.parseMcpServersFromSkill(content)
      assert.equal(servers.length, 2)
      assert.equal(servers[0].name, 'github')
      assert.equal(servers[0].source, 'gh:github/github-mcp-server')
      assert.equal(servers[1].name, 'postgres')
      assert.equal(servers[1].source, 'npm:@anthropic/postgres-mcp')
    })

    it('returns empty array when no mcp_servers in frontmatter', () => {
      const content = `---
name: simple-skill
---

Just content
`
      const servers = mcpModule.parseMcpServersFromSkill(content)
      assert.deepEqual(servers, [])
    })

    it('returns empty array when no frontmatter', () => {
      const servers = mcpModule.parseMcpServersFromSkill('Just content without frontmatter')
      assert.deepEqual(servers, [])
    })
  })

  describe('classifyMcpSource', () => {
    it('classifies npm: source', () => {
      const info = mcpModule.classifyMcpSource('npm:@test/pkg')
      assert.equal(info.type, 'npm')
    })

    it('classifies gh: source', () => {
      const info = mcpModule.classifyMcpSource('gh:test/repo')
      assert.equal(info.type, 'github')
    })

    it('classifies uvx: source', () => {
      const info = mcpModule.classifyMcpSource('uvx:@anthropic/postgres-mcp')
      assert.equal(info.type, 'uvx')
    })

    it('classifies pipx: source', () => {
      const info = mcpModule.classifyMcpSource('pipx:postgres-mcp')
      assert.equal(info.type, 'pipx')
    })

    it('classifies go: source', () => {
      const info = mcpModule.classifyMcpSource('go:github.com/org/mcp-server')
      assert.equal(info.type, 'go')
    })

    it('classifies deno: source', () => {
      const info = mcpModule.classifyMcpSource('deno:jsr:@org/mcp-server')
      assert.equal(info.type, 'deno')
    })

    it('classifies cargo: source', () => {
      const info = mcpModule.classifyMcpSource('cargo:my-mcp-server')
      assert.equal(info.type, 'cargo')
    })

    it('classifies local path as local', () => {
      const info = mcpModule.classifyMcpSource('./local/server.js')
      assert.equal(info.type, 'local')
    })

    it('classifies absolute path as local', () => {
      const info = mcpModule.classifyMcpSource('/home/user/server.js')
      assert.equal(info.type, 'local')
    })
  })

  describe('resolveMcpSource', () => {
    it('resolves npm: source', () => {
      const resolved = mcpModule.resolveMcpSource('npm:@modelcontextprotocol/github')
      assert.equal(resolved.command, 'npx')
      assert.deepEqual(resolved.args, ['-y', '@modelcontextprotocol/github'])
      assert.equal(resolved.sourceType, 'npm')
    })

    it('resolves uvx: source', () => {
      const resolved = mcpModule.resolveMcpSource('uvx:@anthropic/postgres-mcp')
      assert.equal(resolved.command, 'uvx')
      assert.deepEqual(resolved.args, ['@anthropic/postgres-mcp'])
      assert.equal(resolved.sourceType, 'uvx')
    })

    it('resolves pipx: source', () => {
      const resolved = mcpModule.resolveMcpSource('pipx:postgres-mcp')
      assert.equal(resolved.command, 'pipx')
      assert.deepEqual(resolved.args, ['run', 'postgres-mcp'])
      assert.equal(resolved.sourceType, 'pipx')
    })

    it('resolves go: source', () => {
      const resolved = mcpModule.resolveMcpSource('go:github.com/org/mcp-server')
      assert.equal(resolved.command, 'go')
      assert.deepEqual(resolved.args, ['run', 'github.com/org/mcp-server'])
      assert.equal(resolved.sourceType, 'go')
    })

    it('resolves deno: source', () => {
      const resolved = mcpModule.resolveMcpSource('deno:jsr:@org/mcp-server')
      assert.equal(resolved.command, 'deno')
      assert.deepEqual(resolved.args, ['run', 'jsr:@org/mcp-server'])
      assert.equal(resolved.sourceType, 'deno')
    })

    it('resolves cargo: source', () => {
      const resolved = mcpModule.resolveMcpSource('cargo:my-mcp-server')
      assert.equal(resolved.command, 'cargo')
      assert.deepEqual(resolved.args, ['run', 'my-mcp-server'])
      assert.equal(resolved.sourceType, 'cargo')
    })

    it('resolves local path source', () => {
      const resolved = mcpModule.resolveMcpSource('/path/to/server.js')
      assert.equal(resolved.command, 'node')
      assert.deepEqual(resolved.args, ['/path/to/server.js'])
      assert.equal(resolved.sourceType, 'local')
    })

    it('resolves relative path source', () => {
      const resolved = mcpModule.resolveMcpSource('./my-server.js')
      assert.equal(resolved.command, 'node')
      assert.equal(resolved.sourceType, 'local')
    })

    it('resolves ~ path source', () => {
      const resolved = mcpModule.resolveMcpSource('~/dev/my-server.js')
      assert.equal(resolved.command, 'node')
      assert.equal(resolved.sourceType, 'local')
    })

    it('throws for unknown source format', () => {
      assert.throws(() => mcpModule.resolveMcpSource('invalid-source'), /Unknown MCP source format/)
    })

    it('throws when gh: source clone fails', () => {
      mcpModule.setSpawnSync(() => ({ status: 1, stderr: 'mock failure' }))
      assert.throws(() => mcpModule.resolveMcpSource('gh:test/repo'), /Failed to clone/)
      mcpModule.setSpawnSync(undefined)
    })

    it('gh: source success path', withTempDir(async (td) => {
      mcpModule.setSpawnSync((cmd, args) => {
        if (cmd === 'git') {
          const cloneDir = args[args.length - 1]
          mkdirSync(cloneDir, { recursive: true })
          writeFileSync(join(cloneDir, 'package.json'), JSON.stringify({ main: 'index.js' }))
          return { status: 0 }
        }
        return { status: 0 }
      })
      try {
        const resolved = mcpModule.resolveMcpSource('gh:test/mcp-server')
        assert.equal(resolved.command, 'node')
        assert.equal(resolved.sourceType, 'github')
        assert.equal(resolved.repo, 'test/mcp-server')
      } finally {
        mcpModule.setSpawnSync(undefined)
      }
    }))
  })

  describe('readMcpConfig', () => {
    it('returns null for unsupported agent', async () => {
      const result = await mcpModule.readMcpConfig('nonexistent')
      assert.equal(result, null)
    })

    it('returns empty data for non-existent config', withTempDir(async () => {
      const result = await mcpModule.readMcpConfig('agents')
      assert.ok(result)
      assert.deepEqual(result.data, {})
    }))
  })

  describe('setExecSync', () => {
    it('replaces the execSync implementation', () => {
      const origExec = mcpModule.setExecSync(() => 'mocked')
      const mockFn = () => 'mocked'
      mcpModule.setExecSync(mockFn)
      assert.equal(mockFn(), 'mocked')
      mcpModule.setExecSync(undefined)
    })
  })

  describe('installMcpServersFromSkill', () => {
    it('returns empty array when no mcp_servers in content', async () => {
      const results = await mcpModule.installMcpServersFromSkill('no servers here', ['agents'])
      assert.deepEqual(results, [])
    })

    it('installs MCP servers for given targets', withTempDir(async () => {
      const content = `---
name: test
mcp_servers:
  - name: test-mcp
    source: npm:@test/test-pkg
---
`
      const results = await mcpModule.installMcpServersFromSkill(content, ['agents'])
      assert.equal(results.length, 1)
      assert.equal(results[0].name, 'test-mcp')
      assert.equal(results[0].agent, 'agents')
      assert.ok(results[0].success)

      const config = JSON.parse(readFileSync(join(process.env.HOME, '.agents', 'mcp.json'), 'utf-8'))
      assert.ok(config.mcpServers['test-mcp'])
    }))
  })
})
