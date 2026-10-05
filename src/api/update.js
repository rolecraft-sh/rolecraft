import { existsSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import agents from '../agents.js'
import { UserError } from '../utils/errors.js'
import { installSkill } from '../utils/installer.js'
import { assertSkillScanAllowed } from '../utils/scan-gate.js'
import {
  findActualSlug,
  getDirForAgent,
  getProjectLockPath,
  normalizeSlug,
  readLock,
  targetsFromLockEntry,
} from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'

// Legacy fallback for entries written before `agents` was recorded. It still has
// to collapse aliases: a scan finds every agent whose directory happens to hold
// the skill, and twelve agents share `~/.agents/skills` (#346).
function detectTargets(slug, cwd) {
  const normSlug = normalizeSlug(slug)
  const found = []

  for (const agent of agents) {
    if (existsSync(join(agent.getDir(), normSlug, 'SKILL.md'))) {
      found.push(agent.flag)
    }
  }
  if (existsSync(join(cwd, '.agents', 'skills', normSlug, 'SKILL.md'))) {
    found.push('project')
  }

  const targets = []
  const seenDirs = new Set()
  for (const flag of found) {
    const dir = flag === 'project' ? 'project' : getDirForAgent(flag)
    if (seenDirs.has(dir)) continue
    seenDirs.add(dir)
    targets.push(flag)
  }
  return targets
}

export async function apiUpdate(slug, cwd = process.cwd(), options = {}) {
  const globalLock = await readLock()
  const projectLock = await readLock(getProjectLockPath(cwd))

  let actualSlug
  let source
  let sourceType
  let scope
  let entry

  const globalFound = findActualSlug(slug, globalLock)
  const projectFound = findActualSlug(slug, projectLock)

  if (globalFound) {
    actualSlug = globalFound
    entry = globalLock.skills[actualSlug]
    scope = 'global'
  } else if (projectFound) {
    actualSlug = projectFound
    entry = projectLock.skills[actualSlug]
    scope = 'project'
  } else {
    throw new UserError(`Skill "${slug}" not found.`, {
      suggestion: 'Run `rolecraft list` to see installed skills.',
      code: 'UPDATE_SKILL_NOT_FOUND',
    })
  }
  source = entry.source
  sourceType = entry.sourceType

  // The lockfile's `agents` list is the record of where the skill lives, so
  // reproduce it. Entries predating that field still fall back to a scan.
  const targets =
    Array.isArray(entry.agents) && entry.agents.length > 0
      ? targetsFromLockEntry(entry, scope)
      : scope === 'project'
        ? ['project']
        : detectTargets(actualSlug, cwd)
  if (targets.length === 0) targets.push('agents')

  if (options.dryRun) {
    return { dryRun: true, slug: actualSlug, source, sourceType, targets }
  }

  const targetSource =
    sourceType === 'local' || source.startsWith('.')
      ? isAbsolute(source) || source.startsWith('~')
        ? source
        : resolve(cwd, source)
      : source

  const resolved = await resolveSource(targetSource)
  resolved.sourcePath = source

  assertSkillScanAllowed(resolved, options)

  const results = await installSkill(resolved, targets, 'copy', cwd)

  return { slug: actualSlug, source, sourceType, targets, results }
}
