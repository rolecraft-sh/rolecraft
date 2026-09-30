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
import { dirname } from 'node:path'
import { UserError } from './errors.js'

/**
 * The write path shared by the JSON lockfiles.
 *
 * Two separate problems live here, and fixing one without the other makes
 * things worse rather than better:
 *
 * 1. A direct write to the final path is not atomic with respect to a
 *    concurrent reader, so a reader can observe a truncated file.
 * 2. A read-modify-write with an atomic write behind it is still
 *    last-writer-wins, so two writers each read the same snapshot, each change
 *    something different, and the second rename discards the first. The file
 *    left behind parses cleanly and is silently missing an entry, which is why
 *    fixing only the torn write turns a loud corruption into a quiet data loss.
 *
 * `writeJsonAtomic` covers the first, `updateLockFile` covers both.
 */

export async function ensureParentDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true })
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
 * Write a JSON document atomically.
 *
 * Serialising straight to the final path lets concurrent writers interleave,
 * so a reader can observe a truncated or half-written file. Writing to a
 * sibling temp file and renaming it into place keeps the swap atomic on the
 * same filesystem, so readers only ever see the old or the new file.
 */
export async function writeJsonAtomic(lockPath, data) {
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
 * Path of the sentinel used to serialise updates to `lockPath`.
 */
function lockSentinelPath(lockPath) {
  return `${lockPath}.update-lock`
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
 * In-process serialisation of mutations, keyed by lock path.
 *
 * Chaining each mutation onto the previous one for the same path stops several
 * callers in one process from contending for the cross-process sentinel at all,
 * and it costs one promise per call.
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
 * Apply `mutate` to a JSON document on disk under an exclusive lock.
 *
 * The lock is held across the whole read-modify-write, so a writer always sees
 * the previous writer's result rather than a stale snapshot. `read` and `write`
 * are supplied by the caller because each lockfile has its own shape and its
 * own idea of what a missing file means.
 *
 * `mutate` receives a clone of the current document and must return a new
 * document rather than mutating in place. A mutation that returns an unchanged
 * document does not rewrite the file, so a no-op cannot take a lock and strand
 * a sentinel, and cannot rewrite a file it did not need to touch.
 */
export async function updateLockFile(lockPath, { read, write, mutate }) {
  // In-process serialisation first, so a single process never contends with
  // itself over the sentinel. Cross-process safety comes from the lock itself.
  return enqueue(lockPath, async () => {
    const release = await acquireLock(lockPath)

    try {
      const current = await read(lockPath)
      const next = mutate(structuredClone(current))

      if (JSON.stringify(next) !== JSON.stringify(current)) {
        await write(next, lockPath)
      }

      return next
    } finally {
      await release()
    }
  })
}

export const __testing = { acquireLock, lockSentinelPath }
