import { apiCheck } from '../api/check.js'

export async function checkCommand() {
  const result = await apiCheck(process.cwd())

  const { skills, updatesAvailable } = result
  if (skills.length === 0) {
    console.log('\nNo installed skills found.')
    return
  }

  console.log(`\nChecking ${skills.length} installed skills for updates...\n`)

  for (const s of skills) {
    if (s.status === 'skipped') {
      console.log(`   ⏭️  ${s.slug.padEnd(30)} ${s.reason}`)
    } else if (s.status === 'update_available') {
      console.log(`   🔄 ${s.slug.padEnd(30)} update available`)
    } else if (s.status === 'up_to_date') {
      console.log(`   ✅ ${s.slug.padEnd(30)} up to date`)
    } else if (s.status === 'error') {
      console.log(`   ❌ ${s.slug.padEnd(30)} ${s.reason}`)
    }
  }

  console.log(
    `\n${updatesAvailable > 0 ? `⚠️  ${updatesAvailable} skill(s) have updates available. Run \`rolecraft update <slug>\` to update.` : '✅ All skills are up to date.'}\n`,
  )
}
