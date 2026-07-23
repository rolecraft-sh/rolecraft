import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import {
  readLock,
  removeSkillFromLock,
  getAgentsDir,
  getProjectLockPath,
} from '../utils/lockfile.js'

function normalizeSlug(slug) {
  return slug.replace(/\//g, '-')
}

function findActualSlug(slug, lock) {
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

export async function apiRemove(slug, cwd = process.cwd(), options = {}) {
  const globalLock = await readLock()
  const projectLockPath = getProjectLockPath(cwd)
  const projectLock = await readLock(projectLockPath)

  const globalFound = findActualSlug(slug, globalLock)
  const projectFound = findActualSlug(slug, projectLock)

  if (!globalFound && !projectFound) {
    throw new Error(`Skill "${slug}" not found.`)
  }

  const actualSlug = globalFound || projectFound
  const removed = []

  if (options.dryRun) {
    const dirs = []
    if (globalFound)
      dirs.push({
        scope: 'global',
        path: join(getAgentsDir(), normalizeSlug(actualSlug)),
      })
    if (projectFound)
      dirs.push({
        scope: 'project',
        path: join(cwd, '.agents', 'skills', normalizeSlug(actualSlug)),
      })
    return { dryRun: true, slug: actualSlug, dirs }
  }

  if (globalFound) {
    const dir = join(getAgentsDir(), normalizeSlug(actualSlug))
    await rm(dir, { recursive: true, force: true })
    await removeSkillFromLock(actualSlug)
    removed.push({ scope: 'global', path: dir })
  }

  if (projectFound) {
    const projectDir = join(cwd, '.agents', 'skills', normalizeSlug(actualSlug))
    await rm(projectDir, { recursive: true, force: true })
    await removeSkillFromLock(actualSlug, projectLockPath)
    removed.push({ scope: 'project', path: projectDir })
  }

  return { slug: actualSlug, removed }
}
