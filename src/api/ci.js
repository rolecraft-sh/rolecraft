import { readLock, getProjectLockPath } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import { readMcpLock } from '../utils/mcp-lock.js'
import { resolveMcpSource, addMcpServer } from '../utils/mcp.js'
import { scanSkill, classifyScore } from '../utils/security.js'

export async function apiCi(cwd = process.cwd()) {
  const [globalLock, projectLock, mcpLock] = await Promise.all([
    readLock(),
    readLock(getProjectLockPath(cwd)).catch(() => ({ skills: {} })),
    readMcpLock(),
  ])

  const allSkills = { ...globalLock.skills }
  for (const [slug, entry] of Object.entries(projectLock.skills)) {
    if (!allSkills[slug]) allSkills[slug] = entry
  }

  const skillEntries = Object.entries(allSkills)
  const mcpEntries = Object.entries(mcpLock.servers)

  const installed = []
  const failed = []

  for (const [slug, entry] of skillEntries) {
    if (!entry.source) {
      failed.push({ slug, reason: 'missing source in lockfile' })
      continue
    }
    try {
      const resolved = await resolveSource(entry.source)

      // Security scan — block dangerous skills even in CI
      const security = scanSkill(resolved)
      const level = classifyScore(security.score)
      if (level === 'danger') {
        failed.push({
          slug,
          source: entry.source,
          reason: `blocked by security scan (score: ${security.score}/100)`,
        })
        continue
      }

      const targets = entry.sourceType === 'local' ? ['project'] : ['agents']
      const results = await installSkill(resolved, targets)
      installed.push({ slug, source: entry.source, results })
    } catch (err) {
      failed.push({ slug, source: entry.source, reason: err?.message })
    }
  }

  const mcpInstalled = []
  const mcpFailed = []

  for (const [name, entry] of mcpEntries) {
    if (!entry.source) {
      mcpFailed.push({ name, reason: 'missing source in lockfile' })
      continue
    }
    try {
      const resolved = await resolveMcpSource(entry.source)
      for (const agent of entry.agents) {
        await addMcpServer(agent, name, resolved, entry.source)
      }
      mcpInstalled.push({ name, source: entry.source, agents: entry.agents })
    } catch (err) {
      mcpFailed.push({ name, source: entry.source, reason: err?.message })
    }
  }

  const allPassed = failed.length === 0 && mcpFailed.length === 0
  const total = skillEntries.length + mcpEntries.length

  return {
    installed,
    failed,
    mcpInstalled,
    mcpFailed,
    allPassed,
    total,
    skillCount: skillEntries.length,
    mcpCount: mcpEntries.length,
  }
}
