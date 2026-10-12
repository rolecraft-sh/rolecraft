import { readLock, getProjectLockPath } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'
import { scanSkill, classifyScore } from '../utils/security.js'

export async function apiCheck(cwd = process.cwd()) {
  const globalLock = await readLock()
  const projectLock = await readLock(getProjectLockPath(cwd)).catch(() => ({
    skills: {},
  }))
  const allSkills = { ...globalLock.skills, ...projectLock.skills }

  const entries = Object.entries(allSkills)
  if (entries.length === 0) return { skills: [], updatesAvailable: 0, total: 0 }

  const results = []
  let updatesAvailable = 0
  let unsafeAvailable = 0

  for (const [slug, info] of entries) {
    const source = info.source
    if (!source) {
      results.push({ slug, status: 'skipped', reason: 'no source info' })
      continue
    }

    try {
      const resolved = await resolveSource(source)
      const oldHash = info.contentSha || ''
      const newHash = resolved.contentSha || ''

      const changed = Boolean(oldHash && newHash && oldHash !== newHash)

      // The moment upstream content changes is the moment the scan matters
      // most — a maintainer account compromise or a hijacked release. This is
      // the only path that fetches the new bytes, so it is the path that must
      // look at them. `check` only reports, it does not install: the blocking
      // gate lives in `update`, which already calls `assertSkillScanAllowed`.
      const security = scanSkill(resolved)
      const level = classifyScore(security.score, security.issues)
      if (level === 'danger') {
        const issues = security.issues
          .filter((i) => i.severity !== 'low')
          .map((i) => `  [${i.severity}] ${i.description}`)
          .join('\n')
        results.push({
          slug,
          status: 'unsafe_update',
          score: security.score,
          reason: `upstream content trips a security finding (score: ${security.score}/100):\n${issues}`,
          source,
          oldHash,
          newHash,
        })
        if (changed) updatesAvailable++
        unsafeAvailable++
        continue
      }

      if (changed) {
        results.push({
          slug,
          status: 'update_available',
          oldHash,
          newHash,
          source,
          securityLevel: level,
        })
        updatesAvailable++
      } else {
        results.push({
          slug,
          status: 'up_to_date',
          hash: oldHash,
          source,
          securityLevel: level,
        })
      }
    } catch {
      results.push({
        slug,
        status: 'error',
        reason: `could not check (source: ${source})`,
      })
    }
  }

  return {
    skills: results,
    updatesAvailable,
    unsafeAvailable,
    total: results.length,
  }
}
