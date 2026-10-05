import {
  readLock,
  getProjectLockPath,
  targetsFromLockEntry,
} from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import { readMcpLock } from '../utils/mcp-lock.js'
import { resolveMcpSource, addMcpServer } from '../utils/mcp.js'
import {
  scanSkill,
  scanMcpServer,
  classifyScore,
  requiresMcpApproval,
} from '../utils/security.js'

export async function apiCi(cwd = process.cwd()) {
  const [globalLock, projectLock, mcpLock] = await Promise.all([
    readLock(),
    readLock(getProjectLockPath(cwd)).catch(() => ({ skills: {} })),
    readMcpLock(),
  ])

  const allSkills = Object.fromEntries(
    Object.entries(globalLock.skills).map(([slug, entry]) => [
      slug,
      { entry, targets: targetsFromLockEntry(entry) },
    ]),
  )
  for (const [slug, entry] of Object.entries(projectLock.skills)) {
    if (!allSkills[slug]) {
      allSkills[slug] = {
        entry,
        targets: targetsFromLockEntry(entry, 'project'),
      }
    }
  }

  const skillEntries = Object.entries(allSkills)
  const mcpEntries = Object.entries(mcpLock.servers)

  const installed = []
  const failed = []

  for (const [slug, { entry, targets }] of skillEntries) {
    if (!entry.source) {
      failed.push({ slug, reason: 'missing source in lockfile' })
      continue
    }
    try {
      const resolved = await resolveSource(entry.source)

      // The lockfile is repo content in a cloned repo, so an entry can name a
      // source whose content no longer matches what was recorded. Resolving
      // live keeps `ci` working when a branch moves, so the recorded hash is
      // the only signal that it moved too far (#402).
      if (entry.contentSha && resolved.contentSha !== entry.contentSha) {
        failed.push({
          slug,
          source: entry.source,
          reason: `content hash mismatch: lockfile records ${entry.contentSha.slice(0, 12)}, source resolves to ${resolved.contentSha.slice(0, 12)}`,
        })
        continue
      }

      // Security scan — `ci` has no approval override, so a review verdict has
      // nobody to review it. Leaving it out of `failed` made `allPassed` mean
      // "nothing was flagged" while a high-severity finding was reported.
      const security = scanSkill(resolved)
      const level = classifyScore(security.score, security.issues)
      if (level !== 'safe') {
        failed.push({
          slug,
          source: entry.source,
          reason:
            level === 'danger'
              ? `blocked by security scan (score: ${security.score}/100)`
              : `needs security review (score: ${security.score}/100); ci has no approval override`,
        })
        continue
      }

      const results = await installSkill(resolved, targets, 'copy', cwd)
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

      // Security scan for MCP servers
      const mcpSecurity = scanMcpServer(resolved)
      const mcpLevel = classifyScore(mcpSecurity.score, mcpSecurity.issues)
      if (requiresMcpApproval(mcpSecurity)) {
        mcpFailed.push({
          name,
          source: entry.source,
          reason:
            mcpLevel === 'danger'
              ? `blocked by MCP security scan (score: ${mcpSecurity.score}/100)`
              : `MCP server needs security review (score: ${mcpSecurity.score}/100); unscanned sources cannot be restored in CI`,
        })
        continue
      }

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
