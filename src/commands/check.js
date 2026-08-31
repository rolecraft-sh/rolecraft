import { apiCheck } from '../api/check.js'
import { ICONS, renderTable } from '../utils/tui.js'

export async function checkCommand() {
  const result = await apiCheck(process.cwd())

  const { skills, updatesAvailable } = result
  if (skills.length === 0) {
    console.log('\nNo installed skills found.')
    return
  }

  // Count statuses for summary
  const skippedCount = skills.filter((s) => s.status === 'skipped').length
  const erroredCount = skills.filter((s) => s.status === 'error').length

  console.log(`\nChecking ${skills.length} skill(s) for updates:\n`)

  const rows = []
  for (const s of skills) {
    if (s.status === 'skipped') {
      rows.push([s.slug, `${ICONS.skip} skipped`, s.reason])
    } else if (s.status === 'update_available') {
      const detail = s.fromRegistry
        ? `${s.current} → ${s.latest} (registry)`
        : 'update available'
      rows.push([s.slug, `${ICONS.update} update`, detail])
    } else if (s.status === 'up_to_date') {
      rows.push([s.slug, `${ICONS.ok} up to date`, '-'])
    } else if (s.status === 'error') {
      rows.push([s.slug, `${ICONS.error} error`, s.reason])
    }
  }
  for (const line of renderTable(['SKILL', 'STATUS', 'DETAIL'], rows)) {
    console.log(line)
  }

  console.log(
    updatesAvailable > 0
      ? `\n${updatesAvailable} update(s) available — run \`rolecraft update <slug>\`\n`
      : '\nAll skills are up to date.\n',
  )
  console.log(
    `Checked ${skills.length} skill(s): ${updatesAvailable} update(s) available, ${skippedCount} skipped (no source), ${erroredCount} could not be checked.`,
  )
}
