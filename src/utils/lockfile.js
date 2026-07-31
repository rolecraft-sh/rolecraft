import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { getAgentByFlag } from '../agents.js'

function home(...parts) {
  return join(homedir(), ...parts)
}

export function getGlobalLockPath() {
  return home('.agents', '.skill-lock.json')
}

export function getAgentsDir() {
  return home('.agents', 'skills')
}

/**
 * Resolve an agent's skill directory from agents.js data.
 * Falls back to ~/.agents/skills for unknown flags.
 */
export function getDirForAgent(flag) {
  const agent = getAgentByFlag(flag)
  if (agent) return agent.getDir()
  return home('.agents', 'skills')
}

export function getProjectLockPath(cwd) {
  return join(cwd, '.agents', '.skill-lock.json')
}

async function ensureParentDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true })
}

export async function readLock(lockPath = getGlobalLockPath()) {
  try {
    const raw = await readFile(lockPath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [] }
  }
}

export async function writeLock(data, lockPath = getGlobalLockPath()) {
  await ensureParentDir(lockPath)
  await writeFile(lockPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
}

/**
 * Maximum number of historical versions to retain per skill.
 */
const MAX_HISTORY = 5

/**
 * Push the current entry into the skill's history before overwriting it.
 * Only pushes when the contentSha differs (i.e. a real update, not a re-install).
 * Oldest entries are trimmed to MAX_HISTORY.
 */
function pushHistory(lock, slug, newEntry) {
  const existing = lock.skills[slug]
  if (!existing?.contentSha) return // nothing to save
  if (existing.contentSha === newEntry.contentSha) return // no change

  if (!lock.skills[slug].history) lock.skills[slug].history = []

  lock.skills[slug].history.push({
    contentSha: existing.contentSha,
    fileHashes: existing.fileHashes || {},
    installedAt: existing.installedAt,
    source: existing.source,
    sourceType: existing.sourceType,
  })

  // Keep only the most recent MAX_HISTORY entries
  if (lock.skills[slug].history.length > MAX_HISTORY) {
    lock.skills[slug].history = lock.skills[slug].history.slice(-MAX_HISTORY)
  }
}

export async function addSkillToLock(
  slug,
  entry,
  lockPath = getGlobalLockPath(),
) {
  const lock = await readLock(lockPath)
  const existing = lock.skills[slug]
  const mergedAgents = existing?.agents
    ? [...new Set([...existing.agents, ...(entry.agents || [])])]
    : entry.agents || []

  pushHistory(lock, slug, entry)

  // Capture history before overwriting the entry (pushHistory modifies it in-place)
  const history = lock.skills[slug]?.history || []

  lock.skills[slug] = {
    ...entry,
    agents: mergedAgents,
    installedAt: new Date().toISOString(),
    history,
  }
  await writeLock(lock, lockPath)
  return lock
}

/**
 * Get the rollback history for a specific skill.
 * Returns an array of historical entries (newest first).
 */
export async function getSkillHistory(slug, lockPath = getGlobalLockPath()) {
  const lock = await readLock(lockPath)
  const entry = lock.skills[slug]
  if (!entry?.history || entry.history.length === 0) return []
  return [...entry.history].reverse()
}

/**
 * Rollback a skill to the latest historical version.
 * Removes the most recent history entry and restores its metadata.
 * Returns the restored entry data, or null if no history exists.
 */
export async function popHistory(slug, lockPath = getGlobalLockPath()) {
  const lock = await readLock(lockPath)
  const entry = lock.skills[slug]
  if (!entry?.history || entry.history.length === 0) return null

  const prev = entry.history.pop()
  // Restore the previous version's metadata into the current entry
  lock.skills[slug].contentSha = prev.contentSha
  lock.skills[slug].fileHashes = prev.fileHashes
  lock.skills[slug].installedAt = prev.installedAt
  lock.skills[slug].source = prev.source
  lock.skills[slug].sourceType = prev.sourceType
  await writeLock(lock, lockPath)
  return prev
}

export async function removeSkillFromLock(
  slug,
  lockPath = getGlobalLockPath(),
) {
  const lock = await readLock(lockPath)
  delete lock.skills[slug]
  await writeLock(lock, lockPath)
  return lock
}

export function computeContentHash(fileContents) {
  const hash = createHash('sha256')
  const sortedNames = Object.keys(fileContents).sort()
  for (const name of sortedNames) {
    hash.update(`${name}\0`)
    hash.update(fileContents[name])
  }
  return hash.digest('hex')
}

export function computeFileHashes(fileContents) {
  const hashes = {}
  for (const [name, content] of Object.entries(fileContents)) {
    hashes[name] = createHash('sha256').update(content).digest('hex')
  }
  return hashes
}
