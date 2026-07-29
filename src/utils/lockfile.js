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
  lock.skills[slug] = {
    ...entry,
    agents: mergedAgents,
    installedAt: new Date().toISOString(),
  }
  await writeLock(lock, lockPath)
  return lock
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
