import { stdin as input, stdout as output } from 'node:process'
import { createInterface } from 'node:readline'
import {
  apiMcpInstall,
  apiMcpList,
  apiMcpUpdate,
  apiMcpRemove,
  apiMcpCheck,
  apiMcpSearch,
} from '../api/mcp.js'
import { classifyMcpSource, getSupportedMcpAgents } from '../utils/mcp.js'
import { ICONS, pickItem, renderTable, theme } from '../utils/tui.js'

export { setFetch } from '../api/mcp.js'
import agents from '../agents.js'

function askConfirmation(query) {
  const rl = createInterface({ input, output })
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

function requiresConfirmation(source) {
  const info = classifyMcpSource(source)
  return info.type === 'github'
}

// S-12: npm/local/uvx/etc. sources get a near-max security score (the scanner
// only flags "published by anyone" as low), so surface the real risk directly.
function warnMcpArbitraryCode(source, options) {
  if (options.yes) return
  const info = classifyMcpSource(source)
  if (info.type === 'github') return // github gets full confirmation above
  console.log('\n⚠️  MCP servers execute arbitrary code when started.')
  console.log('   Only install from sources you trust.')
}

function renderMcpResults(results, action) {
  const rows = results.map((r) => [
    r.agent,
    r.success ? `${ICONS.ok} ${action}` : `${ICONS.warn} not supported`,
  ])
  for (const line of renderTable(['AGENT', 'STATUS'], rows)) console.log(line)
}

export async function mcpInstallCommand(source, options) {
  if (requiresConfirmation(source) && !options.yes) {
    console.log(`\n⚠️  Installing MCP server from GitHub repository: ${source}`)
    console.log(
      '   This will download and execute code from an external source.',
    )
    console.log('   Only proceed if you trust the repository.\n')
    const answer = await askConfirmation('Continue with installation? [y/N] ')
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Install cancelled.')
      return
    }
  }

  warnMcpArbitraryCode(source, options)

  if (options.dryRun) {
    const { resolveMcpSource: mcpResolve } = await import('../utils/mcp.js')
    const resolved = await mcpResolve(source)
    const targets =
      options.agents?.length > 0 ? options.agents : getSupportedMcpAgents()
    console.log(`\n📋 [dry-run] Would install MCP server from: ${source}`)
    console.log(`   Command: ${resolved.command} ${resolved.args.join(' ')}`)
    console.log(`   Targets: ${targets.join(', ')}`)
    return
  }

  const result = await apiMcpInstall(source, options)

  renderMcpResults(result.results, 'installed')

  const succeeded = result.results.filter((r) => r.success).length
  console.log(
    `\n✅ Installed MCP server "${result.name}" to ${succeeded}/${result.results.length} agents`,
  )
  return result.results
}

export async function mcpListCommand(options) {
  const result = await apiMcpList(options)

  if (result.total === 0) {
    console.log('No MCP servers configured.')
    return
  }

  console.log(`\nConfigured MCP servers (${result.servers.length}):\n`)
  const rows = result.servers.map((s) => [
    s.agent,
    s.name,
    `${s.command} ${(s.args || []).join(' ')}`,
  ])
  for (const line of renderTable(['AGENT', 'SERVER', 'COMMAND'], rows))
    console.log(line)
}

export async function mcpUpdateCommand(source, options) {
  if (requiresConfirmation(source) && !options.yes) {
    console.log(`\n⚠️  Updating MCP server from GitHub repository: ${source}`)
    console.log(
      '   This will download and execute code from an external source.',
    )
    console.log('   Only proceed if you trust the repository.\n')
    const answer = await askConfirmation('Continue with update? [y/N] ')
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Update cancelled.')
      return
    }
  }

  warnMcpArbitraryCode(source, options)

  if (options.dryRun) {
    const { resolveMcpSource: mcpResolve } = await import('../utils/mcp.js')
    const resolved = await mcpResolve(source)
    const targets =
      options.agents?.length > 0 ? options.agents : getSupportedMcpAgents()
    console.log(`\n📋 [dry-run] Would update MCP server from: ${source}`)
    console.log(`   Command: ${resolved.command} ${resolved.args.join(' ')}`)
    console.log(`   Targets: ${targets.join(', ')}`)
    return
  }

  const result = await apiMcpUpdate(source, options)

  renderMcpResults(result.results, 'updated')

  const succeeded = result.results.filter((r) => r.success).length
  console.log(
    `\n✅ Updated MCP server "${result.name}" on ${succeeded}/${result.results.length} agents`,
  )
  return result.results
}

export async function mcpRemoveCommand(name, options) {
  const result = await apiMcpRemove(name, options)

  renderMcpResults(result.results, 'removed')

  const succeeded = result.results.filter((r) => r.success).length
  if (succeeded === 0) {
    console.log(`No MCP server "${name}" found to remove.`)
  } else {
    console.log(
      `\n✅ Removed MCP server "${name}" from ${succeeded}/${result.results.length} agents`,
    )
  }
  return result.results
}

export async function mcpCheckCommand() {
  const result = await apiMcpCheck()

  if (result.servers.length === 0) {
    console.log('\nNo MCP servers in lockfile.')
    return
  }

  console.log(
    `\nChecking ${result.servers.length} MCP server(s) for updates:\n`,
  )

  const rows = []
  for (const s of result.servers) {
    if (s.status === 'skipped') {
      rows.push([s.name, `${ICONS.skip} skipped`, s.reason])
    } else if (s.status === 'update_available') {
      rows.push([
        s.name,
        `${ICONS.update} update`,
        `${s.installedVersion} → ${s.latestVersion} (${s.agents})`,
      ])
    } else if (s.status === 'up_to_date') {
      const detail =
        s.versionPinned === false
          ? `latest: ${s.version} (no version pinned)`
          : `${s.version} is latest`
      rows.push([s.name, `${ICONS.ok} up to date`, `${detail} (${s.agents})`])
    } else if (s.status === 'error') {
      rows.push([s.name, `${ICONS.error} error`, s.reason])
    }
  }
  for (const line of renderTable(['SERVER', 'STATUS', 'DETAIL'], rows))
    console.log(line)

  console.log(
    result.updatesAvailable > 0
      ? `\n${result.updatesAvailable} MCP server(s) have updates available.\n`
      : '\nAll MCP servers are up to date.\n',
  )
}

function mcpItemCard(item, selected, sourceType) {
  const sel = selected ? theme.reverse(' > ') : '   '
  const name = selected ? theme.bold(item.name) : theme.dim(item.name)
  const desc = item.description || 'No description'
  const installCmd =
    sourceType === 'npm'
      ? `rolecraft mcp install npm:${item.name}`
      : `rolecraft mcp install gh:${item.name}`
  return [
    `${sel}${name}`,
    `   ${desc}`,
    `   ${sourceType === 'npm' ? '📦 npm' : '🟢 github'} · ${installCmd}`,
  ]
}

async function mcpPickAndInstall(items, sourceType, installOptions) {
  const selectedIndex = await pickItem(items, {
    format: (item, selected) => mcpItemCard(item, selected, sourceType),
    question: `Which MCP server to install? [1-${items.length}, q to quit]: `,
    linesPerItem: 3,
    footer: '↑/↓ move · Enter select · q quit',
  })

  if (selectedIndex === -1) {
    console.log('Aborted.')
    return
  }
  if (selectedIndex === -2) return

  const item = items[selectedIndex]
  const source = sourceType === 'npm' ? `npm:${item.name}` : `gh:${item.name}`
  console.log(`\n📦 Installing MCP server "${source}"...`)
  try {
    await mcpInstallCommand(source, installOptions)
  } catch (err) {
    console.error('❌ Failed to install: %s', err?.message)
  }
}

export async function mcpSearchCommand(query, options = {}) {
  const sourceType = options.npm ? 'npm' : 'github'
  let data

  try {
    data = await apiMcpSearch(query, { npm: options.npm })
  } catch (err) {
    if (err.message?.includes('rate limit')) {
      console.log('\n⚠️  GitHub API rate limit reached. Try again later.\n')
      return
    }
    if (err.message?.includes('API error')) {
      throw err
    }
    throw new Error(
      `Failed to search ${sourceType === 'npm' ? 'npm registry' : 'GitHub'}. Check your internet connection.`,
    )
  }

  const items = data.results

  if (items.length === 0) {
    console.log(
      `\nNo MCP ${sourceType === 'npm' ? 'packages' : 'servers'} found for "${query}".`,
    )
    return
  }

  if (options.interactive) {
    await mcpPickAndInstall(items, sourceType, options)
    return
  }

  console.log(
    `\n🔍 ${sourceType === 'npm' ? 'npm MCP packages' : 'MCP server search results'} for "${query}":\n`,
  )
  if (sourceType === 'npm') {
    const rows = items.map((p) => [
      p.name,
      p.description || 'No description',
      (p.keywords || []).slice(0, 3).join(', '),
    ])
    for (const line of renderTable(
      ['PACKAGE', 'DESCRIPTION', 'KEYWORDS'],
      rows,
    ))
      console.log(line)
  } else {
    const rows = items.map((r) => [
      r.full_name || r.name,
      r.description || 'No description',
      String(r.stargazers_count || 0),
      r.language || 'N/A',
    ])
    for (const line of renderTable(
      ['REPOSITORY', 'DESCRIPTION', 'STARS', 'LANGUAGE'],
      rows,
    ))
      console.log(line)
  }
  console.log(`\n${items.length} result(s) found.`)
}

export async function mcpCommand(args) {
  const subcommand = args[0]
  const rest = args.slice(1)

  const agentFlags = ['--agents', ...agents.map((a) => `--${a.flag}`), '--all']
  const agentMap = Object.fromEntries(
    agents.map((a) => [`--${a.flag}`, a.flag]),
  )

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

  const hasScopeFlag = rest.some((f) => agentFlags.includes(f))
  if (hasScopeFlag) {
    for (const [flag, agent] of Object.entries(agentMap)) {
      if (rest.includes(flag) || rest.includes('--all')) {
        options.agents.push(agent)
      }
    }
  }

  switch (subcommand) {
    case 'install': {
      const source = rest.find((a) => !a.startsWith('--'))
      if (!source) {
        console.error(
          'Usage: rolecraft mcp install <source> [--name <name>] [--cursor --claude ...]',
        )
        console.error('Source: npm:package, gh:owner/repo, or local path')
        throw new Error('Missing source argument.')
      }
      return mcpInstallCommand(source, options)
    }
    case 'list':
      return mcpListCommand(options)
    case 'update': {
      const source = rest.find((a) => !a.startsWith('--'))
      if (!source) {
        console.error(
          'Usage: rolecraft mcp update <source> [--name <name>] [--cursor --claude ...]',
        )
        console.error('Source: npm:package, gh:owner/repo, or local path')
        throw new Error('Missing source argument.')
      }
      return mcpUpdateCommand(source, options)
    }
    case 'remove': {
      const name = rest.find((a) => !a.startsWith('--'))
      if (!name) {
        console.error(
          'Usage: rolecraft mcp remove <name> [--cursor --claude ...]',
        )
        console.error('Missing name argument.')
        throw new Error('Missing name argument.')
      }
      return mcpRemoveCommand(name, options)
    }
    case 'check':
      return mcpCheckCommand()
    case 'search': {
      const query = rest.find((a) => !a.startsWith('--'))
      if (!query) {
        console.error(
          'Usage: rolecraft mcp search <query> [--interactive] [--npm]',
        )
        throw new Error('Missing query argument.')
      }
      return mcpSearchCommand(query, {
        interactive: rest.includes('--interactive'),
        npm: rest.includes('--npm'),
        ...options,
      })
    }
    default:
      console.log(`
rolecraft mcp — Manage MCP servers for AI agents

Usage:
  rolecraft mcp install <source>  Install an MCP server
  rolecraft mcp list              List configured MCP servers
  rolecraft mcp search <query>    Search for MCP servers on GitHub
  rolecraft mcp check             Check for MCP server updates
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

Search options:
  --interactive                                   Pick and install from results
  --npm                                           Search npm registry instead of GitHub

Examples:
  rolecraft mcp install npm:@modelcontextprotocol/github --cursor --claude
  rolecraft mcp install npm:@anthropic/postgres-mcp --all
  rolecraft mcp search github --interactive
  rolecraft mcp search postgres --npm
  rolecraft mcp list
  rolecraft mcp remove github-mcp-server --cursor
`)
  }
}
