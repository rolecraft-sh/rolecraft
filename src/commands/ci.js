import { readLock, getProjectLockPath } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'

export async function ciCommand() {
  const [globalLock, projectLock] = await Promise.all([
    readLock(),
    readLock(getProjectLockPath(process.cwd())).catch(() => ({ skills: {} })),
  ])

  const allSkills = { ...globalLock.skills }
  for (const [slug, entry] of Object.entries(projectLock.skills)) {
    if (!allSkills[slug]) allSkills[slug] = entry
  }

  const entries = Object.entries(allSkills)
  if (entries.length === 0) {
    console.log('No skills in lockfile to install.')
    return
  }

    console.log('\n🔒 Installing %s skill(s) from lockfile...\n', entries.length)

  let allPassed = true
  for (const [slug, entry] of entries) {
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
  if (allPassed) {
    console.log('✅ All %s skill(s) installed from lockfile.', entries.length)
  } else {
    throw new Error('Some skills failed to install.')
  }
}
