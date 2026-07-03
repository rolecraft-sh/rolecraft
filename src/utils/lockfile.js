import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'

function home(...parts) {
  return join(process.env.HOME || process.env.HOMEPATH || '/tmp', ...parts)
}

export function getGlobalLockPath() {
  return home('.agents', '.skill-lock.json')
}

export function getAgentsDir() {
  return home('.agents', 'skills')
}

export function getClaudeDir() {
  return home('.claude', 'skills')
}

export function getCursorDir() {
  return home('.cursor', 'skills')
}

export function getWindsurfDir() {
  return home('.windsurf', 'skills')
}

export function getCodexDir() {
  return home('.codex', 'skills')
}

export function getCopilotDir() {
  return home('.copilot', 'skills')
}

export function getCopilotProjectDir() {
  return join(process.cwd(), '.github', 'copilot', 'skills')
}

export function getAiderDir() {
  return home('.aider', 'skills')
}

export function getClineDir() {
  return home('.cline', 'skills')
}

export function getDevinDir() {
  return home('.devin', 'skills')
}

export function getGeminiDir() {
  return home('.gemini', 'skills')
}

export function getCodyDir() {
  return home('.cody', 'skills')
}

export function getContinueDir() {
  return home('.continue', 'skills')
}

export function getWarpDir() {
  return home('.warp', 'skills')
}

export function getCodeiumDir() {
  return home('.codeium', 'skills')
}

export function getFabricDir() {
  return home('.fabric', 'skills')
}

export function getGooseDir() {
  return home('.goose', 'skills')
}

export function getTabnineDir() {
  return home('.tabnine', 'skills')
}

export function getSupermavenDir() {
  return home('.supermaven', 'skills')
}

export function getPrPilotDir() {
  return home('.pr-pilot', 'skills')
}

export function getLoomDir() {
  return home('.loom', 'skills')
}

export function getRooDir() {
  return home('.roo', 'skills')
}

export function getTraeDir() {
  return home('.trae', 'skills')
}

export function getHermesDir() {
  return home('.hermes', 'skills')
}

export function getKiroDir() {
  return home('.kiro', 'skills')
}

export function getAugmentDir() {
  return home('.augment', 'skills')
}

export function getKiloDir() {
  return home('.kilo', 'skills')
}

export function getOpenHandsDir() {
  return home('.openhands', 'skills')
}

export function getJunieDir() {
  return home('.junie', 'skills')
}

export function getFactoryDir() {
  return home('.factory', 'skills')
}

export function getCommandCodeDir() {
  return home('.commandcode', 'skills')
}

export function getCortexDir() {
  return home('.snowflake', 'cortex', 'skills')
}

export function getMistralVibeDir() {
  return home('.vibe', 'skills')
}

export function getQwenCodeDir() {
  return home('.qwen', 'skills')
}

export function getOpenClawDir() {
  return home('.openclaw', 'skills')
}

export function getCodeBuddyDir() {
  return home('.codebuddy', 'skills')
}

export function getMuxDir() {
  return home('.mux', 'skills')
}

export function getPiDir() {
  return home('.pi', 'agent', 'skills')
}

export function getAutohandCodeDir() {
  return home('.autohand', 'skills')
}

export function getRovoDevDir() {
  return home('.rovodev', 'skills')
}

export function getFirebenderDir() {
  return home('.firebender', 'skills')
}

export function getBobDir() {
  return home('.bob', 'skills')
}

export function getAiderDeskDir() {
  return home('.aider-desk', 'skills')
}

export function getProjectLockPath(cwd) {
  return join(cwd, '.agents', '.skill-lock.json')
}

async function ensureParentDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true })
}

export async function readLock(lockPath = getGlobalLockPath()) {
  try {
    const raw = await readFile(lockPath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [] }
  }
}

export async function writeLock(data, lockPath = getGlobalLockPath()) {
  await ensureParentDir(lockPath)
  await writeFile(lockPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

export async function addSkillToLock(slug, entry, lockPath = getGlobalLockPath()) {
  const lock = await readLock(lockPath)
  const existing = lock.skills[slug]
  const mergedAgents = existing?.agents
    ? [...new Set([...existing.agents, ...(entry.agents || [])])]
    : (entry.agents || [])
  lock.skills[slug] = { ...entry, agents: mergedAgents, installedAt: new Date().toISOString() }
  await writeLock(lock, lockPath)
  return lock
}

export async function removeSkillFromLock(slug, lockPath = getGlobalLockPath()) {
  const lock = await readLock(lockPath)
  delete lock.skills[slug]
  await writeLock(lock, lockPath)
  return lock
}

export function computeContentHash(fileContents) {
  const hash = createHash('sha256')
  const sortedNames = Object.keys(fileContents).sort()
  for (const name of sortedNames) {
    hash.update(`${name}\0`)
    hash.update(fileContents[name])
  }
  return hash.digest('hex')
}

export function computeFileHashes(fileContents) {
  const hashes = {}
  for (const [name, content] of Object.entries(fileContents)) {
    hashes[name] = createHash('sha256').update(content).digest('hex')
  }
  return hashes
}


