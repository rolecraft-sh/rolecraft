import { rm } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'
import {
  readLock,
  removeSkillFromLock,
  getAgentsDir,
  getProjectLockPath,
  normalizeSlug,
} from '../utils/lockfile.js'
import { assertSafeSlug } from '../utils/installer.js'
import agents, { getAgentByFlag } from '../agents.js'

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

function rebaseToCwd(dir, cwd) {
  const rel = relative(process.cwd(), dir)

  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    return dir
  }

  return join(cwd, rel)
}

function getTargetBaseDir(target, cwd) {
  if (target === 'project') {
    return join(cwd, '.agents', 'skills')
  }

  const agent =
    getAgentByFlag(target) ||
    agents.find((candidate) => candidate.name === target)

  const baseDir = agent ? agent.getDir() : getAgentsDir()

  return rebaseToCwd(baseDir, cwd)
}

function resolveRemovalDirs(slug, entry, scope, cwd, seenDirs) {
  const fallbackTarget = scope === 'project' ? 'project' : 'agents'
  const targets =
    Array.isArray(entry?.agents) && entry.agents.length > 0
      ? entry.agents
      : [fallbackTarget]
  const dirs = []

  for (const target of targets) {
    const baseDir = getTargetBaseDir(target, cwd)
    const dir = join(baseDir, normalizeSlug(slug))
    assertSafeSlug(slug, baseDir, dir)

    if (seenDirs.has(dir)) continue
    seenDirs.add(dir)
    dirs.push({ scope, path: dir })
  }

  return dirs
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
  const seenDirs = new Set()
  const dirs = []

  if (globalFound) {
    dirs.push(
      ...resolveRemovalDirs(
        actualSlug,
        globalLock.skills[globalFound],
        'global',
        cwd,
        seenDirs,
      ),
    )
  }
  if (projectFound) {
    dirs.push(
      ...resolveRemovalDirs(
        actualSlug,
        projectLock.skills[projectFound],
        'project',
        cwd,
        seenDirs,
      ),
    )
  }

  if (options.dryRun) {
    return { dryRun: true, slug: actualSlug, dirs }
  }

  for (const { path } of dirs) {
    await rm(path, { recursive: true, force: true })
  }

  if (globalFound) {
    await removeSkillFromLock(actualSlug)
  }

  if (projectFound) {
    await removeSkillFromLock(actualSlug, projectLockPath)
  }

  return { slug: actualSlug, removed: dirs }
}
