import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import AGENTS_DATA, { getAgentByFlag } from '../agents.js'
import { home } from './paths.js'
import { UserError } from './errors.js'
import {
  ensureParentDir,
  updateLockFile,
  writeJsonAtomic,
  __testing as __testingLockWrite,
} from './lock-write.js'

export { ensureParentDir }

const LOCKFILE_VERSION = 3

export function normalizeSlug(slug) {
  return slug.replace(/\//g, '-')
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
  const agent = getAgentByFlag(flag) || AGENTS_DATA.find((a) => a.name === flag)

  if (agent) {
    return agent.getDir()
  }

  return home('.agents', 'skills')
}

export function getProjectLockPath(cwd) {
  return join(cwd, '.agents', '.skill-lock.json')
}

/**
 * The lock a missing file reads as.
 *
 * A missing lock is normal, so it gets the empty shape. A damaged one does
 * not, and must never reach a caller as an empty lock: see readLock.
 */
function emptyLock() {
  return {
    version: LOCKFILE_VERSION,
    skills: {},
    dismissed: {},
    lastSelectedAgents: [],
  }
}

/**
 * Reject a parsed lock that a caller could not use.
 *
 * `readLock` used to hand back whatever JSON.parse returned, so a file
 * holding `null`, `{}` or `{"version":3}` travelled on until the first
 * `lock.skills[...]` raised a raw TypeError with no suggestion. Callers
 * only ever index `skills`, so that is the shape that has to hold.
 */
function assertUsableLock(lock) {
  if (lock === null || typeof lock !== 'object' || Array.isArray(lock)) {
    return false
  }
  const { skills } = lock
  if (skills === null || typeof skills !== 'object' || Array.isArray(skills)) {
    return false
  }
  return true
}

function corruptLockError(lockPath, reason) {
  return new UserError(`Skill lockfile is corrupted: ${lockPath}`, {
    suggestion:
      'Restore the lockfile from version control or delete it to rebuild an ' +
      'empty one, then run the command again.',
    detail: reason,
    code: 'LOCKFILE_CORRUPT',
  })
}

export async function readLock(lockPath = getGlobalLockPath()) {
  let raw
  try {
    raw = await readFile(lockPath, 'utf-8')
  } catch (err) {
    // A lock that is not there yet is the normal case.
    if (err && err.code === 'ENOENT') {
      return emptyLock()
    }
    throw err
  }

  let lock
  try {
    lock = JSON.parse(raw)
  } catch (err) {
    // Swallowing a parse error and returning an empty lock destroys the
    // original bytes on the next write, with nothing to tell the user.
    throw corruptLockError(lockPath, err.message)
  }

  if (!assertUsableLock(lock)) {
    throw corruptLockError(
      lockPath,
      'parsed JSON has no usable "skills" object',
    )
  }

  return lock
}

/**
 * Write the lock file atomically.
 *
 * The implementation is shared with the MCP lockfile, so both stop carrying
 * their own copy of the temp-file-and-rename dance.
 */
export async function writeLock(data, lockPath = getGlobalLockPath()) {
  await writeJsonAtomic(lockPath, data)
}

/**
 * Read the lock file for an update, tolerating a missing or unreadable file.
 *
 * Mirrors `readLock`, which is deliberately not reused so the two stay
 * independent: a reader should never be able to block or fail a writer.
 */
async function readLockForUpdate(lockPath) {
  let raw

  try {
    raw = await readFile(lockPath, 'utf-8')
  } catch {
    raw = null
  }

  let lock
  try {
    // JSON.parse(null) coerces to the string "null" and returns null rather
    // than throwing, so a missing file has to be handled explicitly.
    lock = raw === null ? null : JSON.parse(raw)
  } catch (err) {
    throw corruptLockError(lockPath, err.message)
  }

  // A missing lock reads as empty, matching readLock. A damaged one is
  // reported instead of silently reset: this path exists to update a lock
  // in place, so treating corruption as "no lock" would overwrite whatever
  // the user still has on disk.
  if (lock === null) {
    return emptyLock()
  }

  if (!assertUsableLock(lock)) {
    throw corruptLockError(
      lockPath,
      'parsed JSON has no usable "skills" object',
    )
  }

  return lock
}

/**
 * Apply `mutate` to the skill lock file under an exclusive lock.
 *
 * Every mutation in this module is a read-modify-write, and the rename in
 * `writeLock` is last-writer-wins. Without a guard, two installs that read the
 * same lock and each add a different skill both write, and the second rename
 * discards the first. The result parses cleanly and is silently missing an
 * entry, which is why the atomicity fix alone does not cover this.
 *
 * `mutate` must be a pure function of the lock returning a new lock rather than
 * mutating in place. That keeps the three helpers below symmetrical and makes
 * each one independently testable.
 *
 * The guard itself is shared with the MCP lockfile, which had the same two
 * problems, so it lives in `lock-write.js` rather than here.
 */
function updateLock(lockPath, mutate) {
  return updateLockFile(lockPath, {
    read: readLockForUpdate,
    write: writeLock,
    mutate,
  })
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

  if (!existing?.contentSha) {
    return
  }

  if (existing.contentSha === newEntry.contentSha) {
    return
  }

  if (!lock.skills[slug].history) {
    lock.skills[slug].history = []
  }

  lock.skills[slug].history.push({
    contentSha: existing.contentSha,
    fileHashes: existing.fileHashes || {},
    installedAt: existing.installedAt,
    source: existing.source,
    sourceType: existing.sourceType,
  })

  if (lock.skills[slug].history.length > MAX_HISTORY) {
    lock.skills[slug].history = lock.skills[slug].history.slice(-MAX_HISTORY)
  }
}

export async function addSkillToLock(
  slug,
  entry,
  lockPath = getGlobalLockPath(),
) {
  return updateLock(lockPath, (lock) => {
    const existing = lock.skills[slug]

    const mergedAgents = existing?.agents
      ? [...new Set([...existing.agents, ...(entry.agents || [])])]
      : entry.agents || []

    pushHistory(lock, slug, entry)

    const history = lock.skills[slug]?.history || []

    lock.skills[slug] = {
      ...entry,
      agents: mergedAgents,
      installedAt: new Date().toISOString(),
      history,
    }

    return lock
  })
}

/**
 * Get the rollback history for a specific skill.
 * Returns an array of historical entries (newest first).
 */
export async function getSkillHistory(slug, lockPath = getGlobalLockPath()) {
  const lock = await readLock(lockPath)
  const entry = lock.skills[slug]

  if (!entry?.history || entry.history.length === 0) {
    return []
  }

  return [...entry.history].reverse()
}

/**
 * Rollback a skill to the latest historical version.
 * Removes the most recent history entry and restores its metadata.
 * Returns the restored entry data, or null if no history exists.
 */
export async function popHistory(slug, lockPath = getGlobalLockPath()) {
  // Cheap pre-check for the common no-op case, so rolling back a skill that
  // was never updated does not take the cross-process lock at all. That path
  // is reached on every rollback attempt, including ones with nothing to undo,
  // and acquiring a contended lock for a read we already know is pointless
  // turns a free operation into one that can wait out the timeout.
  //
  // This is advisory only. The read is deliberately not locked, so it can go
  // stale, and another process may add history between here and the mutation
  // below. The locked mutation re-checks and remains the only thing that
  // decides, so a wrong answer here costs a wasted lock, never a lost update.
  const snapshot = await readLock(lockPath)

  if (!snapshot.skills[slug]?.history?.length) {
    return null
  }

  // The mutation returns the entry that was rolled back to, which is not part
  // of the lock itself, so it is captured out of band. A retry re-applies the
  // pop to a fresh snapshot, so each attempt still rolls back exactly one
  // version rather than compounding.
  let popped = null

  await updateLock(lockPath, (current) => {
    const entry = current.skills[slug]

    if (!entry?.history || entry.history.length === 0) {
      popped = null
      return current
    }

    const prev = entry.history.pop()

    current.skills[slug].contentSha = prev.contentSha
    current.skills[slug].fileHashes = prev.fileHashes
    current.skills[slug].installedAt = prev.installedAt
    current.skills[slug].source = prev.source
    current.skills[slug].sourceType = prev.sourceType

    popped = prev

    return current
  })

  // No history to roll back, so nothing was written and the caller sees null.
  if (popped === null) {
    return null
  }

  return popped
}

export async function removeSkillFromLock(
  slug,
  lockPath = getGlobalLockPath(),
) {
  return updateLock(lockPath, (lock) => {
    delete lock.skills[slug]

    return lock
  })
}

export function findActualSlug(slug, lock) {
  if (lock.skills[slug]) return slug
  const normalized = normalizeSlug(slug)
  const found = Object.keys(lock.skills).find(
    (k) => normalizeSlug(k) === normalized,
  )
  if (found) return found
  return Object.keys(lock.skills).find((k) => {
    const namePart = k.split('/').pop()
    return namePart === slug || normalizeSlug(namePart) === normalized
  })
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

/**
 * Exposed for tests only.
 *
 * The timeout is the one failure mode of the update lock a user can actually
 * reach, so it needs coverage. Threading a timeout through the three public
 * helpers would put a test concern in the public API, so it lives here instead.
 */
export const __testing = __testingLockWrite
