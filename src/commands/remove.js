import { apiRemove } from '../api/remove.js'

export async function removeCommand(slug, options = {}) {
  if (options.dryRun) {
    const result = await apiRemove(slug, process.cwd(), { dryRun: true })
    console.log(`\n📋 [dry-run] Would remove skill:\n`)
    console.log(`   Skill:  ${result.slug}`)
    for (const d of result.dirs) {
      console.log(`   ${d.scope === 'global' ? 'Global' : 'Project'}: ${d.path}`)
    }
    console.log()
    return
  }

  const result = await apiRemove(slug, process.cwd())
  console.log(`✅ Removed ${result.slug}.`)
}
