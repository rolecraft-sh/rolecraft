import { watch } from 'node:fs'
import { readLock, getProjectLockPath } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'

const agentNameToTarget = {
  opencode: 'agents',
  'claude-code': 'claude',
  cursor: 'cursor',
  windsurf: 'windsurf',
  devin: 'devin',
  codex: 'codex',
  copilot: 'copilot',
  aider: 'aider',
  cline: 'cline',
  'gemini-cli': 'gemini',
  cody: 'cody',
  continue: 'continue',
  warp: 'warp',
  codeium: 'codeium',
  fabric: 'fabric',
  goose: 'goose',
  tabnine: 'tabnine',
  supermaven: 'supermaven',
  'pr-pilot': 'pr-pilot',
  loom: 'loom',
  roo: 'roo',
  trae: 'trae',
  hermes: 'hermes',
  kiro: 'kiro',
  augment: 'augment',
  kilo: 'kilo',
  openhands: 'openhands',
  junie: 'junie',
  factory: 'factory',
  'command-code': 'command-code',
  cortex: 'cortex',
  'mistral-vibe': 'mistral-vibe',
  'qwen-code': 'qwen-code',
  openclaw: 'openclaw',
  codebuddy: 'codebuddy',
  mux: 'mux',
  pi: 'pi',
  'autohand-code': 'autohand-code',
  'rovo-dev': 'rovo',
  firebender: 'firebender',
  'ibm-bob': 'bob',
  'aider-desk': 'aider-desk',
  'code-arts-doer': 'code-arts-doer',
  'code-maker': 'code-maker',
  'code-studio': 'code-studio',
  crush: 'crush',
  eve: 'eve',
  forge: 'forge',
  'inference-sh': 'inference-sh',
  jazz: 'jazz',
  iflow: 'iflow',
  'kilo-code': 'kilo-code',
  kode: 'kode',
  lingma: 'lingma',
  'mcp-jam': 'mcp-jam',
  moxby: 'moxby',
  ona: 'ona',
  qoder: 'qoder',
  reasonix: 'reasonix',
  'terra-mind': 'terra-mind',
  'tiny-cloud': 'tiny-cloud',
  zencoder: 'zencoder',
}

async function reinstallSkill(slug, lock, cwd) {
  const entry = lock.skills[slug]
  if (!entry || entry.sourceType !== 'local') return false

  try {
    const resolved = await resolveSource(entry.source)
    const targets = (entry.agents || []).map(a => agentNameToTarget[a] || a).filter(Boolean)
    if (targets.length === 0) targets.push('project')

    await installSkill(resolved, targets)
    return true
  } catch {
    return false
  }
}

export async function watchCommand(slug, cwd = process.cwd()) {
  const globalLock = await readLock()
  const projectLock = await readLock(getProjectLockPath(cwd))

  const mergedSkills = { ...globalLock.skills, ...projectLock.skills }
  const skills = Object.entries(mergedSkills)

  if (skills.length === 0) {
    console.log('No skills installed. Nothing to watch.')
    return { watchers: [], skills: [] }
  }

  const watchSlugs = slug
    ? [slug]
    : skills.filter(([, e]) => e.sourceType === 'local').map(([s]) => s)

  if (slug && !mergedSkills[slug]) {
    console.error(`Skill "${slug}" not found.`)
    return { watchers: [], skills: [] }
  }

  if (watchSlugs.length === 0) {
    if (!slug) console.log('No local skills to watch.')
    return { watchers: [], skills: watchSlugs }
  }

  console.log(`\n👀 Watching ${watchSlugs.length} skill(s) for changes...\n`)

  const debounceTimers = {}
  const watchers = []

  for (const s of watchSlugs) {
    const entry = mergedSkills[s]
    if (entry.sourceType !== 'local') {
      console.log(`   Skipping "${s}" (${entry.sourceType} source)`)
      continue
    }

    const sourcePath = entry.source.replace(/^~/, process.env.HOME || process.env.HOMEPATH || '/tmp')

    const handler = (eventType, filename) => {
      if (!filename || filename.startsWith('.')) return

      const key = `watch-${s}`
      if (debounceTimers[key]) clearTimeout(debounceTimers[key])

      debounceTimers[key] = setTimeout(async () => {
        const timestamp = new Date().toLocaleTimeString()
        console.log(`  [${timestamp}] ${s}: ${filename} changed, syncing...`)
        const ok = await reinstallSkill(s, mergedSkills, cwd)
        if (ok) {
          console.log(`  [${timestamp}] ${s}: synced successfully`)
        }
      }, 300)
    }

    try {
      const w = watch(sourcePath, { recursive: true }, handler)
      watchers.push(w)
      console.log(`   ✓ ${s} → watching ${sourcePath}`)
    } catch (err) {
      console.error(`   ✗ ${s}: cannot watch (${err.message})`)
    }
  }

  return { watchers, skills: watchSlugs }
}
