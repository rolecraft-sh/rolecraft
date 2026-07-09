import { addMcpServer, removeMcpServer, updateMcpServer, listMcpServers, getSupportedMcpAgents, resolveMcpSource, classifyMcpSource } from '../utils/mcp.js'
import { createInterface } from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
import agents from '../agents.js'

function askConfirmation(query) {
  const rl = createInterface({ input, output })
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

function requiresConfirmation(source) {
  const info = classifyMcpSource(source)
  return info.type === 'github'
}

export async function mcpInstallCommand(source, options) {
  if (requiresConfirmation(source) && !options.yes) {
    console.log(`\n⚠️  Installing MCP server from GitHub repository: ${source}`)
    console.log('   This will download and execute code from an external source.')
    console.log('   Only proceed if you trust the repository.\n')
    const answer = await askConfirmation('Continue with installation? [y/N] ')
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Install cancelled.')
      return
    }
  }

  const resolved = resolveMcpSource(source)

  const targets = options.agents && options.agents.length > 0
    ? options.agents
    : getSupportedMcpAgents()

  if (options.dryRun) {
    console.log(`📋 Would install MCP server from: ${source}`)
    console.log(`   Command: ${resolved.command} ${resolved.args.join(' ')}`)
    console.log(`   Targets: ${targets.join(', ')}`)
    return
  }

  const name = options.name || resolved.packageName || resolved.repo || resolved.path?.split('/').pop() || 'mcp-server'

  const results = []
  for (const agent of targets) {
    const success = await addMcpServer(agent, name, resolved)
    results.push({ agent, name, success })
    if (success) {
      console.log(`   ✅ ${agent}: MCP server "${name}" installed`)
    } else {
      console.log(`   ⚠️  ${agent}: not supported`)
    }
  }

  const succeeded = results.filter(r => r.success).length
  console.log(`\n✅ Installed MCP server "${name}" to ${succeeded}/${targets.length} agents`)
  return results
}

export async function mcpListCommand(options) {
  const targets = options.agents && options.agents.length > 0
    ? options.agents
    : getSupportedMcpAgents()

  let total = 0
  for (const agent of targets) {
    const servers = await listMcpServers(agent)
    if (servers.length > 0) {
      console.log(`\n${agent}:`)
      for (const s of servers) {
        console.log(`   - ${s.name} (${s.command} ${s.args.join(' ')})`)
        total++
      }
    }
  }

  if (total === 0) {
    console.log('No MCP servers configured.')
  }
}

export async function mcpUpdateCommand(source, options) {
  if (requiresConfirmation(source) && !options.yes) {
    console.log(`\n⚠️  Updating MCP server from GitHub repository: ${source}`)
    console.log('   This will download and execute code from an external source.')
    console.log('   Only proceed if you trust the repository.\n')
    const answer = await askConfirmation('Continue with update? [y/N] ')
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Update cancelled.')
      return
    }
  }

  const resolved = resolveMcpSource(source)

  const targets = options.agents && options.agents.length > 0
    ? options.agents
    : getSupportedMcpAgents()

  if (options.dryRun) {
    console.log(`📋 Would update MCP server from: ${source}`)
    console.log(`   Command: ${resolved.command} ${resolved.args.join(' ')}`)
    console.log(`   Targets: ${targets.join(', ')}`)
    return
  }

  const name = options.name || resolved.packageName || resolved.repo || resolved.path?.split('/').pop() || 'mcp-server'

  const results = []
  for (const agent of targets) {
    const success = await updateMcpServer(agent, name, resolved)
    results.push({ agent, name, success })
    if (success) {
      console.log(`   ✅ ${agent}: MCP server "${name}" updated`)
    } else {
      console.log(`   ⚠️  ${agent}: not supported`)
    }
  }

  const succeeded = results.filter(r => r.success).length
  console.log(`\n✅ Updated MCP server "${name}" on ${succeeded}/${targets.length} agents`)
  return results
}

export async function mcpRemoveCommand(name, options) {
  const targets = options.agents && options.agents.length > 0
    ? options.agents
    : getSupportedMcpAgents()

  const results = []
  for (const agent of targets) {
    const success = await removeMcpServer(agent, name)
    results.push({ agent, name, success })
    if (success) {
      console.log(`   ✅ ${agent}: MCP server "${name}" removed`)
    } else {
      console.log(`   ⚠️  ${agent}: not supported`)
    }
  }

  const succeeded = results.filter(r => r.success).length
  if (succeeded === 0) {
    console.log(`No MCP server "${name}" found to remove.`)
  } else {
    console.log(`\n✅ Removed MCP server "${name}" from ${succeeded}/${targets.length} agents`)
  }
  return results
}

export async function mcpCommand(args) {
  const subcommand = args[0]
  const rest = args.slice(1)

  const agentFlags = ['--agents', ...agents.map(a => `--${a.flag}`), '--all']

  const agentMap = Object.fromEntries(agents.map(a => [`--${a.flag}`, a.flag]))

  const options = {
    dryRun: rest.includes('--dry-run'),
    yes: rest.includes('--yes') || rest.includes('-y'),
    name: null,
    agents: [],
  }

  const nameIdx = rest.indexOf('--name')
  if (nameIdx >= 0 && nameIdx + 1 < rest.length) {
    options.name = rest[nameIdx + 1]
  }

  const hasScopeFlag = rest.some(f => agentFlags.includes(f))
  if (hasScopeFlag) {
    for (const [flag, agent] of Object.entries(agentMap)) {
      if (rest.includes(flag) || rest.includes('--all')) {
        options.agents.push(agent)
      }
    }
  }

  switch (subcommand) {
    case 'install': {
      const source = rest.find(a => !a.startsWith('--'))
      if (!source) {
        console.error('Usage: rolecraft mcp install <source> [--name <name>] [--cursor --claude ...]')
        console.error('Source: npm:package, gh:owner/repo, or local path')
        process.exit(1)
      }
      return mcpInstallCommand(source, options)
    }
    case 'list':
      return mcpListCommand(options)
    case 'update': {
      const source = rest.find(a => !a.startsWith('--'))
      if (!source) {
        console.error('Usage: rolecraft mcp update <source> [--name <name>] [--cursor --claude ...]')
        console.error('Source: npm:package, gh:owner/repo, or local path')
        process.exit(1)
      }
      return mcpUpdateCommand(source, options)
    }
    case 'remove': {
      const name = rest.find(a => !a.startsWith('--'))
      if (!name) {
        console.error('Usage: rolecraft mcp remove <name> [--cursor --claude ...]')
        process.exit(1)
      }
      return mcpRemoveCommand(name, options)
    }
    default:
      console.log(`
rolecraft mcp — Manage MCP servers for AI agents

Usage:
  rolecraft mcp install <source>  Install an MCP server
  rolecraft mcp list              List configured MCP servers
  rolecraft mcp update <source>   Update an MCP server (reinstall)
  rolecraft mcp remove <name>     Remove an MCP server

Sources:
  npm:package     Install from npm (e.g., npm:@modelcontextprotocol/github)
  gh:owner/repo   Install from GitHub (e.g., gh:github/github-mcp-server)
  ./path          Install from local path

Options:
  --agents, --cursor, --claude, --copilot, etc.  Target specific agents
  --all                                           Install to all supported agents
  --name <name>                                   Override server name
  --yes, -y                                       Skip confirmation for external sources
  --dry-run                                       Preview without making changes

Examples:
  rolecraft mcp install npm:@modelcontextprotocol/github --cursor --claude
  rolecraft mcp install npm:@anthropic/postgres-mcp --all
  rolecraft mcp list
  rolecraft mcp remove github-mcp-server --cursor
`)
  }
}
