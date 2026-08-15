import { resolveSource, resolveSkills } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import { scanSkill, scanMcpServer, classifyScore } from '../utils/security.js'
import {
  parseMcpServersFromSkill,
  resolveMcpSource,
  addMcpServer,
  getSupportedMcpAgents,
} from '../utils/mcp.js'
import agents from '../agents.js'
import { UserError } from '../utils/errors.js'

function selectSkills(allSkills, skillNames, yes) {
  if (skillNames && skillNames.length > 0) {
    const names = skillNames.map((n) => n.toLowerCase())
    return allSkills.filter(
      (s) =>
        names.includes(s.name.toLowerCase()) ||
        names.includes(s.slug.toLowerCase()),
    )
  }
  if (allSkills.length === 1 || yes) return allSkills
  return null
}

function resolveTargets(scope) {
  const targets = []
  if (scope.global) targets.push('agents')
  if (scope.project) targets.push('project')

  // Deduplicate agent targets by directory — skip alias agents
  // that point to the same skill directory as a previously-added agent.
  // This prevents redundant installs when --all is used (e.g. 8+ agents
  // all sharing ~/.agents/skills).
  const seenDirs = new Set()
  for (const agent of agents) {
    if (scope[agent.flag]) {
      const dir = agent.getDir()
      if (!seenDirs.has(dir)) {
        seenDirs.add(dir)
        targets.push(agent.flag)
      }
    }
  }
  return targets
}

export async function apiInstallSkills(source, options = {}) {
  const cwd = options.cwd || process.cwd()
  const scope = options.scope || { project: true }

  if (options.frozenLockfile) {
    const { readLock, getProjectLockPath } = await import(
      '../utils/lockfile.js'
    )
    const [globalLock, projectLock] = await Promise.all([
      readLock(),
      readLock(getProjectLockPath(cwd)).catch(() => ({ skills: {} })),
    ])
    const { slug } = await resolveSource(source)
    const existing = globalLock.skills[slug] || projectLock.skills[slug]
    if (existing) {
      throw new Error(
        `Skill "${slug}" already installed. Use update() to update or omit frozenLockfile to overwrite.`,
      )
    }
  }

  const allSkills = await resolveSkills(source)
  const selectedSkills = selectSkills(allSkills, options.skill, options.yes)

  if (!selectedSkills) {
    throw new Error(
      `Multiple skills found (${allSkills.length}). Provide --skill or --yes to select.`,
    )
  }

  if (selectedSkills.length === 0) {
    throw new Error(
      `No matching skills found for: ${options.skill?.join(', ')}. Available: ${allSkills.map((s) => s.name).join(', ')}`,
    )
  }

  const targets = options.targets || resolveTargets(scope)

  if (options.dryRun) {
    return {
      dryRun: true,
      skills: selectedSkills.map((s) => ({
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
    const level = classifyScore(security.score, security.issues)

    if (level === 'danger' && !options.yes) {
      const issues = security.issues
        .filter((i) => i.severity === 'critical' || i.severity === 'high')
        .map(
          (i) =>
            `  🔴 [${i.severity}] ${i.description}${i.file ? ` (${i.file})` : ''}`,
        )
        .join('\n')
      throw new UserError(
        `"${resolved.name}" blocked by security scan (score: ${security.score}/100).`,
        {
          suggestion:
            'Review the flagged issues, fix them, or use --yes to force install (not recommended for untrusted skills).',
          detail: `Flagged issues:\n${issues}`,
          code: 'SECURITY_DANGER',
        },
      )
    }

    if (level === 'review' && !options.yes) {
      const issues = security.issues
        .filter((i) => i.severity !== 'low')
        .map(
          (i) =>
            `  🟡 [${i.severity}] ${i.description}${i.file ? ` (${i.file})` : ''}`,
        )
        .join('\n')
      throw new UserError(
        `"${resolved.name}" needs security review (score: ${security.score}/100).`,
        {
          suggestion:
            'Review the flagged issues, or use --yes to skip the review.',
          detail: `Flagged issues:\n${issues}`,
          code: 'SECURITY_REVIEW',
        },
      )
    }

    // --yes forces past danger/review but never silently: warn the user
    // so a forced install of a flagged skill leaves a visible trail.
    if (options.yes && (level === 'danger' || level === 'review')) {
      const issues = security.issues
        .filter((i) => i.severity === 'critical' || i.severity === 'high')
        .map(
          (i) =>
            `  🔴 [${i.severity}] ${i.description}${i.file ? ` (${i.file})` : ''}`,
        )
        .join('\n')
      const tag = level === 'danger' ? 'DANGER' : 'REVIEW'
      console.error(
        `\n⚠️  [${tag}] --yes forcing install of "${resolved.name}" despite security scan (score: ${security.score}/100).`,
      )
      if (issues) console.error(issues)
    }

    const installResults = await installSkill(
      resolved,
      targets,
      options.symlink ? 'symlink' : 'copy',
    )
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
        const mcpTargets = targets.filter(
          (t) => t !== 'project' && supportedAgents.includes(t),
        )
        for (const server of mcpServers) {
          const resolvedMcp = await resolveMcpSource(server.source)

          // Security scan for MCP servers
          const mcpSecurity = scanMcpServer(resolvedMcp)
          const mcpLevel = classifyScore(mcpSecurity.score, mcpSecurity.issues)
          if (mcpLevel === 'danger' && !options.yes) {
            const issues = mcpSecurity.issues
              .filter((i) => i.severity === 'critical' || i.severity === 'high')
              .map(
                (i) =>
                  `  🔴 [${i.severity}] ${i.description}${i.file ? ` (${i.file})` : ''}`,
              )
              .join('\n')
            throw new UserError(
              `MCP server "${server.name}" blocked by security scan (score: ${mcpSecurity.score}/100).`,
              {
                suggestion:
                  'Review the flagged issues, or use --yes to force install.',
                detail: `Flagged issues:\n${issues}`,
                code: 'MCP_SECURITY_DANGER',
              },
            )
          }

          // --yes forces past danger but never silently
          if (options.yes && (mcpLevel === 'danger' || mcpLevel === 'review')) {
            const tag = mcpLevel === 'danger' ? 'DANGER' : 'REVIEW'
            console.error(
              `\n⚠️  [${tag}] --yes forcing install of MCP server "${server.name}" despite security scan (score: ${mcpSecurity.score}/100).`,
            )
          }

          const installed = []
          for (const agent of mcpTargets) {
            const ok = await addMcpServer(agent, server.name, resolvedMcp)
            installed.push({ agent, name: server.name, success: ok })
          }
          mcpResults.push({
            server: server.name,
            source: server.source,
            installed,
          })
        }
      }
    }
  }

  return { results, mcpResults }
}

export async function apiResolveSkills(source) {
  return await resolveSkills(source)
}
