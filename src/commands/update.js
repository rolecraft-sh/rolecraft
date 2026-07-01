import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readLock, getGlobalLockPath, getProjectLockPath, getAgentsDir, getClaudeDir, getCursorDir, getWindsurfDir, getCodexDir, getCopilotDir, getCopilotProjectDir, getAiderDir, getClineDir, getDevinDir, getGeminiDir, getCodyDir, getContinueDir, getWarpDir, getCodeiumDir, getFabricDir, getGooseDir, getTabnineDir, getSupermavenDir, getPrPilotDir, getLoomDir, getRooDir, getTraeDir, getHermesDir, getKiroDir, getAugmentDir, getKiloDir, getOpenHandsDir, getJunieDir, getFactoryDir } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'

function normalizeSlug(slug) {
  return slug.replace(/\//g, '-')
}

function findActualSlug(slug, lock) {
  if (lock.skills[slug]) return slug
  const normalized = normalizeSlug(slug)
  let found = Object.keys(lock.skills).find(k => normalizeSlug(k) === normalized)
  if (found) return found
  return Object.keys(lock.skills).find(k => {
    const namePart = k.split('/').pop()
    return namePart === slug || normalizeSlug(namePart) === normalized
  })
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

  const copilotDir = join(getCopilotProjectDir(), normSlug)
  if (existsSync(join(copilotDir, 'SKILL.md'))) targets.push('copilot')

  const aiderDir = join(getAiderDir(), normSlug)
  if (existsSync(join(aiderDir, 'SKILL.md'))) targets.push('aider')

  const clineDir = join(getClineDir(), normSlug)
  if (existsSync(join(clineDir, 'SKILL.md'))) targets.push('cline')

  const devinDir = join(getDevinDir(), normSlug)
  if (existsSync(join(devinDir, 'SKILL.md'))) targets.push('devin')

  const geminiDir = join(getGeminiDir(), normSlug)
  if (existsSync(join(geminiDir, 'SKILL.md'))) targets.push('gemini')

  const codyDir = join(getCodyDir(), normSlug)
  if (existsSync(join(codyDir, 'SKILL.md'))) targets.push('cody')

  const continueDir = join(getContinueDir(), normSlug)
  if (existsSync(join(continueDir, 'SKILL.md'))) targets.push('continue')

  const warpDir = join(getWarpDir(), normSlug)
  if (existsSync(join(warpDir, 'SKILL.md'))) targets.push('warp')

  const codeiumDir = join(getCodeiumDir(), normSlug)
  if (existsSync(join(codeiumDir, 'SKILL.md'))) targets.push('codeium')

  const fabricDir = join(getFabricDir(), normSlug)
  if (existsSync(join(fabricDir, 'SKILL.md'))) targets.push('fabric')

  const gooseDir = join(getGooseDir(), normSlug)
  if (existsSync(join(gooseDir, 'SKILL.md'))) targets.push('goose')

  const tabnineDir = join(getTabnineDir(), normSlug)
  if (existsSync(join(tabnineDir, 'SKILL.md'))) targets.push('tabnine')

  const supermavenDir = join(getSupermavenDir(), normSlug)
  if (existsSync(join(supermavenDir, 'SKILL.md'))) targets.push('supermaven')

  const prPilotDir = join(getPrPilotDir(), normSlug)
  if (existsSync(join(prPilotDir, 'SKILL.md'))) targets.push('pr-pilot')

  const loomDir = join(getLoomDir(), normSlug)
  if (existsSync(join(loomDir, 'SKILL.md'))) targets.push('loom')

  const rooDir = join(getRooDir(), normSlug)
  if (existsSync(join(rooDir, 'SKILL.md'))) targets.push('roo')

  const traeDir = join(getTraeDir(), normSlug)
  if (existsSync(join(traeDir, 'SKILL.md'))) targets.push('trae')

  const hermesDir = join(getHermesDir(), normSlug)
  if (existsSync(join(hermesDir, 'SKILL.md'))) targets.push('hermes')

  const kiroDir = join(getKiroDir(), normSlug)
  if (existsSync(join(kiroDir, 'SKILL.md'))) targets.push('kiro')

  const augmentDir = join(getAugmentDir(), normSlug)
  if (existsSync(join(augmentDir, 'SKILL.md'))) targets.push('augment')

  const kiloDir = join(getKiloDir(), normSlug)
  if (existsSync(join(kiloDir, 'SKILL.md'))) targets.push('kilo')

  const openhandsDir = join(getOpenHandsDir(), normSlug)
  if (existsSync(join(openhandsDir, 'SKILL.md'))) targets.push('openhands')

  const junieDir = join(getJunieDir(), normSlug)
  if (existsSync(join(junieDir, 'SKILL.md'))) targets.push('junie')

  const factoryDir = join(getFactoryDir(), normSlug)
  if (existsSync(join(factoryDir, 'SKILL.md'))) targets.push('factory')

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
