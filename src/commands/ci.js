import { readLock, getProjectLockPath } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import { readMcpLock, getMcpLockPath } from '../utils/mcp-lock.js'
import { resolveMcpSource, addMcpServer } from '../utils/mcp.js'

export async function ciCommand() {
  const [globalLock, projectLock, mcpLock] = await Promise.all([
    readLock(),
    readLock(getProjectLockPath(process.cwd())).catch(() => ({ skills: {} })),
    readMcpLock(),
  ])

  const allSkills = { ...globalLock.skills }
  for (const [slug, entry] of Object.entries(projectLock.skills)) {
    if (!allSkills[slug]) allSkills[slug] = entry
  }

  const skillEntries = Object.entries(allSkills)
  const mcpEntries = Object.entries(mcpLock.servers)

  let allPassed = true

  if (skillEntries.length > 0) {
    console.log('\n🔒 Installing %s skill(s) from lockfile...\n', skillEntries.length)
    for (const [slug, entry] of skillEntries) {
      if (!entry.source) {
        console.error('   ❌ %s: missing source in lockfile', slug)
        allPassed = false
        continue
      }
      console.log('   📦 %s → %s', slug, entry.source)
      try {
        const resolved = await resolveSource(entry.source)
        const targets = entry.sourceType === 'local' ? ['project'] : ['agents']
        await installSkill(resolved, targets)
        console.log('   ✅ %s installed', slug)
      } catch (err) {
        console.error('   ❌ %s: %s', slug, err?.message)
        allPassed = false
      }
    }
    console.log()
  }

  if (mcpEntries.length > 0) {
    console.log('🔌 Installing %s MCP server(s) from lockfile...\n', mcpEntries.length)
    for (const [name, entry] of mcpEntries) {
      if (!entry.source) {
        console.error('   ❌ %s: missing source in lockfile', name)
        allPassed = false
        continue
      }
      console.log('   🔗 %s → %s', name, entry.source)
      try {
        const resolved = resolveMcpSource(entry.source)
        for (const agent of entry.agents) {
          await addMcpServer(agent, name, resolved, entry.source)
        }
        console.log('   ✅ %s installed to %d agent(s)', name, entry.agents.length)
      } catch (err) {
        console.error('   ❌ %s: %s', name, err?.message)
        allPassed = false
      }
    }
    console.log()
  }

  if (skillEntries.length === 0 && mcpEntries.length === 0) {
    console.log('No skills or MCP servers in lockfile to install.')
    return
  }

  if (allPassed) {
    const total = skillEntries.length + mcpEntries.length
    console.log('✅ All %d item(s) installed from lockfile.', total)
  } else {
    throw new Error('Some items failed to install.')
  }
}
