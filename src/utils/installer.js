import {
  mkdir,
  cp,
  writeFile,
  readFile,
  stat,
  symlink,
  rm,
  readdir,
} from 'node:fs/promises'
import { join, relative, dirname } from 'node:path'
import { homedir } from 'node:os'
import {
  addSkillToLock,
  getGlobalLockPath,
  getProjectLockPath,
  computeFileHashes,
} from './lockfile.js'
import { getAgentByFlag } from '../agents.js'

function normalizeSlug(slug) {
  return slug.replace(/\//g, '-')
}

function home(...parts) {
  return join(homedir(), ...parts)
}

/**
 * Get the backup directory path for a skill.
 */
export function getBackupDir(slug) {
  return home('.agents', '.backups', normalizeSlug(slug))
}

/**
 * Back up the current skill files before overwriting.
 * Saves a snapshot of fileContents as JSON to the backup dir.
 * Returns the backup timestamp, or null if no existing files were found.
 */
export async function backupSkill(slug, fileContents) {
  const backupDir = getBackupDir(slug)
  await mkdir(backupDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = join(backupDir, `${timestamp}.json`)
  await writeFile(backupFile, JSON.stringify(fileContents, null, 2), 'utf-8')
  return timestamp
}

/**
 * List available backups for a skill, ordered newest-first.
 */
export async function listBackups(slug) {
  const backupDir = getBackupDir(slug)
  let entries
  try {
    entries = await readdir(backupDir)
  } catch {
    return []
  }
  const backups = entries
    .filter((e) => e.endsWith('.json'))
    .sort()
    .reverse()
  return backups.map((b) => ({
    timestamp: b.replace('.json', ''),
    path: join(backupDir, b),
  }))
}

/**
 * Restore skill files from the most recent backup.
 * Returns the restored fileContents, or null if no backup exists.
 */
export async function restoreSkill(slug) {
  const backups = await listBackups(slug)
  if (backups.length === 0) return null
  const raw = await readFile(backups[0].path, 'utf-8')
  return JSON.parse(raw)
}

/**
 * Remove the most recent backup after a successful rollback.
 */
export async function removeLatestBackup(slug) {
  const backups = await listBackups(slug)
  if (backups.length === 0) return
  await rm(backups[0].path, { force: true }).catch(() => {})
}

export async function installSkill(resolved, targets, mode = 'copy') {
  const slug = resolved.slug

  const agentNames = targets.map((t) => {
    const agent = getAgentByFlag(t)
    return agent ? agent.name : t
  })

  /**
   * Install to a single target (agent or project).
   * Extracted so multiple targets can run in parallel.
   */
  async function installToTarget(target) {
    let baseDir
    let label

    if (target === 'project') {
      baseDir = join(process.cwd(), '.agents', 'skills')
      label = './.agents/skills/'
    } else {
      const agent = getAgentByFlag(target)
      if (!agent) return null
      baseDir = agent.getDir()
      label = agent.label
    }

    const slugDir = join(baseDir, normalizeSlug(slug))

    if (mode === 'symlink' && resolved.skillDir) {
      const relPath = relative(dirname(slugDir), resolved.skillDir)
      await rm(slugDir, { recursive: true, force: true })
      await mkdir(dirname(slugDir), { recursive: true })
      await symlink(relPath, slugDir)
    } else {
      // Back up existing files before overwriting (for rollback support)
      try {
        await stat(slugDir)
        const oldFiles = {}
        const oldEntries = await readdir(slugDir, {
          withFileTypes: true,
        }).catch(() => [])
        for (const entry of oldEntries) {
          if (entry.isFile()) {
            try {
              oldFiles[entry.name] = await readFile(
                join(slugDir, entry.name),
                'utf-8',
              )
            } catch {}
          }
        }
        if (Object.keys(oldFiles).length > 0) {
          await backupSkill(slug, oldFiles).catch(() => {})
        }
      } catch {
        // directory doesn't exist yet — nothing to back up
      }
      await rm(slugDir, { recursive: true, force: true })
      await mkdir(slugDir, { recursive: true })
      for (const file of resolved.files) {
        const dst = join(slugDir, file)
        if (Object.hasOwn(resolved.fileContents || {}, file)) {
          await writeFile(dst, resolved.fileContents[file])
        } else if (resolved.skillDir) {
          const src = join(resolved.skillDir, file)
          try {
            await stat(src)
            await cp(src, dst, { recursive: true, force: true })
          } catch {
            // skip files that don't exist
          }
        }
      }
    }

    const lockPath =
      target === 'project'
        ? getProjectLockPath(process.cwd())
        : getGlobalLockPath()

    await addSkillToLock(
      slug,
      {
        slug,
        contentSha: resolved.contentSha,
        fileHashes: resolved.fileContents
          ? computeFileHashes(resolved.fileContents)
          : undefined,
        installedAt: new Date().toISOString(),
        agents: agentNames,
        source: resolved.sourcePath,
        sourceType: resolved.sourceType,
      },
      lockPath,
    )

    return { target, path: slugDir, label }
  }

  // Run all target installations in parallel with error isolation
  const outcomes = await Promise.allSettled(
    targets.map((t) => installToTarget(t)),
  )

  const results = []
  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled' && outcome.value !== null) {
      results.push(outcome.value)
    }
    // Rejected targets are silently skipped — one agent failure
    // shouldn't prevent skill installation to other agents.
    // (installToTarget only throws on lockfile write failures.)
  }

  return results
}
