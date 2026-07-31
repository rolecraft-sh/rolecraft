import { readLock, getProjectLockPath } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'

export async function apiCheck(cwd = process.cwd()) {
  const globalLock = await readLock()
  const projectLock = await readLock(getProjectLockPath(cwd)).catch(() => ({
    skills: {},
  }))
  const allSkills = { ...globalLock.skills, ...projectLock.skills }

  const entries = Object.entries(allSkills)
  if (entries.length === 0) return { skills: [], updatesAvailable: 0, total: 0 }

  let registryIndex
  try {
    const { fetchIndex } = await import('../utils/registry-client.js')
    registryIndex = await fetchIndex()
  } catch {
    registryIndex = null
  }

  const results = []
  let updatesAvailable = 0

  for (const [slug, info] of entries) {
    const source = info.source
    if (!source) {
      results.push({ slug, status: 'skipped', reason: 'no source info' })
      continue
    }

    if (registryIndex) {
      const registrySkill = registryIndex.skills.find((s) => s.slug === slug)
      if (
        registrySkill?.latest &&
        info.version &&
        registrySkill.latest !== info.version
      ) {
        results.push({
          slug,
          status: 'update_available',
          current: info.version,
          latest: registrySkill.latest,
          source,
          fromRegistry: true,
        })
        updatesAvailable++
        continue
      }
    }

    try {
      const resolved = await resolveSource(source)
      const oldHash = info.contentSha || ''
      const newHash = resolved.contentSha || ''

      if (oldHash && newHash && oldHash !== newHash) {
        results.push({
          slug,
          status: 'update_available',
          oldHash,
          newHash,
          source,
        })
        updatesAvailable++
      } else {
        results.push({ slug, status: 'up_to_date', hash: oldHash, source })
      }
    } catch {
      results.push({
        slug,
        status: 'error',
        reason: `could not check (source: ${source})`,
      })
    }
  }

  return { skills: results, updatesAvailable, total: results.length }
}
