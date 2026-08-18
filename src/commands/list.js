import { apiList } from '../api/list.js'
import { renderTable } from '../utils/tui.js'

export async function listCommand(cwd, options = {}) {
  const result = await apiList(cwd === undefined ? null : cwd, {
    agent: options.agent,
  })

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
    console.log(
      result.agent
        ? `No skills installed for ${result.agent}.`
        : 'No skills installed.',
    )
    return
  }

  console.log(
    result.agent
      ? `Installed skills for ${result.agent} (${entries.length}):\n`
      : `Installed skills (${entries.length}):\n`,
  )
  const rows = entries.map(([slug, entry]) => [
    slug,
    entry.scope || 'global',
    entry.installedAt ? entry.installedAt.slice(0, 10) : '-',
    entry.source || '-',
  ])
  for (const line of renderTable(
    ['SLUG', 'SCOPE', 'INSTALLED', 'SOURCE'],
    rows,
  )) {
    console.log(line)
  }

  console.log(
    `\n${entries.length} skill(s) total${result.agent ? ` for ${result.agent}` : ''}.`,
  )
}
