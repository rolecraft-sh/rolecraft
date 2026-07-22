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

  const skipped = skills.filter(s => s.status === 'skipped').length
  const errors = skills.filter(s => s.status === 'error').length
  const skillLabel = skills.length === 1 ? 'skill' : 'skills'
  const updateLabel = updatesAvailable === 1 ? 'update' : 'updates'
  const updateHint = updatesAvailable > 0 ? ' Run `rolecraft update <slug>` to update.' : ''

  console.log(`\nChecked ${skills.length} ${skillLabel}: ${updatesAvailable} ${updateLabel} available, ${skipped} skipped (no source), ${errors} could not be checked.${updateHint}\n`)
}
