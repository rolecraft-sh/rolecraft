import {
  readProfile,
  writeProfile,
  deleteProfile,
  listProfiles,
  captureAllAgents,
  captureAgentFull,
  applyProfileData,
  validateProfile,
  ensureProfileDir,
  PROFILE_SCHEMA_VERSION,
} from '../utils/profile.js'

export async function apiProfileSave(name, options = {}) {
  let agentsData
  if (options.targets && options.targets.length > 0) {
    agentsData = {}
    for (const flag of options.targets) {
      const entry = await captureAgentFull(flag)
      if (entry) agentsData[flag] = entry
    }
  } else {
    agentsData = await captureAllAgents()
  }

  if (Object.keys(agentsData).length === 0) {
    throw new Error('No agent configurations found to save.')
  }

  if (options.dryRun) {
    return { dryRun: true, name, agents: agentsData }
  }

  const profileData = {
    name,
    description: `Saved on ${new Date().toLocaleDateString()}`,
    agents: agentsData,
  }

  await writeProfile(profileData)
  return { name, agents: Object.keys(agentsData).length, profile: profileData }
}

export async function apiProfileApply(name, options = {}) {
  const data = await readProfile(name)
  if (!data) throw new Error(`Profile "${name}" not found.`)

  if (options.dryRun) {
    const agentsToApply = options.targets?.length > 0
      ? Object.fromEntries(Object.entries(data.agents).filter(([flag]) => options.targets.includes(flag)))
      : data.agents
    return { dryRun: true, name, agents: agentsToApply }
  }

  const results = await applyProfileData(data, {
    targets: options.targets,
    skipMcp: options.skipMcp,
    skipSkills: options.skipSkills,
  })
  return { name, results }
}

export async function apiProfileDiff(name) {
  const data = await readProfile(name)
  if (!data) throw new Error(`Profile "${name}" not found.`)
  if (!data.agents) return { name, diffs: {} }

  const diffs = {}
  let hasChanges = false

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

    if (JSON.stringify(profileConfig) !== JSON.stringify(currentConfig)) differences.push('config')
    if (JSON.stringify(profileMcp) !== JSON.stringify(currentMcp)) differences.push('mcpServers')
    if (JSON.stringify(profileSkills) !== JSON.stringify(currentSkills)) differences.push('skills')
    if (JSON.stringify(profileInstr) !== JSON.stringify(currentInstr)) differences.push('instructions')

    diffs[flag] = { differences, hasDiff: differences.length > 0 }
    if (differences.length > 0) hasChanges = true
  }

  return { name, diffs, hasChanges }
}

export async function apiProfileList() {
  const profiles = await listProfiles()
  return profiles.map(p => ({
    name: p.name,
    description: p.description,
    agentCount: p.agentCount,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }))
}

export async function apiProfileShow(name) {
  const data = await readProfile(name)
  if (!data) throw new Error(`Profile "${name}" not found.`)
  return data
}

export async function apiProfileDelete(name, options = {}) {
  if (options.dryRun) {
    const exists = await readProfile(name)
    return { dryRun: true, name, exists: !!exists }
  }
  const deleted = await deleteProfile(name)
  if (!deleted) throw new Error(`Profile "${name}" not found.`)
  return { name, deleted: true }
}

export async function apiProfileImport(path) {
  const { readFile, writeFile } = await import('node:fs/promises')
  const { resolve, join } = await import('node:path')
  const { homedir } = await import('node:os')

  let content
  const isUrl = path.startsWith('http://') || path.startsWith('https://')
  if (isUrl) {
    const res = await fetch(path)
    if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
    content = await res.text()
  } else {
    content = await readFile(resolve(path), 'utf-8')
  }

  let data
  try { data = JSON.parse(content) } catch { throw new Error('Invalid JSON in profile.') }
  if (!data.name) {
    const nameFromFile = path.split('/').pop()?.replace(/\.json$/i, '') || 'imported'
    data.name = nameFromFile
  }
  data.agents = data.agents || {}

  const validation = validateProfile(data)
  if (!validation.valid) throw new Error(`Invalid profile data:\n  ${validation.errors.join('\n  ')}`)

  const enriched = {
    ...data,
    name: data.name,
    version: data.version ?? PROFILE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    createdAt: data.createdAt ?? new Date().toISOString(),
  }

  await ensureProfileDir()
  const { profilePath } = await import('../utils/profile.js')
  const pp = resolve(profilePath(data.name))
  const profilesDir = resolve(join(homedir(), '.agents', 'profiles'))
  if (!pp.startsWith(profilesDir)) throw new Error('Invalid profile path')
  await writeFile(pp, JSON.stringify(enriched, null, 2) + '\n', 'utf-8')

  return { name: data.name, agents: Object.keys(data.agents).length, profile: enriched }
}