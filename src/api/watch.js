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

export async function watchApi(slug, cwd = process.cwd(), options = {}) {
  const globalLock = await readLock()
  const projectLock = await readLock(getProjectLockPath(cwd))

  const mergedSkills = { ...globalLock.skills, ...projectLock.skills }
  const skills = Object.entries(mergedSkills)

  if (skills.length === 0) {
    return { watchers: [], skills: [] }
  }

  const watchSlugs = slug
    ? [slug]
    : skills.filter(([, e]) => e.sourceType === 'local').map(([s]) => s)

  if (slug && !mergedSkills[slug]) {
    throw new Error(`Skill "${slug}" not found.`)
  }

  if (options.dryRun) {
    return {
      dryRun: true,
      skills: watchSlugs.map((s) => {
        const entry = mergedSkills[s]
        return { slug: s, source: entry.source }
      }),
    }
  }

  const debouncer = createDebouncer(WATCH_DEBOUNCE_MS)
  const watchers = []

  for (const s of watchSlugs) {
    const entry = mergedSkills[s]
    if (entry.sourceType !== 'local') continue

    const sourcePath = expandTilde(entry.source)

    const handler = (_eventType, filename) => {
      if (!filename || filename.startsWith('.')) return

      const key = `watch-${s}`
      debouncer.schedule(key, async () => {
        await reinstallSkill(s, mergedSkills, cwd)
      })
    }

    try {
      const w = watch(sourcePath, { recursive: true }, handler)
      watchers.push(w)
    } catch {
      // skip unwatchable
    }
  }

  return { watchers, skills: watchSlugs }
}
