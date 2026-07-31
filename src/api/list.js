import { readLock, getProjectLockPath } from '../utils/lockfile.js'

export async function apiList(cwd, options = {}) {
  const [globalLock, projectLock] = await Promise.all([
    readLock(),
    cwd ? readLock(getProjectLockPath(cwd)) : Promise.resolve(null),
  ])

  const projectSkills = new Set(Object.keys(projectLock?.skills ?? {}))
  const mergedSkills = { ...globalLock.skills }
  if (projectLock) Object.assign(mergedSkills, projectLock.skills)

  const requestedAgent = options.agent?.toLowerCase()
  let displayAgent
  const skills = Object.entries(mergedSkills).filter(([, entry]) => {
    if (!requestedAgent || !Array.isArray(entry.agents)) {
      return !requestedAgent
    }

    const match = entry.agents.find(
      (agent) => agent.toLowerCase() === requestedAgent,
    )
    if (!match) return false
    displayAgent ??= match
    return true
  })
  const result = {}

  for (const [slug, entry] of skills) {
    const inProject = projectSkills.has(slug)
    const inGlobal = slug in globalLock.skills
    const scope =
      inProject && inGlobal
        ? 'global, project'
        : inProject
          ? 'project'
          : 'global'

    result[slug] = {
      ...entry,
      scope,
    }
  }

  return {
    skills: result,
    total: skills.length,
    globals: Object.keys(globalLock.skills).length,
    projects: Object.keys(projectLock?.skills ?? {}).length,
    agent: displayAgent ?? options.agent,
  }
}
