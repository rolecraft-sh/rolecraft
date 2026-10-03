import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'

import { listMcpServers, addMcpServer } from './mcp.js'
import { readLock, getGlobalLockPath, getProjectLockPath } from './lockfile.js'
import { resolveSource } from './resolver.js'
import { installSkill } from './installer.js'
import { scanSkill, scanMcpServerConfig, classifyScore } from './security.js'
import { detectAgents } from './agent-detection.js'

export { detectAgents }

const PROFILES_DIR = '.agents/profiles'

const PROFILE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/

export const PROFILE_SCHEMA_VERSION = 1

const AGENT_CONFIG_PATHS = {
  agents: {
    global: () => join(homedir(), '.opencode.json'),
    project: () => join(process.cwd(), 'opencode.json'),
  },
  claude: {
    global: () => join(homedir(), '.claude', 'claude_code.json'),
  },
  cursor: {
    project: () => join(process.cwd(), '.cursorrules'),
  },
  windsurf: {
    global: () => join(homedir(), '.windsurf', 'mcp_config.json'),
  },
  devin: {
    global: () => join(homedir(), '.devin', 'mcp_config.json'),
  },
  copilot: {
    project: () => join(process.cwd(), '.github', 'copilot', 'instructions.md'),
  },
  continue: {
    global: () => join(homedir(), '.continue', 'config.json'),
  },
  aider: {
    global: () => join(homedir(), '.aider.conf.yml'),
    project: () => join(process.cwd(), '.aider.conf.yml'),
  },
  gemini: {
    global: () => join(homedir(), '.gemini', 'config', 'config.json'),
  },
}

const AGENT_INSTRUCTION_PATHS = {
  agents: {
    global: () => join(homedir(), '.opencode.json'),
    project: () => join(process.cwd(), 'opencode.json'),
  },
  cursor: {
    project: () => join(process.cwd(), '.cursorrules'),
  },
  copilot: {
    project: () => join(process.cwd(), '.github', 'copilot', 'instructions.md'),
  },
}

export function getProfilesDir() {
  return join(homedir(), PROFILES_DIR)
}

export async function ensureProfileDir() {
  await mkdir(getProfilesDir(), { recursive: true })
}

export function profilePath(name) {
  if (!isValidProfileName(name)) {
    throw new Error(
      `Invalid profile name: "${name}". Use only letters, digits, hyphens, underscores, or dots.`,
    )
  }
  return join(getProfilesDir(), `${name}.json`)
}

export function isValidProfileName(name) {
  return (
    typeof name === 'string' &&
    name.length >= 1 &&
    name.length <= 64 &&
    PROFILE_NAME_RE.test(name)
  )
}

export function validateProfile(data) {
  const errors = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Profile data must be a non-null object'] }
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Missing or invalid "name": must be a non-empty string')
  } else if (!isValidProfileName(data.name)) {
    errors.push(
      `Invalid profile name "${data.name}": use only letters, digits, hyphens, underscores, or dots`,
    )
  }

  if (data.version !== undefined && typeof data.version !== 'number') {
    errors.push('"version" must be a number')
  }

  if (data.agents !== undefined) {
    if (
      typeof data.agents !== 'object' ||
      data.agents === null ||
      Array.isArray(data.agents)
    ) {
      errors.push('"agents" must be a non-null object')
    } else {
      for (const [agentKey, agentVal] of Object.entries(data.agents)) {
        if (typeof agentVal !== 'object' || agentVal === null) {
          errors.push(`"agents.${agentKey}" must be a non-null object`)
          continue
        }
        if (
          agentVal.config !== undefined &&
          typeof agentVal.config !== 'object'
        ) {
          errors.push(`"agents.${agentKey}.config" must be an object`)
        }
        if (
          agentVal.instructions !== undefined &&
          !Array.isArray(agentVal.instructions)
        ) {
          errors.push(`"agents.${agentKey}.instructions" must be an array`)
        }
        if (agentVal.mcpServers !== undefined) {
          if (
            typeof agentVal.mcpServers !== 'object' ||
            agentVal.mcpServers === null ||
            Array.isArray(agentVal.mcpServers)
          ) {
            errors.push(
              `"agents.${agentKey}.mcpServers" must be a non-null object`,
            )
          }
        }
        if (agentVal.skills !== undefined && !Array.isArray(agentVal.skills)) {
          errors.push(`"agents.${agentKey}.skills" must be an array`)
        }
      }
    }
  }

  if (data.projectOverrides !== undefined) {
    if (
      typeof data.projectOverrides !== 'object' ||
      data.projectOverrides === null ||
      Array.isArray(data.projectOverrides)
    ) {
      errors.push('"projectOverrides" must be a non-null object')
    }
  }

  if (data.localOverrides !== undefined) {
    if (
      typeof data.localOverrides !== 'object' ||
      data.localOverrides === null ||
      Array.isArray(data.localOverrides)
    ) {
      errors.push('"localOverrides" must be a non-null object')
    }
  }

  return { valid: errors.length === 0, errors }
}

export async function readProfile(name) {
  const path = profilePath(name)
  try {
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}

export async function writeProfile(data) {
  const validation = validateProfile(data)
  if (!validation.valid) {
    throw new Error(
      `Invalid profile data:\n  ${validation.errors.join('\n  ')}`,
    )
  }

  const enriched = {
    name: data.name,
    version: data.version ?? PROFILE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    createdAt: data.createdAt ?? new Date().toISOString(),
    agents: data.agents || {},
  }
  if (data.description) enriched.description = data.description

  const content = `${JSON.stringify(enriched, null, 2)}\n`

  await ensureProfileDir()
  await writeFile(profilePath(data.name), content, 'utf-8')
  return enriched
}

export async function deleteProfile(name) {
  const path = profilePath(name)

  const exists = await readProfile(name)
  if (!exists) return false

  await rm(path)
  return true
}

export async function listProfiles() {
  await ensureProfileDir()
  const dir = getProfilesDir()

  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const results = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue

    const name = entry.name.slice(0, -5)
    if (!isValidProfileName(name)) continue

    const data = await readProfile(name)
    if (!data) continue

    results.push({
      name: data.name,
      description: data.description || '',
      agentCount: data.agents ? Object.keys(data.agents).length : 0,
      updatedAt: data.updatedAt || null,
      createdAt: data.createdAt || null,
    })
  }

  results.sort((a, b) => {
    if (a.updatedAt && b.updatedAt)
      return b.updatedAt.localeCompare(a.updatedAt)
    if (a.updatedAt) return -1
    if (b.updatedAt) return 1
    return a.name.localeCompare(b.name)
  })

  return results
}

async function readFileIfExists(path) {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return null
  }
}

export async function captureAgentConfig(agentFlag) {
  const paths = AGENT_CONFIG_PATHS[agentFlag]
  if (!paths) return null

  const result = {}
  for (const [scope, getPath] of Object.entries(paths)) {
    const content = await readFileIfExists(getPath())
    if (content !== null) {
      try {
        result[scope] = JSON.parse(content)
      } catch {
        result[scope] = content
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

export async function captureAgentConfigRaw(agentFlag) {
  const paths = AGENT_CONFIG_PATHS[agentFlag]
  if (!paths) return null

  const result = {}
  for (const [scope, getPath] of Object.entries(paths)) {
    const content = await readFileIfExists(getPath())
    if (content !== null) {
      result[scope] = content
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

export async function captureMcpServers(agentFlag) {
  try {
    const servers = await listMcpServers(agentFlag)
    if (!servers || servers.length === 0) return null

    const result = {}
    for (const s of servers) {
      result[s.name] = { command: s.command, args: s.args }
    }
    return result
  } catch {
    return null
  }
}

export async function captureSkills(agentFlag) {
  const [globalLock, projectLock] = await Promise.all([
    readLock(getGlobalLockPath()),
    readLock(getProjectLockPath(process.cwd())).catch(() => ({ skills: {} })),
  ])

  const allSkills = { ...globalLock.skills, ...projectLock.skills }
  const slugs = []

  for (const [slug, entry] of Object.entries(allSkills)) {
    const targetAgents = entry.agents || []
    if (
      targetAgents.includes(agentFlag) ||
      targetAgents.includes('all') ||
      targetAgents.includes('agents')
    ) {
      slugs.push(slug)
    }
  }

  return slugs.length > 0 ? slugs : null
}

export async function captureInstructions(agentFlag) {
  const paths = AGENT_INSTRUCTION_PATHS[agentFlag]
  if (!paths) return null

  const result = []
  for (const [scope, getPath] of Object.entries(paths)) {
    const content = await readFileIfExists(getPath())
    if (content !== null) {
      const filePath = getPath()
      result.push({ file: filePath, contentSha: null, scope })
    }
  }

  return result.length > 0 ? result : null
}

export async function captureAgentFull(agentFlag) {
  const [config, mcpServers, skills, instructions] = await Promise.all([
    captureAgentConfig(agentFlag),
    captureMcpServers(agentFlag),
    captureSkills(agentFlag),
    captureInstructions(agentFlag),
  ])

  if (!config && !mcpServers && !skills && !instructions) return null

  const entry = {}
  if (config) entry.config = config
  if (mcpServers) entry.mcpServers = mcpServers
  if (skills) entry.skills = skills
  if (instructions) entry.instructions = instructions

  return entry
}

export async function captureAllAgents() {
  const detected = detectAgents()
  const agentsData = {}

  for (const agent of detected) {
    const entry = await captureAgentFull(agent.flag)
    if (entry) {
      agentsData[agent.flag] = entry
    }
  }

  return agentsData
}

const BACKUPS_DIR = '.agents/backups'

function getBackupsDir() {
  return join(homedir(), BACKUPS_DIR)
}

export async function createBackup(agentFlag) {
  const paths = AGENT_CONFIG_PATHS[agentFlag]
  if (!paths) return null

  const backupsDir = getBackupsDir()
  await mkdir(backupsDir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const results = []

  for (const [scope, getPath] of Object.entries(paths)) {
    const sourcePath = getPath()
    const content = await readFileIfExists(sourcePath)
    if (content !== null) {
      const backupName = `${agentFlag}-${scope}-${timestamp}.bak`
      const backupPath = join(backupsDir, backupName)
      await writeFile(backupPath, content, 'utf-8')
      results.push({ scope, path: backupPath })
    }
  }

  return results.length > 0 ? results : null
}

// Profiles can come from `profile import`, so every MCP server they carry
// gets the same scan as skill-sourced ones before it reaches agent config.
// Returns `{ allowed, level, reason }`; `reason` is set when blocked.
function gateMcpServer(name, serverConfig, options = {}, where = '') {
  const security = scanMcpServerConfig(name, serverConfig)
  const level = classifyScore(security.score, security.issues)
  const flagged = level === 'danger' || level === 'review'
  const label = `MCP server "${name}"${where ? ` in ${where}` : ''}`
  if (flagged && !options.yes) {
    const issues = security.issues.filter((i) => i.severity !== 'low')
    console.error(
      `\n⚠️  ${label} blocked by security scan (score: ${security.score}/100). Review the profile, or re-run with --yes to apply it anyway.`,
    )
    for (const i of issues) console.error(`  [${i.severity}] ${i.description}`)
    return {
      allowed: false,
      level,
      reason: `security scan blocked (score: ${security.score}/100): ${issues
        .map((i) => `[${i.severity}] ${i.description}`)
        .join('; ')}`,
    }
  }
  // --yes forces past the gate but never silently
  if (flagged) {
    console.error(
      `\n⚠️  [${level.toUpperCase()}] --yes forcing ${label} despite security scan (score: ${security.score}/100).`,
    )
  }
  return { allowed: true, level }
}

// Drop flagged MCP servers from one scope of a profile's `config` section.
// For some agents (windsurf, continue) the config file is also the MCP config
// file, so `mcpServers` here would otherwise bypass the gate in
// `applyMcpServers`. Covers the object form (`mcpServers`) and continue's list
// form (`experimental.mcpServers`). The profile data is not modified.
function filterConfigMcpServers(scope, scopeData, options) {
  if (!scopeData || typeof scopeData !== 'object' || Array.isArray(scopeData))
    return { data: scopeData, blocked: [] }

  const blocked = []
  let data = scopeData

  const servers = scopeData.mcpServers
  if (servers && typeof servers === 'object' && !Array.isArray(servers)) {
    const kept = {}
    for (const [name, serverConfig] of Object.entries(servers)) {
      const gate = gateMcpServer(name, serverConfig, options, `config.${scope}`)
      if (gate.allowed) kept[name] = serverConfig
      else blocked.push({ scope, name, reason: gate.reason })
    }
    if (blocked.length > 0) data = { ...data, mcpServers: kept }
  }

  const list = scopeData.experimental?.mcpServers
  if (Array.isArray(list)) {
    const before = blocked.length
    const kept = list.filter((entry, index) => {
      const name = entry?.name ?? String(index)
      const gate = gateMcpServer(name, entry, options, `config.${scope}`)
      if (!gate.allowed) blocked.push({ scope, name, reason: gate.reason })
      return gate.allowed
    })
    if (blocked.length > before) {
      data = {
        ...data,
        experimental: { ...data.experimental, mcpServers: kept },
      }
    }
  }

  return { data, blocked }
}

export async function applyAgentConfig(agentFlag, configData, options = {}) {
  const paths = AGENT_CONFIG_PATHS[agentFlag]
  if (!paths || !configData || typeof configData !== 'object') return []

  const results = []
  for (const [scope, getPath] of Object.entries(paths)) {
    const scopeData = configData[scope]
    if (scopeData === undefined || scopeData === null) continue

    const { data, blocked } = filterConfigMcpServers(scope, scopeData, options)
    const targetPath = getPath()
    await mkdir(dirname(targetPath), { recursive: true })
    await writeFile(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
    results.push({ scope, path: targetPath, blocked })
  }

  return results
}

export async function applyMcpServers(agentFlag, servers, options = {}) {
  if (!servers || typeof servers !== 'object') return []

  const results = []
  for (const [name, serverConfig] of Object.entries(servers)) {
    const gate = gateMcpServer(name, serverConfig, options)
    if (!gate.allowed) {
      results.push({
        name,
        success: false,
        blocked: true,
        level: gate.level,
        reason: gate.reason,
      })
      continue
    }

    try {
      const success = await addMcpServer(agentFlag, name, serverConfig)
      results.push({ name, success })
    } catch {
      results.push({ name, success: false })
    }
  }

  return results
}

export async function ensureSkillsInstalled(skills, targetFlags, options = {}) {
  if (!skills || !Array.isArray(skills) || skills.length === 0) return []

  const [globalLock, projectLock] = await Promise.all([
    readLock(getGlobalLockPath()),
    readLock(getProjectLockPath(process.cwd())).catch(() => ({ skills: {} })),
  ])

  const installedSlugs = new Set([
    ...Object.keys(globalLock.skills),
    ...Object.keys(projectLock.skills),
  ])

  const results = []
  for (const slug of skills) {
    if (installedSlugs.has(slug)) {
      results.push({ slug, action: 'skipped', reason: 'already_installed' })
      continue
    }

    try {
      const resolved = await resolveSource(slug)

      // Security scan before install
      const security = scanSkill(resolved)
      const level = classifyScore(security.score)
      if ((level === 'danger' || level === 'review') && !options.yes) {
        const issues = security.issues
          .filter((i) => i.severity !== 'low')
          .map(
            (i) =>
              `  [${i.severity}] ${i.description}${i.file ? ` (${i.file})` : ''}`,
          )
          .join('\n')
        results.push({
          slug,
          action: 'failed',
          reason: `security scan blocked (score: ${security.score}/100): ${issues}`,
        })
        continue
      }

      const installTargets = targetFlags || ['agents']
      const installResults = await installSkill(resolved, installTargets)
      results.push({
        slug,
        action: 'installed',
        targets: installResults.map((r) => r.target),
      })
    } catch (err) {
      results.push({ slug, action: 'failed', reason: err.message })
    }
  }

  return results
}

export async function applyInstructions(agentFlag, instructions) {
  if (
    !instructions ||
    !Array.isArray(instructions) ||
    instructions.length === 0
  )
    return []

  if (agentFlag === 'agents') {
    const paths = AGENT_CONFIG_PATHS[agentFlag]
    if (!paths) return []

    const filePaths = instructions.map((i) => i.file)
    const applied = []

    for (const [scope, getPath] of Object.entries(paths)) {
      const targetPath = getPath()
      let config = {}
      const existing = await readFileIfExists(targetPath)
      if (existing) {
        try {
          config = JSON.parse(existing)
        } catch {
          config = {}
        }
      }
      config.instructions = filePaths
      await mkdir(dirname(targetPath), { recursive: true })
      await writeFile(
        targetPath,
        `${JSON.stringify(config, null, 2)}\n`,
        'utf-8',
      )
      applied.push({ scope, path: targetPath })
    }

    return applied
  }

  if (agentFlag === 'cursor') {
    const content = instructions.map((i) => i.content || i.file).join('\n')
    const targetPath = join(process.cwd(), '.cursorrules')
    await writeFile(targetPath, `${content}\n`, 'utf-8')
    return [{ scope: 'project', path: targetPath }]
  }

  return []
}

export async function applyProfileEntry(agentFlag, entry, options = {}) {
  const result = {
    agent: agentFlag,
    config: { applied: [], skipped: [], blocked: [] },
    mcpServers: { applied: [], skipped: [], blocked: [] },
    skills: { applied: [], skipped: [], failed: [] },
    instructions: { applied: [], skipped: [] },
    backup: null,
  }

  if (options.dryRun) return result

  if (entry.config) {
    result.backup = await createBackup(agentFlag)
    const configResult = await applyAgentConfig(
      agentFlag,
      entry.config,
      options,
    )
    for (const { scope, path, blocked } of configResult) {
      result.config.applied.push({ scope, path })
      result.config.blocked.push(...blocked)
    }
  } else {
    result.config.skipped.push('no config data in profile')
  }

  if (!options.skipMcp && entry.mcpServers) {
    const mcpResult = await applyMcpServers(
      agentFlag,
      entry.mcpServers,
      options,
    )
    for (const r of mcpResult) {
      if (r.success) result.mcpServers.applied.push(r.name)
      else if (r.blocked)
        result.mcpServers.blocked.push({ name: r.name, reason: r.reason })
      else result.mcpServers.skipped.push(r.name)
    }
  } else {
    result.mcpServers.skipped.push(
      options.skipMcp ? 'skipped via flag' : 'no MCP data in profile',
    )
  }

  if (!options.skipSkills && entry.skills) {
    const targets = options.targets || [agentFlag]
    const skillResult = await ensureSkillsInstalled(
      entry.skills,
      targets,
      options,
    )
    for (const r of skillResult) {
      if (r.action === 'installed') result.skills.applied.push(r.slug)
      else if (r.action === 'failed')
        result.skills.failed.push({ slug: r.slug, reason: r.reason })
      else result.skills.skipped.push(r.slug)
    }
  } else {
    result.skills.skipped.push(
      options.skipSkills ? 'skipped via flag' : 'no skills data in profile',
    )
  }

  if (entry.instructions) {
    const instrResult = await applyInstructions(agentFlag, entry.instructions)
    result.instructions.applied = instrResult
  } else {
    result.instructions.skipped.push('no instructions data in profile')
  }

  return result
}

export async function applyProfileData(data, options = {}) {
  if (!data?.agents || typeof data.agents !== 'object') {
    throw new Error('Profile must contain an "agents" object')
  }

  const results = {}
  for (const [agentFlag, entry] of Object.entries(data.agents)) {
    results[agentFlag] = await applyProfileEntry(agentFlag, entry, options)
  }

  return results
}

export function formatApplyResults(results) {
  const lines = []

  for (const [agent, result] of Object.entries(results)) {
    const changes = []

    if (result.config.applied.length > 0)
      changes.push(`config (${result.config.applied.length} scope(s))`)
    if (result.mcpServers.applied.length > 0)
      changes.push(`MCP (${result.mcpServers.applied.length})`)
    if (result.skills.applied.length > 0)
      changes.push(`skills (${result.skills.applied.length})`)
    if (result.instructions.applied.length > 0)
      changes.push(`instructions (${result.instructions.applied.length})`)

    if (changes.length > 0) {
      lines.push(`  ${agent}: ${changes.join(', ')}`)
    } else {
      lines.push(`  ${agent}: no changes`)
    }
  }

  return lines.join('\n')
}
