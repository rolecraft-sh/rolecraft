import { readFile } from 'node:fs/promises'
import { home } from './paths.js'
import { UserError } from './errors.js'
import { updateLockFile, writeJsonAtomic } from './lock-write.js'

const MCP_LOCK_VERSION = 1

export function getMcpLockPath() {
  return home('.agents', '.mcp-lock.json')
}

function emptyMcpLock() {
  return {
    version: MCP_LOCK_VERSION,
    servers: {},
  }
}

/**
 * Read the MCP lock file.
 *
 * A missing file is genuinely an empty lock and reads as one. Anything else is
 * not: an unreadable or malformed file used to be reported as an empty lock as
 * well, which meant a single torn write was indistinguishable from never having
 * added a server. The next write then persisted that empty state and the user's
 * server list was gone with no error anywhere.
 *
 * The write side is now atomic, so this should not happen from a torn write. It
 * still fails loudly rather than silently, because a lock file that cannot be
 * parsed must not be overwritten with an empty one.
 */
export async function readMcpLock(lockPath = getMcpLockPath()) {
  let raw

  try {
    raw = await readFile(lockPath, 'utf-8')
  } catch (error) {
    if (error.code === 'ENOENT') {
      return emptyMcpLock()
    }

    throw new UserError(
      `Could not read the MCP lock file at ${lockPath}: ${error.message}`,
      {
        suggestion:
          'Check the file permissions, or delete it to start over with an empty MCP server list.',
        code: 'MCP_LOCK_UNREADABLE',
      },
    )
  }

  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new UserError(
      `The MCP lock file at ${lockPath} is not valid JSON: ${error.message}`,
      {
        suggestion:
          'Move the file aside to start over with an empty MCP server list, or restore it from a backup.',
        code: 'MCP_LOCK_CORRUPT',
      },
    )
  }
}

export async function writeMcpLock(data, lockPath = getMcpLockPath()) {
  await writeJsonAtomic(lockPath, data)
}

export async function addServerToMcpLock(
  serverName,
  entry,
  lockPath = getMcpLockPath(),
) {
  return updateLockFile(lockPath, {
    read: readMcpLock,
    write: writeMcpLock,
    mutate: (lock) => {
      const existing = lock.servers[serverName]

      const mergedAgents = existing?.agents
        ? [...new Set([...existing.agents, ...(entry.agents || [])])]
        : entry.agents || []

      lock.servers[serverName] = {
        ...entry,
        agents: mergedAgents,
      }

      return lock
    },
  })
}

export async function removeServerFromMcpLock(
  serverName,
  agentToRemove,
  lockPath = getMcpLockPath(),
) {
  return updateLockFile(lockPath, {
    read: readMcpLock,
    write: writeMcpLock,
    mutate: (lock) => {
      if (!lock.servers[serverName]) {
        return lock
      }

      const remaining = (lock.servers[serverName].agents || []).filter(
        (agent) => agent !== agentToRemove,
      )

      if (remaining.length === 0) {
        delete lock.servers[serverName]
      } else {
        lock.servers[serverName].agents = remaining
      }

      return lock
    },
  })
}
