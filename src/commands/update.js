import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readLock, getGlobalLockPath, getProjectLockPath, getAgentsDir, getClaudeDir, getCursorDir, getWindsurfDir, getCodexDir, getCopilotDir, getAiderDir, getClineDir } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'

function normalizeSlug(slug) {
  return slug.replace(/\//g, '-')
}

function findActualSlug(slug, lock) {
  if (lock.skills[slug]) return slug
  const normalized = normalizeSlug(slug)
  return Object.keys(lock.skills).find(k => normalizeSlug(k) === normalized)
}

function detectTargets(slug, cwd) {
  const normSlug = normalizeSlug(slug)
  const targets = []

  const globalDir = join(getAgentsDir(), normSlug)
  if (existsSync(join(globalDir, 'SKILL.md'))) targets.push('agents')

  const claudeDir = join(getClaudeDir(), normSlug)
  if (existsSync(join(claudeDir, 'SKILL.md'))) targets.push('claude')

  const cursorDir = join(getCursorDir(), normSlug)
  if (existsSync(join(cursorDir, 'SKILL.md'))) targets.push('cursor')

  const windsurfDir = join(getWindsurfDir(), normSlug)
  if (existsSync(join(windsurfDir, 'SKILL.md'))) targets.push('windsurf')

  const codexDir = join(getCodexDir(), normSlug)
  if (existsSync(join(codexDir, 'SKILL.md'))) targets.push('codex')

  const copilotDir = join(getCopilotDir(), normSlug)
  if (existsSync(join(copilotDir, 'SKILL.md'))) targets.push('copilot')

  const aiderDir = join(getAiderDir(), normSlug)
  if (existsSync(join(aiderDir, 'SKILL.md'))) targets.push('aider')

  const clineDir = join(getClineDir(), normSlug)
  if (existsSync(join(clineDir, 'SKILL.md'))) targets.push('cline')

  const projectDir = join(cwd, '.agents', 'skills', normSlug)
  if (existsSync(join(projectDir, 'SKILL.md'))) targets.push('project')

  return targets
}

export async function updateCommand(slug) {
  const globalLock = await readLock()
  const projectLock = await readLock(getProjectLockPath(process.cwd()))

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
    console.error(`Skill "${slug}" not found.`)
    process.exit(1)
  }

  const targets = detectTargets(actualSlug, process.cwd())
  if (targets.length === 0) {
    targets.push('agents')
  }

  console.log(`\n🔄 Updating skill: ${actualSlug}`)
  console.log(`   Source: ${source} (${sourceType})`)
  console.log(`   Targets: ${targets.join(', ')}\n`)

  const resolved = await resolveSource(source)
  const results = await installSkill(resolved, targets)

  console.log('✅ Updated successfully:\n')
  for (const r of results) {
    console.log(`   ${r.label} → ${r.path}`)
  }
}
