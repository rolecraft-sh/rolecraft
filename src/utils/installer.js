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
import { home } from './paths.js'
import { join, relative, dirname } from 'node:path'
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
    .filter((entry) => entry.endsWith('.json'))
    .sort()
    .reverse()

  return backups.map((backup) => ({
    timestamp: backup.replace('.json', ''),
    path: join(backupDir, backup),
  }))
}

/**
 * Restore skill files from the most recent backup.
 * Returns the restored fileContents, or null if no backup exists.
 */
export async function restoreSkill(slug) {
  const backups = await listBackups(slug)

  if (backups.length === 0) {
    return null
  }

  const raw = await readFile(backups[0].path, 'utf-8')

  return JSON.parse(raw)
}

/**
 * Remove the most recent backup after a successful rollback.
 */
export async function removeLatestBackup(slug) {
  const backups = await listBackups(slug)

  if (backups.length === 0) {
    return
  }

  await rm(backups[0].path, { force: true }).catch(() => {})
}

export async function installSkill(resolved, targets, mode = 'copy') {
  const slug = resolved.slug

  const agentNames = targets.map((target) => {
    const agent = getAgentByFlag(target)

    return agent ? agent.name : target
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

      if (!agent) {
        return null
      }

      baseDir = agent.getDir()
      label = agent.label
    }

    const slugDir = join(baseDir, normalizeSlug(slug))

    if (mode === 'symlink' && resolved.skillDir) {
      const relPath = relative(dirname(slugDir), resolved.skillDir)

      await rm(slugDir, {
        recursive: true,
        force: true,
      })

      await mkdir(dirname(slugDir), {
        recursive: true,
      })

      await symlink(relPath, slugDir)
    } else {
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
        // Directory does not exist yet.
      }

      await rm(slugDir, {
        recursive: true,
        force: true,
      })

      await mkdir(slugDir, {
        recursive: true,
      })

      for (const file of resolved.files) {
        const destination = join(slugDir, file)

        if (Object.hasOwn(resolved.fileContents || {}, file)) {
          await writeFile(destination, resolved.fileContents[file])
        } else if (resolved.skillDir) {
          const source = join(resolved.skillDir, file)

          try {
            await stat(source)

            await cp(source, destination, {
              recursive: true,
              force: true,
            })
          } catch {
            // Skip files that do not exist.
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

    return {
      target,
      path: slugDir,
      label,
    }
  }

  const outcomes = await Promise.allSettled(
    targets.map((target) => installToTarget(target)),
  )

  const results = []

  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled' && outcome.value !== null) {
      results.push(outcome.value)
    }
  }

  return results
}
