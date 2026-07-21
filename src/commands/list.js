import { readLock, getProjectLockPath } from '../utils/lockfile.js'

export async function listCommand(cwd, options = {}) {
  const [globalLock, projectLock] = await Promise.all([
    readLock(),
    cwd ? readLock(getProjectLockPath(cwd)) : Promise.resolve(null),
  ])

  const projectSkills = new Set(Object.keys(projectLock?.skills ?? {}))

  const mergedSkills = { ...globalLock.skills }
  if (projectLock) {
    Object.assign(mergedSkills, projectLock.skills)
  }

  const agent = options.agent?.toLowerCase()
  const skills = Object.entries(mergedSkills).filter(([, entry]) =>
    !agent || (Array.isArray(entry.agents) && entry.agents.some(name => name.toLowerCase() === agent))
  )
  if (options.json) {
    const jsonSkills = {}

    for (const [slug, entry] of skills) {
      const inProject = projectSkills.has(slug)
      const inGlobal = slug in globalLock.skills

      const scope = inProject && inGlobal
        ? 'global, project'
        : inProject
          ? 'project'
          : 'global'

      jsonSkills[slug] = {
        ...entry,
        scope,
      }
    }

    console.log(JSON.stringify({
      skills: jsonSkills,
      total: skills.length,
    }, null, 2))

    return
  }

  if (skills.length === 0) {
    console.log(agent ? `No skills installed for ${agent}.` : 'No skills installed.')
    return
  }

  console.log(agent ? `Installed skills for ${agent}:\n` : 'Installed skills:\n')
  for (const [slug, entry] of skills) {
    const inProject = projectSkills.has(slug)
    const inGlobal = slug in globalLock.skills
    const scope = inProject && inGlobal ? 'global, project'
      : inProject ? 'project'
      : 'global'
    const date = entry.installedAt
      ? new Date(entry.installedAt).toLocaleDateString()
      : 'unknown'
    console.log(`   ${slug}`)
    console.log(`   ├─ Installed: ${date}`)
    console.log(`   ├─ Scope: ${scope}`)
    if (entry.source) console.log(`   ├─ Source: ${entry.source}`)
    if (entry.sourceType) console.log(`   └─ Type: ${entry.sourceType}`)
    console.log()
  }

  const count = skills.length
  console.log(agent ? `${count} skill(s) total for ${agent}.` : `${count} skill(s) total.`)
}
