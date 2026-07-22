import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readLock, getProjectLockPath } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import agents from '../agents.js'

function normalizeSlug(slug) {
  return slug.replace(/\//g, '-')
}

function findActualSlug(slug, lock) {
  if (lock.skills[slug]) return slug
  const normalized = normalizeSlug(slug)
  const found = Object.keys(lock.skills).find(k => normalizeSlug(k) === normalized)
  if (found) return found
  return Object.keys(lock.skills).find(k => {
    const namePart = k.split('/').pop()
    return namePart === slug || normalizeSlug(namePart) === normalized
  })
}

function detectTargets(slug, cwd) {
  const normSlug = normalizeSlug(slug)
  const targets = []

  for (const agent of agents) {
    const dir = join(agent.getDir(), normSlug)
    if (existsSync(join(dir, 'SKILL.md'))) targets.push(agent.flag)
  }

  const projectDir = join(cwd, '.agents', 'skills', normSlug)
  if (existsSync(join(projectDir, 'SKILL.md'))) targets.push('project')

  return targets
}

export async function apiUpdate(slug, cwd = process.cwd(), options = {}) {
  const globalLock = await readLock()
  const projectLock = await readLock(getProjectLockPath(cwd))

  let actualSlug
  let source
  let sourceType

  const globalFound = findActualSlug(slug, globalLock)
  const projectFound = findActualSlug(slug, projectLock)

  if (globalFound) {
    actualSlug = globalFound
    source = globalLock.skills[actualSlug].source
    sourceType = globalLock.skills[actualSlug].sourceType
  } else if (projectFound) {
    actualSlug = projectFound
    source = projectLock.skills[projectFound].source
    sourceType = projectLock.skills[projectFound].sourceType
  } else {
    throw new Error(`Skill "${slug}" not found.`)
  }

  let targets = detectTargets(actualSlug, cwd)
  if (targets.length === 0) targets.push('agents')

  if (options.dryRun) {
    return { dryRun: true, slug: actualSlug, source, sourceType, targets }
  }

  const resolved = await resolveSource(source)
  const results = await installSkill(resolved, targets)

  return { slug: actualSlug, source, sourceType, targets, results }
}