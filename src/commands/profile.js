import { spawnSync } from 'node:child_process'
import { tmpdir, homedir } from 'node:os'
import { join, relative, resolve, dirname } from 'node:path'
import { mkdtempSync, writeFileSync, readFileSync, unlinkSync, rmdirSync, existsSync } from 'node:fs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import {
  apiProfileSave, apiProfileApply, apiProfileDiff, apiProfileList, apiProfileShow,
  apiProfileDelete, apiProfileImport,
} from '../api/profile.js'
import {
  readProfile, captureAllAgents, captureAgentFull, writeProfile,
  listProfiles, profilePath, validateProfile, ensureProfileDir,
  PROFILE_SCHEMA_VERSION,
} from '../utils/profile.js'
import agents from '../agents.js'

const LINK_FILE = '.agent-profile.json'
const LINK_DIRS = [process.cwd(), homedir()]

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
    relative: flags.includes('--relative'),
    unlink: flags.includes('--unlink'),
    filePath: null,
    targets: [],
  }

  const fileIdx = flags.indexOf('--file')
  if (fileIdx >= 0 && fileIdx + 1 < flags.length) {
    const nextArg = args[args.indexOf('--file') + 1]
    if (nextArg && !nextArg.startsWith('--')) {
      options.filePath = nextArg
    }
  }
  if (!options.filePath) {
    const fileIdxRaw = args.indexOf('--file')
    if (fileIdxRaw >= 0 && fileIdxRaw + 1 < args.length) {
      const candidate = args[fileIdxRaw + 1]
      if (candidate && !candidate.startsWith('--')) {
        options.filePath = candidate
      }
    }
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
  rolecraft profile save <name>        Save current agent configs to a profile
  rolecraft profile apply <name>       Apply a profile's settings to agents
  rolecraft profile diff <name>        Show differences between profile and current config
  rolecraft profile edit <name>        Edit a profile with \$EDITOR
  rolecraft profile list               List saved profiles
  rolecraft profile show <name>        Display a profile's contents
  rolecraft profile delete <name>      Delete a profile
  rolecraft profile export <name>      Export a profile as JSON
  rolecraft profile export <name> --file <path>  Export to a file
  rolecraft profile import <path>      Import a profile from file or URL
  rolecraft profile link <name>        Link a profile to current project
  rolecraft profile link               Show linked profile
  rolecraft profile link --unlink      Remove project link

Options:
  --agents, --cursor, --claude, etc.  Target specific agents
  --all                               Target all agents
  --yes, -y                           Skip confirmation
  --dry-run                           Preview without making changes
  --skip-mcp                          Skip MCP server configuration
  --skip-skills                       Skip skill installation
  --file <path>                       Output to file (export only)
  --relative                          Use relative paths (export only)

Examples:
  rolecraft profile save frontend-dev --agents --cursor --claude
  rolecraft profile apply frontend-dev
  rolecraft profile apply frontend-dev --dry-run
  rolecraft profile diff frontend-dev
  rolecraft profile edit frontend-dev
  rolecraft profile export frontend-dev --file ./frontend-profile.json --relative
  rolecraft profile import ./frontend-profile.json
  rolecraft profile link frontend-dev
  rolecraft profile list
  rolecraft profile show frontend-dev
  rolecraft profile delete frontend-dev
`)
}

function formatAgentSummary(entry) {
  const parts = []
  if (entry.config) parts.push(`config (${Object.keys(entry.config).join(', ')})`)
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

  if (options.dryRun) {
    const result = await apiProfileSave(name, { ...options, dryRun: true })
    console.log(`\n📋 [dry-run] Would save profile "${name}" with:\n`)
    for (const [flag, entry] of Object.entries(result.agents)) {
      console.log(`   ${flag}: ${formatAgentSummary(entry)}`)
    }
    console.log()
    return
  }

  try {
    const result = await apiProfileSave(name, options)
    console.log(`\n✅ Profile "${name}" saved (${result.agents} agent(s))`)
  } catch (err) {
    console.log(err.message)
  }
}

export async function profileApplyCommand(name, options) {
  if (!name) {
    console.error('Usage: rolecraft profile apply <name> [--dry-run] [--skip-mcp] [--skip-skills]')
    throw new Error('Missing profile name.')
  }

  if (options.dryRun) {
    const result = await apiProfileApply(name, { ...options, dryRun: true })
    console.log(`\n📋 [dry-run] Would apply profile "${name}":\n`)
    for (const [flag, entry] of Object.entries(result.agents)) {
      console.log(`   ${flag}: ${formatAgentSummary(entry)}`)
    }
    console.log()
    return
  }

  const result = await apiProfileApply(name, options)

  const formattedLines = []
  if (result.results) {
    for (const [flag, r] of Object.entries(result.results)) {
      if (r.config) formattedLines.push(`   ${flag}: config applied`)
      if (r.mcpResults?.length > 0) formattedLines.push(`   ${flag}: ${r.mcpResults.length} MCP server(s) configured`)
      if (r.skillResults?.length > 0) formattedLines.push(`   ${flag}: ${r.skillResults.length} skill(s) installed`)
    }
  }

  console.log(`\n✅ Applied profile "${name}":\n`)
  if (formattedLines.length > 0) {
    for (const line of formattedLines) console.log(line)
  } else {
    console.log('   No changes applied.')
  }
  console.log()
}

export async function profileDiffCommand(name) {
  if (!name) {
    console.error('Usage: rolecraft profile diff <name>')
    throw new Error('Missing profile name.')
  }

  const data = await readProfile(name)
  if (!data) throw new Error(`Profile "${name}" not found.`)

  if (!data.agents || Object.keys(data.agents).length === 0) {
    console.log(`Profile "${name}" has no agent data.`)
    return
  }

  const result = await apiProfileDiff(name)

  console.log(`\n📊 Diff for profile "${name}" vs current configuration:\n`)

  if (!result.hasChanges) {
    for (const flag of Object.keys(data.agents)) {
      console.log(`   ${flag}: no differences`)
    }
    console.log('\n   Profile matches current configuration — no changes to apply.')
    console.log()
    return
  }

  for (const [flag, diff] of Object.entries(result.diffs)) {
    if (diff.hasDiff) {
      console.log(`   ${flag}:`)
      for (const d of diff.differences) {
        console.log(`     └─ ${d === 'config' ? 'config differs' : d === 'mcpServers' ? 'MCP servers differ' : d === 'skills' ? 'skills differ' : 'instructions differ'}`)
      }
    } else {
      console.log(`   ${flag}: no differences`)
    }
  }
  console.log()
}

export async function profileEditCommand(name) {
  if (!name) {
    console.error('Usage: rolecraft profile edit <name>')
    throw new Error('Missing profile name.')
  }

  const data = await readProfile(name)
  if (!data) throw new Error(`Profile "${name}" not found.`)

  const editor = process.env.EDITOR || 'vi'
  const tmpDir = mkdtempSync(join(tmpdir(), 'rolecraft-profile-'))
  const tmpFile = join(tmpDir, `${name}.json`)
  writeFileSync(tmpFile, JSON.stringify(data, null, 2) + '\n', 'utf-8')

  try {
    const [editorCmd, ...editorArgs] = editor.split(/\s+/)
    const result = spawnSync(editorCmd, [...editorArgs, tmpFile], { stdio: 'inherit' })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`Command failed: ${editorCmd} exited with code ${result.status}`)
    const edited = JSON.parse(readFileSync(tmpFile, 'utf-8'))
    edited.name = name
    await writeProfile(edited)
    console.log(`\n✅ Profile "${name}" updated.`)
  } catch (err) {
    if (err instanceof SyntaxError) throw new Error(`Invalid JSON after editing. Profile not saved.`)
    throw err
  } finally {
    try { unlinkSync(tmpFile); rmdirSync(tmpDir) } catch {}
  }
}

function cleanProfileForExport(data) {
  const cleaned = { ...data }
  delete cleaned.createdAt
  delete cleaned.updatedAt
  delete cleaned.version
  return cleaned
}

function relativizePaths(data, cwd) {
  const result = JSON.parse(JSON.stringify(data))
  for (const entry of Object.values(result.agents)) {
    if (entry.instructions) {
      for (const instr of entry.instructions) {
        if (instr.file) instr.file = relative(cwd, resolve(instr.file))
      }
    }
  }
  return result
}

export async function profileExportCommand(name, options) {
  if (!name) {
    console.error('Usage: rolecraft profile export <name> [--file <path>] [--relative]')
    throw new Error('Missing profile name.')
  }

  const data = await readProfile(name)
  if (!data) throw new Error(`Profile "${name}" not found.`)

  let output = cleanProfileForExport(data)
  if (options.relative) output = relativizePaths(output, process.cwd())

  const json = JSON.stringify(output, null, 2) + '\n'

  if (options.filePath) {
    const targetPath = resolve(options.filePath)
    await mkdir(dirname(targetPath), { recursive: true })
    await writeFile(targetPath, json, 'utf-8')
    console.log(`\n✅ Profile "${name}" exported to ${targetPath}`)
  } else {
    console.log(json)
  }
}

export async function profileImportCommand(path) {
  if (!path) {
    console.error('Usage: rolecraft profile import <file-or-url>')
    throw new Error('Missing source path.')
  }

  const result = await apiProfileImport(path)
  console.log(`\n✅ Profile "${result.name}" imported (${result.agents} agent(s)).`)

  const current = await captureAllAgents()
  if (Object.keys(current).length > 0) {
    console.log(`\n📊 Run \`rolecraft profile diff ${result.name}\` to see differences from current config.`)
  }
}

function getLinkPath(dir) { return join(dir, LINK_FILE) }

function findLinkFile() {
  for (const dir of [process.cwd(), ...LINK_DIRS.slice(1)]) {
    const path = getLinkPath(dir)
    if (existsSync(path)) return path
  }
  return null
}

function readLinkFile(linkPath) {
  try { return JSON.parse(readFileSync(linkPath, 'utf-8')) } catch { return null }
}

export async function profileLinkCommand(name, options) {
  if (options.unlink) {
    const linkPath = findLinkFile()
    if (!linkPath) {
      console.log('No project link found.')
      return
    }
    unlinkSync(linkPath)
    console.log(`\n✅ Project link removed.`)
    return
  }

  if (!name) {
    const linkPath = findLinkFile()
    if (!linkPath) {
      console.log('No profile linked to this project.')
      console.log('Use: rolecraft profile link <name>')
      return
    }
    const link = readLinkFile(linkPath)
    if (!link || !link.profile) {
      console.log('Link file is invalid.')
      return
    }
    console.log(`\n   Linked profile: ${link.profile}`)
    if (link.projectDir) console.log(`   Project: ${link.projectDir}`)
    if (link.createdAt) console.log(`   Created: ${new Date(link.createdAt).toLocaleDateString()}`)
    console.log()
    return
  }

  const data = await readProfile(name)
  if (!data) throw new Error(`Profile "${name}" not found.`)

  writeFileSync(getLinkPath(process.cwd()), JSON.stringify({
    profile: name,
    projectDir: process.cwd(),
    createdAt: new Date().toISOString(),
  }, null, 2) + '\n', 'utf-8')
  console.log(`\n✅ Profile "${name}" linked to ${process.cwd()}`)
  console.log('   Run `rolecraft profile link` to see the linked profile.')
}

export async function profileListCommand() {
  const profiles = await apiProfileList()

  if (profiles.length === 0) {
    console.log('No profiles saved.')
    return
  }

  console.log('\nSaved profiles:\n')
  for (const p of profiles) {
    const date = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'unknown'
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

  const data = await apiProfileShow(name)

  const agentCount = data.agents ? Object.keys(data.agents).length : 0
  console.log(`\nProfile: ${data.name}`)
  console.log(`Description: ${data.description || '(not set)'}`)
  console.log(`Version: ${data.version ?? '(not set)'}`)
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
    const result = await apiProfileDelete(name, { dryRun: true })
    if (!result.exists) {
      console.log(`Profile "${name}" does not exist.`)
      return
    }
    console.log(`📋 [dry-run] Would delete profile "${name}".`)
    return
  }

  await apiProfileDelete(name)
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
    case 'export':
      await profileExportCommand(namedArgs[0], options)
      break
    case 'import':
      await profileImportCommand(namedArgs[0])
      break
    case 'link':
      await profileLinkCommand(namedArgs[0], options)
      break
    case 'delete':
      await profileDeleteCommand(namedArgs[0], options)
      break
    default:
      console.error(`Unknown profile subcommand: "${subcommand}". Use: save, apply, diff, edit, export, import, link, list, show, delete`)
      profileUsage()
  }
}
