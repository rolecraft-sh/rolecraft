import { readLock, getProjectLockPath } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'

export async function checkCommand() {
  const globalLock = await readLock()
  const projectLock = await readLock(getProjectLockPath(process.cwd())).catch(() => ({ skills: {} }))
  const allSkills = { ...globalLock.skills, ...projectLock.skills }

  const entries = Object.entries(allSkills)
  if (entries.length === 0) {
    console.log('\nNo installed skills found.')
    return
  }

  console.log(`\nChecking ${entries.length} installed skills for updates...\n`)

  let updatesAvailable = 0
  for (const [slug, info] of entries) {
    const source = info.source
    if (!source) {
      console.log(`   ⏭️  ${slug.padEnd(30)} no source info, skipping`)
      continue
    }

    try {
      const resolved = await resolveSource(source)
      const oldHash = info.contentSha || ''
      const newHash = resolved.contentSha || ''

      if (oldHash && newHash && oldHash !== newHash) {
        console.log(`   🔄 ${slug.padEnd(30)} update available`)
        updatesAvailable++
      } else {
        console.log(`   ✅ ${slug.padEnd(30)} up to date`)
      }
    } catch {
      console.log(`   ❌ ${slug.padEnd(30)} could not check (source: ${source})`)
    }
  }

  console.log(`\n${updatesAvailable > 0 ? `⚠️  ${updatesAvailable} skill(s) have updates available. Run \`rolecraft update <slug>\` to update.` : '✅ All skills are up to date.'}\n`)
}
