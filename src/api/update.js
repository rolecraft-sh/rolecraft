import { existsSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import agents from '../agents.js'
import { UserError } from '../utils/errors.js'
import { installSkill } from '../utils/installer.js'
import { assertSkillScanAllowed } from '../utils/scan-gate.js'
import {
  findActualSlug,
  getProjectLockPath,
  normalizeSlug,
  readLock,
} from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'

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
    throw new UserError(`Skill "${slug}" not found.`, {
      suggestion: 'Run `rolecraft list` to see installed skills.',
      code: 'UPDATE_SKILL_NOT_FOUND',
    })
  }

  const targets = detectTargets(actualSlug, cwd)
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
