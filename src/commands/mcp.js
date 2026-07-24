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

export { setFetch } from '../api/mcp.js'
import agents from '../agents.js'

const CSI = '\x1b['
const sgr = (n) => `${CSI}${n}m`
const cursorTo = (r, c) => `${CSI}${r};${c}H`
const eraseLine = `${CSI}K`
const hideCursor = `${CSI}?25l`
const showCursor = `${CSI}?25h`
const clearScreen = `${CSI}2J${CSI}H`

const text = (code, s) => `${code}${s}${sgr(0)}`
const cyan = (s) => text(sgr(36), s)
const yellow = (s) => text(sgr(33), s)
const dim = (s) => text(sgr(2), s)
const bold = (s) => text(sgr(1), s)

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

  if (options.dryRun) {
    const resolved = (await import('../utils/mcp.js')).resolveMcpSource(source)
    const targets =
      options.agents?.length > 0 ? options.agents : getSupportedMcpAgents()
    console.log(`\n📋 [dry-run] Would install MCP server from: ${source}`)
    console.log(`   Command: ${resolved.command} ${resolved.args.join(' ')}`)
    console.log(`   Targets: ${targets.join(', ')}`)
    return
  }

  const result = await apiMcpInstall(source, options)

  for (const r of result.results) {
    if (r.success) {
      console.log(`   ✅ ${r.agent}: MCP server "${result.name}" installed`)
    } else {
      console.log(`   ⚠️  ${r.agent}: not supported`)
    }
  }

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

  const byAgent = {}
  for (const s of result.servers) {
    if (!byAgent[s.agent]) byAgent[s.agent] = []
    byAgent[s.agent].push(s)
  }

  for (const [agent, servers] of Object.entries(byAgent)) {
    console.log(`\n${agent}:`)
    for (const s of servers) {
      console.log(`   - ${s.name} (${s.command} ${(s.args || []).join(' ')})`)
    }
  }
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

  if (options.dryRun) {
    const resolved = (await import('../utils/mcp.js')).resolveMcpSource(source)
    const targets =
      options.agents?.length > 0 ? options.agents : getSupportedMcpAgents()
    console.log(`\n📋 [dry-run] Would update MCP server from: ${source}`)
    console.log(`   Command: ${resolved.command} ${resolved.args.join(' ')}`)
    console.log(`   Targets: ${targets.join(', ')}`)
    return
  }

  const result = await apiMcpUpdate(source, options)

  for (const r of result.results) {
    if (r.success) {
      console.log(`   ✅ ${r.agent}: MCP server "${result.name}" updated`)
    } else {
      console.log(`   ⚠️  ${r.agent}: not supported`)
    }
  }

  const succeeded = result.results.filter((r) => r.success).length
  console.log(
    `\n✅ Updated MCP server "${result.name}" on ${succeeded}/${result.results.length} agents`,
  )
  return result.results
}

export async function mcpRemoveCommand(name, options) {
  const result = await apiMcpRemove(name, options)

  for (const r of result.results) {
    if (r.success) {
      console.log(`   ✅ ${r.agent}: MCP server "${name}" removed`)
    } else {
      console.log(`   ⚠️  ${r.agent}: not supported`)
    }
  }

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
    `\nChecking ${result.servers.length} MCP server(s) for updates...\n`,
  )

  for (const s of result.servers) {
    if (s.status === 'skipped') {
      console.log(`   ⏭️  ${s.name.padEnd(30)} ${s.reason}`)
    } else if (s.status === 'update_available') {
      console.log(
        `   🔄 ${s.name.padEnd(30)} ${s.installedVersion} → ${s.latestVersion} (${s.agents})`,
      )
    } else if (s.status === 'up_to_date') {
      const versionInfo =
        s.versionPinned === false
          ? `latest: ${s.version} (no version pinned)`
          : `${s.version} is latest`
      console.log(`   ✅ ${s.name.padEnd(30)} ${versionInfo} (${s.agents})`)
    } else if (s.status === 'error') {
      console.log(`   ❌ ${s.name.padEnd(30)} ${s.reason}`)
    }
  }

  console.log(
    `\n${result.updatesAvailable > 0 ? `⚠️  ${result.updatesAvailable} MCP server(s) have updates available.` : '✅ All MCP servers are up to date.'}\n`,
  )
}

function formatMcpRepo(r) {
  const desc = r.description || 'No description'
  const stars = r.stargazers_count || 0
  const lang = r.language || 'N/A'
  const topics =
    r.topics && r.topics.length > 0 ? r.topics.slice(0, 3).join(', ') : ''
  return `${bold(r.name)}\n  ${dim(desc)}  ${yellow(`⭐ ${stars}`)}  ${cyan(lang)}${topics ? `  ${dim(topics)}` : ''}`
}

function formatMcpNpmItem(pkg) {
  const desc = pkg.description || 'No description'
  const keywords =
    pkg.keywords && pkg.keywords.length > 0
      ? pkg.keywords.slice(0, 3).join(', ')
      : ''
  return `${bold(pkg.name)}\n  ${dim(desc)}${keywords ? `  ${dim(keywords)}` : ''}`
}

const MCP_ITEM_LINES = 3

function mcpTuiFormat(item, selected, sourceType) {
  const sel = selected ? `${sgr(7)} > ${sgr(0)}` : '   '
  const name = selected ? bold(item.name) : dim(item.name)
  const desc = item.description || 'No description'
  const installCmd =
    sourceType === 'npm'
      ? `rolecraft mcp install npm:${item.name}`
      : `rolecraft mcp install gh:${item.name}`
  return [`${sel}${name}`, `   ├─ ${desc}`, `   └─ ${installCmd}`]
}

async function mcpRunTUI(items, sourceType) {
  const wasRaw = input.isRaw
  input.setRawMode(true)
  input.resume()

  let selectedIndex = 0
  let scrollOffset = 0
  let firstRender = true
  let termRows = output.rows || 24
  const reservedRows = 2
  let availRows = termRows - reservedRows
  let visibleCount = Math.min(
    Math.max(1, Math.floor(availRows / MCP_ITEM_LINES)),
    items.length,
  )
  let statusRow = termRows
  const firstLine = 2

  function updateLayout() {
    termRows = output.rows || 24
    availRows = termRows - reservedRows
    visibleCount = Math.min(
      Math.max(1, Math.floor(availRows / MCP_ITEM_LINES)),
      items.length,
    )
    statusRow = termRows
    if (scrollOffset + visibleCount > items.length)
      scrollOffset = Math.max(0, items.length - visibleCount)
    if (selectedIndex >= items.length) selectedIndex = items.length - 1
  }

  function render() {
    let out = firstRender ? clearScreen + hideCursor : hideCursor
    firstRender = false
    out += cursorTo(firstLine, 1)
    const end = Math.min(scrollOffset + visibleCount, items.length)
    const usedLines = (end - scrollOffset) * MCP_ITEM_LINES
    for (let i = scrollOffset; i < end; i++) {
      const lines = mcpTuiFormat(items[i], i === selectedIndex, sourceType)
      out += cursorTo(firstLine + (i - scrollOffset) * MCP_ITEM_LINES, 1)
      for (const line of lines) out += `${eraseLine}${line}\n`
    }
    for (let i = usedLines + firstLine; i < statusRow; i++)
      out += `${cursorTo(i, 1) + eraseLine}\n`
    out +=
      cursorTo(statusRow, 1) +
      eraseLine +
      sgr(7) +
      '  ↑/↓ move · Enter select · q quit  ' +
      sgr(0)
    output.write(out)
  }

  function ensureVisible(index) {
    if (index < scrollOffset) {
      scrollOffset = index
      return true
    }
    if (index >= scrollOffset + visibleCount) {
      scrollOffset = index - visibleCount + 1
      return true
    }
    return false
  }

  render()

  return new Promise((resolve) => {
    function onData(buf) {
      const key = buf.toString()

      if (key === '\u001b[A') {
        if (selectedIndex > 0) {
          selectedIndex--
          ensureVisible(selectedIndex)
          render()
        }
      } else if (key === '\u001b[B') {
        if (selectedIndex < items.length - 1) {
          selectedIndex++
          ensureVisible(selectedIndex)
          render()
        }
      } else if (key === '\r' || key === '\n') {
        cleanup()
        resolve(selectedIndex)
      } else if (key === '\u0003' || key === 'q' || key === 'Q') {
        cleanup()
        resolve(-1)
      }
    }

    function onResize() {
      updateLayout()
      render()
    }

    function cleanup() {
      input.removeListener('data', onData)
      output.removeListener('resize', onResize)
      input.pause()
      input.setRawMode(wasRaw)
      output.write(clearScreen + showCursor)
    }

    input.on('data', onData)
    output.on('resize', onResize)
  })
}

async function mcpPromptSelect(items, sourceType) {
  console.log()
  for (let i = 0; i < items.length; i++) {
    const line =
      sourceType === 'npm'
        ? formatMcpNpmItem(items[i]).split('\n')
        : formatMcpRepo(items[i]).split('\n')
    console.log(`  ${bold(cyan(String(i + 1).padStart(2, ' ')))} ${line[0]}`)
    console.log(`     ${line[1]}`)
    console.log()
  }

  const { createInterface } = await import('node:readline')
  const rl = createInterface({ input, output })
  const answer = await new Promise((resolve) => {
    rl.question(
      `Which MCP server to install? [1-${items.length}, q to quit]: `,
      (a) => {
        rl.close()
        resolve(a.trim().toLowerCase())
      },
    )
  })

  if (answer === 'q') return -1
  const index = parseInt(answer, 10)
  if (Number.isNaN(index) || index < 1 || index > items.length) {
    console.log(`Invalid choice. Enter a number between 1 and ${items.length}.`)
    return -2
  }
  return index - 1
}

async function mcpPickAndInstall(items, sourceType, installOptions) {
  let selectedIndex

  if (output.isTTY && items.length > 0) {
    selectedIndex = await mcpRunTUI(items, sourceType)
  } else {
    selectedIndex = await mcpPromptSelect(items, sourceType)
  }

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
  for (const item of items) {
    const line =
      sourceType === 'npm'
        ? formatMcpNpmItem(item).split('\n')
        : formatMcpRepo(item).split('\n')
    console.log(`   ${line[0]}`)
    console.log(`   ├─ ${line[1]}`)
    console.log(
      `   └─ rolecraft mcp install ${sourceType === 'npm' ? `npm:${item.name}` : `gh:${item.name}`}`,
    )
    console.log()
  }
  console.log(`${items.length} result(s) found.`)
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
