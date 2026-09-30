import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import AGENTS_DATA, { getAgentByFlag } from '../agents.js'
import { home } from './paths.js'
import { UserError } from './errors.js'

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

export async function ensureParentDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true })
}

export async function readLock(lockPath = getGlobalLockPath()) {
  try {
    const raw = await readFile(lockPath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {
      version: LOCKFILE_VERSION,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    }
  }
}

/**
 * Monotonic suffix so two writes in the same process never share a temp file.
 */
let tmpCounter = 0

/**
 * Rename with a short retry for transient contention.
 *
 * POSIX guarantees rename() is atomic, but Windows rejects a replace with
 * EPERM/EBUSY while the destination is momentarily open — concurrent
 * `rolecraft` processes locking the same file is enough to trigger it. These
 * clear on their own, so retry briefly before surfacing the error.
 */
async function renameWithRetry(from, to, attempts = 10) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await rename(from, to)
    } catch (error) {
      const transient =
        error.code === 'EPERM' ||
        error.code === 'EBUSY' ||
        error.code === 'EACCES'

      if (!transient || attempt === attempts) {
        throw error
      }

      await new Promise((resolve) => setTimeout(resolve, 5 * attempt))
    }
  }
}

/**
 * Write the lock file atomically.
 *
 * Serialising straight to the final path lets concurrent writers interleave,
 * so a reader can observe a truncated or half-written file. Writing to a
 * sibling temp file and renaming it into place keeps the swap atomic on the
 * same filesystem, so readers only ever see the old or the new file.
 */
export async function writeLock(data, lockPath = getGlobalLockPath()) {
  await ensureParentDir(lockPath)

  // The pid separates processes, the counter separates concurrent writes
  // within one process.
  const tmpPath = `${lockPath}.${process.pid}.${tmpCounter++}.tmp`

  try {
    await writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
    await renameWithRetry(tmpPath, lockPath)
  } catch (error) {
    // Never leave a stray temp file behind on a failed write.
    await rm(tmpPath, { force: true }).catch(() => {})
    throw error
  }
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
  } catch {
    lock = null
  }

  if (!lock || typeof lock !== 'object') {
    // Matches readLock: an unreadable file reads as an empty lock.
    lock = {
      version: LOCKFILE_VERSION,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    }
  }

  return lock
}

/**
 * In-process serialisation of mutations, keyed by lock path.
 *
 * The hash comparison in `updateLock` can only detect a write that landed
 * between our read and our write. It cannot help when several callers all pass
 * that check before any of them writes, which is exactly what happens with
 * concurrent `Promise.all` in one process. Measured on main, 12 concurrent
 * addSkillToLock calls left a single entry behind.
 *
 * Chaining each mutation onto the previous one for the same path closes the
 * in-process case outright, and it costs one promise per call. Cross-process
 * races are still handled by the retry loop, which is why both are here.
 */
const inProcessQueues = new Map()

function enqueue(lockPath, task) {
  const previous = inProcessQueues.get(lockPath) ?? Promise.resolve()

  // Swallow the predecessor's rejection so one failed mutation does not poison
  // the chain for every caller queued behind it.
  const run = previous.then(task, task)

  inProcessQueues.set(
    lockPath,
    run.catch(() => {}),
  )

  return run
}

/**
 * Monotonic suffix so two lock acquisitions in the same process never share an
 * ownership token.
 */
let lockTokenCounter = 0

/**
 * How long a lock file may sit untouched before it is treated as abandoned.
 *
 * A process killed mid-update cannot release its own lock, so without this a
 * crash would wedge every later install. The holder refreshes the sentinel on a
 * timer, so this means "dead" rather than "slow": a live holder that stalls for
 * longer still keeps its mtime current and is never stolen from.
 */
const LOCK_STALE_MS = 10_000

/**
 * How often the holder refreshes its sentinel while it works.
 *
 * Kept well under LOCK_STALE_MS so a slow but live holder is not mistaken for
 * a dead one.
 */
const LOCK_HEARTBEAT_MS = 2_000

/**
 * Bounded wait for a contended lock, in milliseconds.
 *
 * Long enough that a genuinely slow update is waited out rather than reported
 * as a failure.
 */
const LOCK_TIMEOUT_MS = 30_000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Path of the sentinel used to serialise updates to `lockPath`.
 */
function lockSentinelPath(lockPath) {
  return `${lockPath}.update-lock`
}

/**
 * Acquire an exclusive cross-process lock for a read-modify-write.
 *
 * `open(..., 'wx')` fails with EEXIST if the file already exists, which makes
 * creation itself the atomic test-and-set. There is no window between checking
 * for the lock and taking it, unlike a content-hash comparison, which only
 * narrows the race: two writers can both read the same hash, both see it
 * unchanged, and both write.
 *
 * Returns a release function. Callers must use try/finally, otherwise a thrown
 * mutation leaves the sentinel behind until it goes stale.
 */
async function acquireLock(lockPath, options = {}) {
  const sentinel = lockSentinelPath(lockPath)
  const timeoutMs = options.timeoutMs ?? LOCK_TIMEOUT_MS
  const staleMs = options.staleMs ?? LOCK_STALE_MS

  await ensureParentDir(sentinel)

  const deadline = Date.now() + timeoutMs
  let backoff = 2

  for (;;) {
    let handle

    try {
      handle = await open(sentinel, 'wx')
    } catch (error) {
      if (error.code !== 'EEXIST') throw error

      // Held by someone. Break the staleness check up so a crashed holder
      // cannot block installs forever.
      const heldStat = await stat(sentinel).catch(() => null)

      if (heldStat && Date.now() - heldStat.mtimeMs > staleMs) {
        await rm(sentinel, { force: true }).catch(() => {})
        continue
      }

      if (Date.now() > deadline) {
        throw new UserError(
          `Timed out after ${timeoutMs}ms waiting for another rolecraft process ` +
            `to finish updating ${lockPath}.`,
          {
            suggestion:
              'Wait for the other install to finish and try again. If no other ' +
              'install is running, delete the stale lock file and retry.',
            code: 'LOCK_TIMEOUT',
          },
        )
      }

      // Randomised backoff, so contenders do not resynchronise and collide
      // again on the next pass.
      await sleep(Math.min(backoff, 50) * (0.5 + Math.random()))
      backoff = Math.min(backoff * 2, 50)
      continue
    }

    // Record ownership in the sentinel. Without this, a holder that stalls past
    // the stale threshold can be stolen from, and on release it would remove
    // the *new* holder's sentinel instead of its own, quietly breaking mutual
    // exclusion. A pid + boot-unique suffix keeps a recycled pid from matching.
    const token = `${process.pid}-${lockTokenCounter++}`
    let recorded = false

    try {
      await handle.writeFile(token, 'utf-8')
      recorded = true
    } catch {
      // Best effort. With no record written we cannot tell a takeover from an
      // untouched file, so release falls back to cleaning up unconditionally
      // rather than stranding a sentinel nobody will remove.
    }

    // Refresh the mtime while we work, so LOCK_STALE_MS means "dead" and not
    // "slow". A suspended laptop or a stalled process then keeps its lock
    // rather than being overtaken.
    const heartbeat = setInterval(
      () => {
        const now = new Date()
        utimes(sentinel, now, now).catch(() => {})
      },
      Math.max(250, Math.min(LOCK_HEARTBEAT_MS, Math.floor(staleMs / 4))),
    )
    heartbeat.unref?.()

    let released = false

    return async () => {
      if (released) return
      released = true

      clearInterval(heartbeat)

      try {
        await handle.close()
      } catch {
        // Already closed; still fall through to the ownership check.
      }

      // Only remove the sentinel if it is still ours. If our lock was declared
      // stale and taken over while we were stalled, the file now belongs to
      // someone else and deleting it would let a third writer in alongside
      // them.
      const current = recorded
        ? await readFile(sentinel, 'utf-8').catch(() => null)
        : null

      if (!recorded || current === token) {
        await rm(sentinel, { force: true }).catch(() => {})
      }
    }
  }
}

/**
 * Apply `mutate` to the lock file under an exclusive lock.
 *
 * Every mutation in this module is a read-modify-write, and the rename in
 * `writeLock` is last-writer-wins. Without a guard, two installs that read the
 * same lock and each add a different skill both write, and the second rename
 * discards the first. The result parses cleanly and is silently missing an
 * entry, which is why the atomicity fix alone does not cover this.
 *
 * The lock is held across the whole read-modify-write, so a writer always sees
 * the previous writer's result rather than a stale snapshot.
 *
 * `mutate` must be a pure function of the lock returning a new lock rather than
 * mutating in place. That keeps the three helpers below symmetrical and makes
 * each one independently testable.
 */
async function updateLock(lockPath, mutate) {
  // In-process serialisation first, so a single process never contends with
  // itself over the sentinel. Cross-process safety comes from the lock itself.
  return enqueue(lockPath, async () => {
    const release = await acquireLock(lockPath)

    try {
      const lock = await readLockForUpdate(lockPath)
      const next = mutate(structuredClone(lock))

      // A mutation that changed nothing should not rewrite the file. Without
      // this, something like popHistory on a skill with no history re-serialises
      // an identical document, and a path that used to return instantly now
      // takes the lock and can hit the timeout.
      if (JSON.stringify(next) !== JSON.stringify(lock)) {
        await writeLock(next, lockPath)
      }

      return next
    } finally {
      await release()
    }
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
export const __testing = { acquireLock, lockSentinelPath }
