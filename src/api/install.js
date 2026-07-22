import { resolveSource, resolveSkills } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import { scanSkill } from '../utils/security.js'
import { parseMcpServersFromSkill, resolveMcpSource, addMcpServer, getSupportedMcpAgents } from '../utils/mcp.js'
import agents from '../agents.js'

function selectSkills(allSkills, skillNames, yes) {
  if (skillNames && skillNames.length > 0) {
    const names = skillNames.map(n => n.toLowerCase())
    return allSkills.filter(s =>
      names.includes(s.name.toLowerCase()) || names.includes(s.slug.toLowerCase())
    )
  }
  if (allSkills.length === 1 || yes) return allSkills
  return null
}

function resolveTargets(scope) {
  const targets = []
  if (scope.global) targets.push('agents')
  if (scope.project) targets.push('project')
  for (const agent of agents) {
    if (scope[agent.flag]) targets.push(agent.flag)
  }
  return targets
}

export async function apiInstallSkills(source, options = {}) {
  const cwd = options.cwd || process.cwd()
  const scope = options.scope || { project: true }

  if (options.frozenLockfile) {
    const { readLock, getProjectLockPath } = await import('../utils/lockfile.js')
    const [globalLock, projectLock] = await Promise.all([
      readLock(),
      readLock(getProjectLockPath(cwd)).catch(() => ({ skills: {} })),
    ])
    const { slug } = await resolveSource(source)
    const existing = globalLock.skills[slug] || projectLock.skills[slug]
    if (existing) {
      throw new Error(`Skill "${slug}" already installed. Use update() to update or omit frozenLockfile to overwrite.`)
    }
  }

  const allSkills = await resolveSkills(source)
  const selectedSkills = selectSkills(allSkills, options.skill, options.yes)

  if (!selectedSkills) {
    throw new Error(`Multiple skills found (${allSkills.length}). Provide --skill or --yes to select.`)
  }

  if (selectedSkills.length === 0) {
    throw new Error(`No matching skills found for: ${options.skill?.join(', ')}. Available: ${allSkills.map(s => s.name).join(', ')}`)
  }

  const targets = options.targets || resolveTargets(scope)

  if (options.dryRun) {
    return {
      dryRun: true,
      skills: selectedSkills.map(s => ({
        name: s.name,
        slug: s.slug,
        source,
        files: s.files,
        targets,
        mode: options.symlink ? 'symlink' : 'copy',
      })),
    }
  }

  const results = []
  const mcpResults = []

  for (const skill of selectedSkills) {
    const resolved = {
      ...skill,
      sourcePath: skill.sourcePath || source,
      sourceType: skill.sourceType || 'local',
    }

    const security = scanSkill(resolved)
    const level = security.score >= 90 ? 'safe' : security.score >= 70 ? 'review' : 'danger'

    if (level === 'danger' && !options.yes) {
      throw new Error(`Install of "${resolved.name}" blocked by security scan (score: ${security.score}). Use yes:true to force.`)
    }

    if (level === 'review' && !options.yes) {
      throw new Error(`"${resolved.name}" requires security review (score: ${security.score}). Use yes:true to skip.`)
    }

    const installResults = await installSkill(resolved, targets, options.symlink ? 'symlink' : 'copy')
    results.push({
      name: resolved.name,
      slug: resolved.slug,
      owner: resolved.owner,
      security,
      install: installResults,
    })

    if (resolved.content && !options.noMcp) {
      const mcpServers = parseMcpServersFromSkill(resolved.content)
      if (mcpServers.length > 0) {
        const supportedAgents = getSupportedMcpAgents()
        const mcpTargets = targets.filter(t => t !== 'project' && supportedAgents.includes(t))
        for (const server of mcpServers) {
          const resolvedMcp = resolveMcpSource(server.source)
          const installed = []
          for (const agent of mcpTargets) {
            const ok = await addMcpServer(agent, server.name, resolvedMcp)
            installed.push({ agent, name: server.name, success: ok })
          }
          mcpResults.push({ server: server.name, source: server.source, installed })
        }
      }
    }
  }

  return { results, mcpResults }
}

export async function apiResolveSkills(source) {
  return await resolveSkills(source)
}