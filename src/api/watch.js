import { watch } from 'node:fs'
import { readLock, getProjectLockPath } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import { createDebouncer, WATCH_DEBOUNCE_MS } from '../utils/debounce.js'
import { expandTilde } from '../utils/paths.js'
import { UserError } from '../utils/errors.js'
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
  const emit = options.onEvent || (() => {})

  const globalLock = await readLock()
  const projectLock = await readLock(getProjectLockPath(cwd))

  const mergedSkills = { ...globalLock.skills, ...projectLock.skills }
  const skills = Object.entries(mergedSkills)
  const installedCount = skills.length

  function noopClose() {}

  if (installedCount === 0) {
    return { watchers: [], skills: [], installedCount, close: noopClose }
  }

  const watchSlugs = slug
    ? [slug]
    : skills.filter(([, e]) => e.sourceType === 'local').map(([s]) => s)

  if (slug && !mergedSkills[slug]) {
    throw new UserError(`Skill "${slug}" not found.`, {
      suggestion: 'Run `rolecraft list` to see installed skills.',
      code: 'WATCH_SKILL_NOT_FOUND',
    })
  }

  if (options.dryRun) {
    return {
      dryRun: true,
      skills: watchSlugs.map((s) => {
        const entry = mergedSkills[s]
        return {
          slug: s,
          source: entry.source,
          path: expandTilde(entry.source),
        }
      }),
    }
  }

  if (watchSlugs.length === 0) {
    return {
      watchers: [],
      skills: watchSlugs,
      installedCount,
      close: noopClose,
    }
  }

  emit({ type: 'start', slugs: watchSlugs })

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
      emit({ type: 'skip', slug: s, sourceType: entry.sourceType })
      continue
    }

    const sourcePath = expandTilde(entry.source)

    const handler = (_eventType, filename) => {
      if (!filename || filename.startsWith('.')) return

      const key = `watch-${s}`
      debouncer.schedule(key, async () => {
        if (closed) return
        const startedAt = new Date()
        emit({ type: 'syncing', slug: s, filename, startedAt })
        const ok = await reinstallSkill(s, mergedSkills, cwd)
        if (closed) return
        emit({ type: 'synced', slug: s, ok, startedAt })
      })
    }

    try {
      const w = watch(sourcePath, { recursive: true }, handler)
      w.on('error', (error) => {
        if (closed) return
        emit({ type: 'error', slug: s, path: sourcePath, error })
      })
      watchers.push(w)
      emit({ type: 'watching', slug: s, path: sourcePath })
    } catch (error) {
      emit({ type: 'error', slug: s, path: sourcePath, error })
    }
  }

  return { watchers, skills: watchSlugs, installedCount, close }
}
