import { join } from 'node:path'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import {
  readLock,
  writeLock,
  getGlobalLockPath,
  getProjectLockPath,
  getSkillHistory,
  popHistory,
} from '../utils/lockfile.js'
import {
  restoreSkill,
  removeLatestBackup,
  assertSafeSlug,
} from '../utils/installer.js'
import { getAgentByFlag } from '../agents.js'
import { UserError } from '../utils/errors.js'

function normalizeSlug(slug) {
  return slug.replace(/\//g, '-')
}

export async function apiRollback(slug, options = {}) {
  const { dryRun = false, list = false } = options

  // Check lockfile for the skill
  const [global, project] = await Promise.all([
    readLock(),
    readLock(getProjectLockPath(process.cwd())).catch(() => ({ skills: {} })),
  ])

  const globalEntry = global.skills[slug]
  const projectEntry = project.skills[slug]

  if (!globalEntry && !projectEntry) {
    throw new UserError(`Skill "${slug}" is not installed.`, {
      suggestion:
        'Use rolecraft list to see installed skills. Run rolecraft rollback --help for usage.',
      code: 'ROLLBACK_NOT_FOUND',
    })
  }

  const existing = globalEntry || projectEntry
  const lockPath = globalEntry
    ? getGlobalLockPath()
    : getProjectLockPath(process.cwd())

  // Show history if --list
  const history = await getSkillHistory(slug, lockPath)
  if (list) {
    return {
      slug,
      currentVersion: existing.contentSha?.slice(0, 12) || 'unknown',
      history: history.map((h, i) => ({
        version: i + 1,
        contentSha: h.contentSha?.slice(0, 12) || 'unknown',
        installedAt: h.installedAt,
      })),
    }
  }

  if (history.length === 0) {
    throw new UserError(`No rollback history found for "${slug}".`, {
      suggestion:
        'A rollback version is created automatically when you update a skill.',
      code: 'ROLLBACK_NO_HISTORY',
    })
  }

  // Restore files from the most recent backup
  const backupData = await restoreSkill(slug)
  if (!backupData || Object.keys(backupData).length === 0) {
    throw new UserError(`No backup files found for "${slug}".`, {
      suggestion:
        'The backup may have been deleted. Re-install the skill instead.',
      code: 'ROLLBACK_NO_BACKUP',
    })
  }

  // Pop history entry from lockfile
  const prevEntry = await popHistory(slug, lockPath)
  if (!prevEntry) {
    throw new UserError(`Failed to pop history for "${slug}".`, {
      code: 'ROLLBACK_POP_FAILED',
    })
  }

  if (dryRun) {
    // Re-push the history entry since we popped it in dry-run
    await addHistoryBack(slug, prevEntry, lockPath)
    return {
      dryRun: true,
      slug,
      files: Object.keys(backupData),
      targets: existing.agents || [],
      prevContentSha: prevEntry.contentSha?.slice(0, 12),
    }
  }

  // Restore files to each install target
  const targets = existing.agents || []
  const results = []

  for (const target of targets) {
    let baseDir
    if (target === 'project') {
      baseDir = join(process.cwd(), '.agents', 'skills')
    } else {
      const agent = getAgentByFlag(target)
      if (!agent) continue
      baseDir = agent.getDir()
    }

    const slugDir = join(baseDir, normalizeSlug(slug))
    assertSafeSlug(slug, baseDir, slugDir)
    await rm(slugDir, { recursive: true, force: true }).catch(() => {})
    await mkdir(slugDir, { recursive: true })

    for (const [fileName, content] of Object.entries(backupData)) {
      await writeFile(join(slugDir, fileName), content)
    }

    results.push({ target, path: slugDir })
  }

  // Clean up the backup we used
  await removeLatestBackup(slug)

  return {
    slug,
    files: Object.keys(backupData),
    targets: results,
    prevContentSha: prevEntry.contentSha?.slice(0, 12),
  }
}

async function addHistoryBack(slug, entry, lockPath) {
  const lock = await readLock(lockPath)
  if (!lock.skills[slug]) return
  if (!lock.skills[slug].history) lock.skills[slug].history = []
  lock.skills[slug].history.push(entry)
  await writeLock(lock, lockPath)
}
