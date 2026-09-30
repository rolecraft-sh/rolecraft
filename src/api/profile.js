import {
  readProfile,
  writeProfile,
  deleteProfile,
  listProfiles,
  captureAllAgents,
  captureAgentFull,
  applyProfileData,
  validateProfile,
} from '../utils/profile.js'
import { UserError } from '../utils/errors.js'
import { fetchFollowingRedirects } from '../utils/http-fetch.js'

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
    const agentsToApply =
      options.targets?.length > 0
        ? Object.fromEntries(
            Object.entries(data.agents).filter(([flag]) =>
              options.targets.includes(flag),
            ),
          )
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

    if (JSON.stringify(profileConfig) !== JSON.stringify(currentConfig))
      differences.push('config')
    if (JSON.stringify(profileMcp) !== JSON.stringify(currentMcp))
      differences.push('mcpServers')
    if (JSON.stringify(profileSkills) !== JSON.stringify(currentSkills))
      differences.push('skills')
    if (JSON.stringify(profileInstr) !== JSON.stringify(currentInstr))
      differences.push('instructions')

    diffs[flag] = { differences, hasDiff: differences.length > 0 }
    if (differences.length > 0) hasChanges = true
  }

  return { name, diffs, hasChanges }
}

export async function apiProfileList() {
  const profiles = await listProfiles()
  return profiles.map((p) => ({
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

const ALLOWED_PROFILE_HOSTS = [
  'github.com',
  'raw.githubusercontent.com',
  'gist.github.com',
  'raw.gist.github.com',
]

/**
 * Maximum number of redirect hops to follow when importing a profile.
 */
const MAX_PROFILE_REDIRECTS = 3

function assertAllowedProfileHost(url) {
  const { hostname } = new URL(url)

  if (!ALLOWED_PROFILE_HOSTS.includes(hostname)) {
    throw new UserError(
      `URL host "${hostname}" is not allowed for profile imports. ` +
        `Allowed hosts: ${ALLOWED_PROFILE_HOSTS.join(', ')}`,
      {
        suggestion: 'Use a direct link to a raw file on an allowed host.',
        code: 'PROFILE_HOST_NOT_ALLOWED',
      },
    )
  }
}

/**
 * Fetch a profile body, following redirects by hand.
 *
 * `redirect: 'follow'` would let any allowed host bounce the request to an
 * arbitrary origin, so the allow-list has to be re-checked on every hop rather
 * than only on the URL the user supplied. The loop itself lives in
 * `utils/http-fetch.js` so the npm tarball download can share it instead of
 * growing a second copy.
 */
async function fetchProfileBody(url) {
  const { response, url: finalUrl } = await fetchFollowingRedirects(url, {
    assertAllowed: assertAllowedProfileHost,
    maxRedirects: MAX_PROFILE_REDIRECTS,
    subject: `importing profile from ${url}`,
    codeBase: 'PROFILE_REDIRECT',
    suggestion: 'Use a direct link to the raw profile file.',
  })

  if (!response.ok) {
    throw new UserError(`Failed to fetch ${finalUrl}: ${response.status}`, {
      code: 'PROFILE_FETCH_FAILED',
    })
  }

  return response.text()
}

export async function apiProfileImport(path) {
  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')

  function parseProfileJSON(raw) {
    try {
      return JSON.parse(raw)
    } catch {
      throw new Error('Invalid JSON in profile.')
    }
  }

  let data
  const isUrl = path.startsWith('http://') || path.startsWith('https://')
  if (isUrl) {
    data = parseProfileJSON(await fetchProfileBody(path))
  } else {
    data = parseProfileJSON(await readFile(resolve(path), 'utf-8'))
  }

  if (!data.name) {
    const nameFromFile =
      path
        .split('/')
        .pop()
        ?.replace(/\.json$/i, '') || 'imported'
    data.name = nameFromFile
  }
  data.agents = data.agents || {}

  const validation = validateProfile(data)
  if (!validation.valid)
    throw new Error(
      `Invalid profile data:\n  ${validation.errors.join('\n  ')}`,
    )

  const enriched = await writeProfile(data)

  return {
    name: enriched.name,
    agents: Object.keys(enriched.agents || {}).length,
    profile: enriched,
  }
}
