import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

const PROFILES_DIR = '.agents/profiles'

const PROFILE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/

export const PROFILE_SCHEMA_VERSION = 1

export function getProfilesDir() {
  return join(homedir(), PROFILES_DIR)
}

export async function ensureProfileDir() {
  await mkdir(getProfilesDir(), { recursive: true })
}

export function profilePath(name) {
  if (!isValidProfileName(name)) {
    throw new Error(`Invalid profile name: "${name}". Use only letters, digits, hyphens, underscores, or dots.`)
  }
  return join(getProfilesDir(), `${name}.json`)
}

export function isValidProfileName(name) {
  return typeof name === 'string' && name.length >= 1 && name.length <= 64 && PROFILE_NAME_RE.test(name)
}

export function validateProfile(data) {
  const errors = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Profile data must be a non-null object'] }
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Missing or invalid "name": must be a non-empty string')
  } else if (!isValidProfileName(data.name)) {
    errors.push(`Invalid profile name "${data.name}": use only letters, digits, hyphens, underscores, or dots`)
  }

  if (data.version !== undefined && typeof data.version !== 'number') {
    errors.push('"version" must be a number')
  }

  if (data.agents !== undefined) {
    if (typeof data.agents !== 'object' || data.agents === null || Array.isArray(data.agents)) {
      errors.push('"agents" must be a non-null object')
    } else {
      for (const [agentKey, agentVal] of Object.entries(data.agents)) {
        if (typeof agentVal !== 'object' || agentVal === null) {
          errors.push(`"agents.${agentKey}" must be a non-null object`)
          continue
        }
        if (agentVal.config !== undefined && typeof agentVal.config !== 'object') {
          errors.push(`"agents.${agentKey}.config" must be an object`)
        }
        if (agentVal.instructions !== undefined && !Array.isArray(agentVal.instructions)) {
          errors.push(`"agents.${agentKey}.instructions" must be an array`)
        }
        if (agentVal.mcpServers !== undefined) {
          if (typeof agentVal.mcpServers !== 'object' || agentVal.mcpServers === null || Array.isArray(agentVal.mcpServers)) {
            errors.push(`"agents.${agentKey}.mcpServers" must be a non-null object`)
          }
        }
        if (agentVal.skills !== undefined && !Array.isArray(agentVal.skills)) {
          errors.push(`"agents.${agentKey}.skills" must be an array`)
        }
      }
    }
  }

  if (data.projectOverrides !== undefined) {
    if (typeof data.projectOverrides !== 'object' || data.projectOverrides === null || Array.isArray(data.projectOverrides)) {
      errors.push('"projectOverrides" must be a non-null object')
    }
  }

  if (data.localOverrides !== undefined) {
    if (typeof data.localOverrides !== 'object' || data.localOverrides === null || Array.isArray(data.localOverrides)) {
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
    throw new Error(`Invalid profile data:\n  ${validation.errors.join('\n  ')}`)
  }

  const enriched = {
    ...data,
    name: data.name,
    version: data.version ?? PROFILE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    createdAt: data.createdAt ?? new Date().toISOString(),
  }

  await ensureProfileDir()
  await writeFile(profilePath(data.name), JSON.stringify(enriched, null, 2) + '\n', 'utf-8')
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
    if (a.updatedAt && b.updatedAt) return b.updatedAt.localeCompare(a.updatedAt)
    if (a.updatedAt) return -1
    if (b.updatedAt) return 1
    return a.name.localeCompare(b.name)
  })

  return results
}
