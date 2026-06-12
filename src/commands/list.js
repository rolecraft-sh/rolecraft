import { readLock } from '../utils/lockfile.js'

export async function listCommand() {
  const lock = await readLock()
  const skills = Object.entries(lock.skills)

  if (skills.length === 0) {
    console.log('No skills installed.')
    return
  }

  console.log('Installed skills:\n')
  for (const [slug, entry] of skills) {
    const date = entry.installedAt
      ? new Date(entry.installedAt).toLocaleDateString()
      : 'unknown'
    console.log(`   ${slug}`)
    console.log(`   ├─ Installed: ${date}`)
    if (entry.source) console.log(`   ├─ Source: ${entry.source}`)
    if (entry.sourceType) console.log(`   └─ Type: ${entry.sourceType}`)
    console.log()
  }

  const count = skills.length
  console.log(`${count} skill(s) total.`)
}
