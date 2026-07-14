import {
  readProfile,
  writeProfile,
  deleteProfile,
  listProfiles,
  captureAllAgents,
  captureAgentFull,
  detectAgents,
  formatApplyResults,
} from '../utils/profile.js'
import agents from '../agents.js'

const AGENT_FLAGS = ['--agents', ...agents.map(a => `--${a.flag}`), '--all']
const AGENT_MAP = Object.fromEntries(agents.map(a => [`--${a.flag}`, a.flag]))

function parseOptions(args) {
  const flags = args.filter(a => a.startsWith('--'))
  const namedArgs = args.filter(a => !a.startsWith('--'))

  const options = {
    dryRun: flags.includes('--dry-run'),
    yes: flags.includes('--yes') || flags.includes('-y'),
    targets: [],
  }

  const hasScope = flags.some(f => AGENT_FLAGS.includes(f))
  if (hasScope) {
    for (const [flag, agent] of Object.entries(AGENT_MAP)) {
      if (flags.includes(flag) || flags.includes('--all')) {
        options.targets.push(agent)
      }
    }
  }

  return { options, namedArgs, flags }
}

function profileUsage() {
  console.log(`
rolecraft profile — Manage agent configuration profiles

Usage:
  rolecraft profile save <name>    Save current agent configs to a profile
  rolecraft profile list           List saved profiles
  rolecraft profile show <name>    Display a profile's contents
  rolecraft profile delete <name>  Delete a profile

Options:
  --agents, --cursor, --claude, etc.  Target specific agents (save only)
  --all                               Save all detected agents
  --yes, -y                           Skip confirmation
  --dry-run                           Preview without making changes

Examples:
  rolecraft profile save frontend-dev --agents --cursor --claude
  rolecraft profile save full-setup --all
  rolecraft profile list
  rolecraft profile show frontend-dev
  rolecraft profile delete frontend-dev
`)
}

export async function profileSaveCommand(name, options) {
  if (!name) {
    console.error('Usage: rolecraft profile save <name> [--agents --cursor ...]')
    throw new Error('Missing profile name.')
  }

  const { dryRun, yes, targets } = options

  let agentsData
  if (targets && targets.length > 0) {
    agentsData = {}
    for (const flag of targets) {
      const entry = await captureAgentFull(flag)
      if (entry) agentsData[flag] = entry
    }
  } else {
    agentsData = await captureAllAgents()
  }

  if (Object.keys(agentsData).length === 0) {
    console.log('No agent configurations found to save.')
    return
  }

  if (dryRun) {
    console.log(`\n📋 Would save profile "${name}" with:\n`)
    for (const [flag, entry] of Object.entries(agentsData)) {
      const parts = []
      if (entry.config) parts.push('config')
      if (entry.mcpServers) parts.push(`MCP (${Object.keys(entry.mcpServers).length})`)
      if (entry.skills) parts.push(`skills (${entry.skills.length})`)
      if (entry.instructions) parts.push('instructions')
      console.log(`   ${flag}: ${parts.join(', ')}`)
    }
    console.log()
    return
  }

  const profileData = {
    name,
    description: `Saved on ${new Date().toLocaleDateString()}`,
    agents: agentsData,
  }

  await writeProfile(profileData)
  console.log(`\n✅ Profile "${name}" saved (${Object.keys(agentsData).length} agent(s))`)
}

export async function profileListCommand() {
  const profiles = await listProfiles()

  if (profiles.length === 0) {
    console.log('No profiles saved.')
    return
  }

  console.log('\nSaved profiles:\n')
  for (const p of profiles) {
    const date = p.updatedAt
      ? new Date(p.updatedAt).toLocaleDateString()
      : 'unknown'
    console.log(`   ${p.name}`)
    console.log(`   ├─ Agents: ${p.agentCount}`)
    if (p.description) console.log(`   ├─ ${p.description}`)
    console.log(`   └─ Updated: ${date}`)
    console.log()
  }
  console.log(`${profiles.length} profile(s) total.`)
}

export async function profileShowCommand(name) {
  if (!name) {
    console.error('Usage: rolecraft profile show <name>')
    throw new Error('Missing profile name.')
  }

  const data = await readProfile(name)
  if (!data) {
    throw new Error(`Profile "${name}" not found.`)
  }

  const agentCount = data.agents ? Object.keys(data.agents).length : 0
  console.log(`\nProfile: ${data.name}`)
  if (data.description) console.log(`Description: ${data.description}`)
  console.log(`Version: ${data.version}`)
  console.log(`Created: ${data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'unknown'}`)
  console.log(`Updated: ${data.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : 'unknown'}`)
  console.log(`Agents: ${agentCount}\n`)

  if (data.agents) {
    for (const [flag, entry] of Object.entries(data.agents)) {
      const parts = []
      if (entry.config) parts.push('config')
      if (entry.mcpServers) parts.push(`MCP (${Object.keys(entry.mcpServers).length})`)
      if (entry.skills) parts.push(`skills (${entry.skills.length})`)
      if (entry.instructions) parts.push('instructions')
      console.log(`   ${flag}: ${parts.join(', ')}`)
    }
  }
  console.log()
}

export async function profileDeleteCommand(name, options) {
  if (!name) {
    console.error('Usage: rolecraft profile delete <name>')
    throw new Error('Missing profile name.')
  }

  if (options.dryRun) {
    const exists = await readProfile(name)
    if (!exists) {
      console.log(`Profile "${name}" does not exist.`)
      return
    }
    console.log(`Would delete profile "${name}".`)
    return
  }

  const deleted = await deleteProfile(name)
  if (!deleted) {
    throw new Error(`Profile "${name}" not found.`)
  }

  console.log(`\n✅ Deleted profile "${name}".`)
}

export async function profileCommand(args) {
  const subcommand = args[0]
  const rest = args.slice(1)
  const { options, namedArgs } = parseOptions(rest)

  if (subcommand === '--help' || subcommand === '-h' || !subcommand) {
    profileUsage()
    return
  }

  switch (subcommand) {
    case 'save':
      await profileSaveCommand(namedArgs[0], options)
      break
    case 'list':
      await profileListCommand()
      break
    case 'show':
      await profileShowCommand(namedArgs[0])
      break
    case 'delete':
      await profileDeleteCommand(namedArgs[0], options)
      break
    default:
      console.error(`Unknown profile subcommand: "${subcommand}". Use: save, list, show, delete`)
      profileUsage()
  }
}
