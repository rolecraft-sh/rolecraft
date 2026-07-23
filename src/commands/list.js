import { apiList } from '../api/list.js'

export async function listCommand(cwd, options = {}) {
  const result = await apiList(cwd === undefined ? null : cwd)

  const entries = Object.entries(result.skills)

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          skills: result.skills,
          total: entries.length,
        },
        null,
        2,
      ),
    )
    return
  }

  if (entries.length === 0) {
    console.log('No skills installed.')
    return
  }

  console.log('Installed skills:\n')
  for (const [slug, entry] of entries) {
    const date = entry.installedAt
      ? new Date(entry.installedAt).toLocaleDateString()
      : 'unknown'
    console.log(`   ${slug}`)
    console.log(`   ├─ Installed: ${date}`)
    console.log(`   ├─ Scope: ${entry.scope}`)
    if (entry.source) console.log(`   ├─ Source: ${entry.source}`)
    if (entry.sourceType) console.log(`   └─ Type: ${entry.sourceType}`)
    console.log()
  }

  console.log(`${entries.length} skill(s) total.`)
}
