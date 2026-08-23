import { watch } from 'node:fs'
import { readLock, getProjectLockPath } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import { createDebouncer, WATCH_DEBOUNCE_MS } from '../utils/debounce.js'
import { expandTilde } from '../utils/paths.js'
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
      const sourcePath = expandTilde(entry.source)
      console.log(`   • ${s} → ${sourcePath}`)
    }
    console.log()
    return { watchers: [], skills: watchSlugs, close: noopClose }
  }

  console.log(`\n👀 Watching ${watchSlugs.length} skill(s) for changes...\n`)

  const debouncer = createDebouncer(WATCH_DEBOUNCE_MS)
  const watchers = []
  let closed = false

  function close() {
    if (closed) return
    closed = true
    debouncer.cancelAll()
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

    const sourcePath = expandTilde(entry.source)

    const handler = (_eventType, filename) => {
      if (!filename || filename.startsWith('.')) return

      const key = `watch-${s}`
      debouncer.schedule(key, async () => {
        if (closed) return
        const timestamp = new Date().toLocaleTimeString()
        console.log(`  [${timestamp}] ${s}: ${filename} changed, syncing...`)
        const ok = await reinstallSkill(s, mergedSkills, cwd)
        if (closed) return
        console.log(
          `  [${timestamp}] ${s}: ${ok ? 'synced successfully' : 'sync failed'}`,
        )
      })
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
