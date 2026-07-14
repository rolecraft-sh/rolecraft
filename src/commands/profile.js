import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdtempSync, writeFileSync, readFileSync, unlinkSync, rmdirSync } from 'node:fs'

import {
  readProfile,
  writeProfile,
  deleteProfile,
  listProfiles,
  captureAllAgents,
  captureAgentFull,
  applyProfileData,
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
    skipMcp: flags.includes('--skip-mcp'),
    skipSkills: flags.includes('--skip-skills'),
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
  rolecraft profile save <name>      Save current agent configs to a profile
  rolecraft profile apply <name>     Apply a profile's settings to agents
  rolecraft profile diff <name>      Show differences between profile and current config
  rolecraft profile edit <name>      Edit a profile with \$EDITOR
  rolecraft profile list             List saved profiles
  rolecraft profile show <name>      Display a profile's contents
  rolecraft profile delete <name>    Delete a profile

Options:
  --agents, --cursor, --claude, etc.  Target specific agents
  --all                               Target all agents
  --yes, -y                           Skip confirmation
  --dry-run                           Preview without making changes
  --skip-mcp                          Skip MCP server configuration
  --skip-skills                       Skip skill installation

Examples:
  rolecraft profile save frontend-dev --agents --cursor --claude
  rolecraft profile apply frontend-dev
  rolecraft profile apply frontend-dev --dry-run
  rolecraft profile diff frontend-dev
  rolecraft profile edit frontend-dev
  rolecraft profile list
  rolecraft profile show frontend-dev
  rolecraft profile delete frontend-dev
`)
}

function formatAgentSummary(entry) {
  const parts = []
  if (entry.config) {
    const scopes = Object.keys(entry.config)
    parts.push(`config (${scopes.join(', ')})`)
  }
  if (entry.mcpServers) parts.push(`MCP (${Object.keys(entry.mcpServers).length})`)
  if (entry.skills) parts.push(`skills (${entry.skills.length})`)
  if (entry.instructions) parts.push(`instructions (${entry.instructions.length})`)
  return parts.join(', ')
}

export async function profileSaveCommand(name, options) {
  if (!name) {
    console.error('Usage: rolecraft profile save <name> [--agents --cursor ...]')
    throw new Error('Missing profile name.')
  }

  const { dryRun, targets } = options

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
      console.log(`   ${flag}: ${formatAgentSummary(entry)}`)
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

export async function profileApplyCommand(name, options) {
  if (!name) {
    console.error('Usage: rolecraft profile apply <name> [--dry-run] [--skip-mcp] [--skip-skills]')
    throw new Error('Missing profile name.')
  }

  const data = await readProfile(name)
  if (!data) {
    throw new Error(`Profile "${name}" not found.`)
  }

  const { dryRun, targets, skipMcp, skipSkills } = options

  if (dryRun) {
    console.log(`\n📋 Would apply profile "${name}":\n`)
    const agentsToApply = targets.length > 0
      ? Object.fromEntries(Object.entries(data.agents).filter(([flag]) => targets.includes(flag)))
      : data.agents

    for (const [flag, entry] of Object.entries(agentsToApply)) {
      console.log(`   ${flag}: ${formatAgentSummary(entry)}`)
    }
    console.log()
    return
  }

  const results = await applyProfileData(data, { targets, skipMcp, skipSkills })
  const formatted = formatApplyResults(results)

  console.log(`\n✅ Applied profile "${name}":\n`)
  console.log(formatted)
  console.log()
}

export async function profileDiffCommand(name) {
  if (!name) {
    console.error('Usage: rolecraft profile diff <name>')
    throw new Error('Missing profile name.')
  }

  const data = await readProfile(name)
  if (!data) {
    throw new Error(`Profile "${name}" not found.`)
  }

  if (!data.agents || Object.keys(data.agents).length === 0) {
    console.log(`Profile "${name}" has no agent data.`)
    return
  }

  console.log(`\n📊 Diff for profile "${name}" vs current configuration:\n`)

  let hasDiff = false
  for (const [flag, profileEntry] of Object.entries(data.agents)) {
    const currentEntry = await captureAgentFull(flag)
    const differences = []

    const profileConfig = profileEntry.config ?? null
    const currentConfig = currentEntry?.config ?? null
    const profileMcp = profileEntry.mcpServers ?? null
    const currentMcp = currentEntry?.mcpServers ?? null
    const profileSkills = profileEntry.skills ?? null
    const currentSkills = currentEntry?.skills ?? null
    const profileInstr = profileEntry.instructions ?? null
    const currentInstr = currentEntry?.instructions ?? null

    if (JSON.stringify(profileConfig) !== JSON.stringify(currentConfig)) {
      differences.push('config differs')
    }
    if (JSON.stringify(profileMcp) !== JSON.stringify(currentMcp)) {
      differences.push('MCP servers differ')
    }
    if (JSON.stringify(profileSkills) !== JSON.stringify(currentSkills)) {
      differences.push('skills differ')
    }
    if (JSON.stringify(profileInstr) !== JSON.stringify(currentInstr)) {
      differences.push('instructions differ')
    }

    if (differences.length > 0) {
      hasDiff = true
      console.log(`   ${flag}:`)
      for (const diff of differences) {
        console.log(`     └─ ${diff}`)
      }
    } else {
      console.log(`   ${flag}: no differences`)
    }
  }

  if (!hasDiff) {
    console.log('\n   Profile matches current configuration — no changes to apply.')
  }
  console.log()
}

export async function profileEditCommand(name) {
  if (!name) {
    console.error('Usage: rolecraft profile edit <name>')
    throw new Error('Missing profile name.')
  }

  const data = await readProfile(name)
  if (!data) {
    throw new Error(`Profile "${name}" not found.`)
  }

  const editor = process.env.EDITOR || 'vi'
  const tmpDir = mkdtempSync(join(tmpdir(), 'rolecraft-profile-'))
  const tmpFile = join(tmpDir, `${name}.json`)
  writeFileSync(tmpFile, JSON.stringify(data, null, 2) + '\n', 'utf-8')

  try {
    execSync(`${editor} "${tmpFile}"`, { stdio: 'inherit' })
    const edited = JSON.parse(readFileSync(tmpFile, 'utf-8'))
    edited.name = name
    await writeProfile(edited)
    console.log(`\n✅ Profile "${name}" updated.`)
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON after editing. Profile not saved.`)
    }
    throw err
  } finally {
    try {
      unlinkSync(tmpFile)
      rmdirSync(tmpDir)
    } catch {}
  }
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
      console.log(`   ${flag}: ${formatAgentSummary(entry)}`)
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
    case 'apply':
      await profileApplyCommand(namedArgs[0], options)
      break
    case 'diff':
      await profileDiffCommand(namedArgs[0])
      break
    case 'edit':
      await profileEditCommand(namedArgs[0])
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
      console.error(`Unknown profile subcommand: "${subcommand}". Use: save, apply, diff, edit, list, show, delete`)
      profileUsage()
  }
}
