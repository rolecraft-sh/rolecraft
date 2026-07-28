import { watch } from 'node:fs'
import { homedir } from 'node:os'
import { readLock, getProjectLockPath } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import agents from '../agents.js'

const agentNameToTarget = Object.fromEntries(
  agents.map((a) => [a.name, a.flag]),
)

async function reinstallSkill(slug, skills, _cwd) {
  const entry = skills[slug]
  if (entry?.sourceType !== 'local') return false

  try {
    const resolved = await resolveSource(entry.source)
    const targets = (entry.agents || [])
      .map((a) => agentNameToTarget[a] || a)
      .filter(Boolean)
    if (targets.length === 0) targets.push('project')

    await installSkill(resolved, targets)
    return true
  } catch {
    return false
  }
}

export async function watchCommand(slug, cwd = process.cwd(), options = {}) {
  const globalLock = await readLock()
  const projectLock = await readLock(getProjectLockPath(cwd))

  const mergedSkills = { ...globalLock.skills, ...projectLock.skills }
  const skills = Object.entries(mergedSkills)

  function noopClose() {}

  if (skills.length === 0) {
    console.log('No skills installed. Nothing to watch.')
    return { watchers: [], skills: [], close: noopClose }
  }

  const watchSlugs = slug
    ? [slug]
    : skills.filter(([, e]) => e.sourceType === 'local').map(([s]) => s)

  if (slug && !mergedSkills[slug]) {
    console.error(`Skill "${slug}" not found.`)
    return { watchers: [], skills: [], close: noopClose }
  }

  if (watchSlugs.length === 0) {
    if (!slug) console.log('No local skills to watch.')
    return { watchers: [], skills: watchSlugs, close: noopClose }
  }

  if (options.dryRun) {
    console.log(`\n📋 [dry-run] Would watch ${watchSlugs.length} skill(s):\n`)
    for (const s of watchSlugs) {
      const entry = mergedSkills[s]
      const sourcePath = entry.source.replace(/^~/, homedir())
      console.log(`   • ${s} → ${sourcePath}`)
    }
    console.log()
    return { watchers: [], skills: watchSlugs, close: noopClose }
  }

  console.log(`\n👀 Watching ${watchSlugs.length} skill(s) for changes...\n`)

  const debounceTimers = {}
  const watchers = []
  let closed = false

  function close() {
    if (closed) return
    closed = true
    for (const key of Object.keys(debounceTimers)) {
      clearTimeout(debounceTimers[key])
      delete debounceTimers[key]
    }
    for (const w of watchers) {
      try {
        w.close()
      } catch {
        /* ignore */
      }
    }
    watchers.length = 0
  }

  for (const s of watchSlugs) {
    const entry = mergedSkills[s]
    if (entry.sourceType !== 'local') {
      console.log(`   Skipping "${s}" (${entry.sourceType} source)`)
      continue
    }

    const sourcePath = entry.source.replace(/^~/, homedir())

    const handler = (_eventType, filename) => {
      if (!filename || filename.startsWith('.')) return

      const key = `watch-${s}`
      if (debounceTimers[key]) clearTimeout(debounceTimers[key])

      debounceTimers[key] = setTimeout(async () => {
        if (closed) return
        const timestamp = new Date().toLocaleTimeString()
        console.log(`  [${timestamp}] ${s}: ${filename} changed, syncing...`)
        const ok = await reinstallSkill(s, mergedSkills, cwd)
        if (closed) return
        console.log(
          `  [${timestamp}] ${s}: ${ok ? 'synced successfully' : 'sync failed'}`,
        )
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

  return { watchers, skills: watchSlugs, close }
}
