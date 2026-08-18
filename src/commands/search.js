import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import { apiSearch } from '../api/search.js'
import { searchRegistry } from '../utils/registry-client.js'
import { pickItem, renderTable, theme } from '../utils/tui.js'

export { setFetch } from '../api/search.js'
export { setRegistryFetch } from '../utils/registry-client.js'
export { setPromptUser } from '../utils/tui.js'

const cyan = (s) => theme.cyan(s)
const yellow = (s) => theme.yellow(s)
const dim = (s) => theme.dim(s)
const bold = (s) => theme.bold(s)

export function formatRepo(r) {
  const desc = r.description || 'No description'
  const stars = r.stargazers_count || 0
  const lang = r.language || 'N/A'
  return `${bold(r.full_name)}\n  ${dim(desc)}  ${yellow(`⭐ ${stars}`)}  ${cyan(lang)}`
}

function searchItemCard(item, selected) {
  const sel = selected ? theme.reverse(' > ') : '   '
  const name = selected ? bold(item.full_name) : dim(item.full_name)
  const desc = item.description || 'No description'
  return [
    `${sel}${name}`,
    `   ${desc}`,
    `   ⭐ ${item.stargazers_count} · ${item.language || 'N/A'}`,
    `   rolecraft install ${item.full_name}`,
  ]
}

async function pickAndInstall(items) {
  const selectedIndex = await pickItem(items, {
    format: searchItemCard,
    question: `Which skill to install? [1-${items.length}, q to quit]: `,
    linesPerItem: 4,
    footer: '↑/↓ move · Enter select · q quit',
  })

  if (selectedIndex === -1) {
    console.log('Aborted.')
    return
  }
  if (selectedIndex === -2) return

  const repo = items[selectedIndex]
  const source = repo.full_name
  console.log('\n📦 Installing "%s"...', source)
  try {
    const resolved = await resolveSource(source)
    const targets = ['project']
    await installSkill(resolved, targets)
    console.log(`✅ Installed "${resolved.name}" to ./.agents/skills/`)
  } catch (err) {
    console.error('❌ Failed to install: %s', err?.message)
  }
}

export function formatSkillsShItem(skill) {
  const desc = skill.name || 'No description'
  const installs = skill.installs || 0
  return `${bold(`${skill.source}/${skill.skillId}`)}\n  ${dim(desc)}  ${yellow(`📦 ${installs}`)}  ${cyan('skills.sh')}`
}

export function formatRegistryItem(skill) {
  const desc = skill.description || 'No description'
  const stars = skill.stars || 0
  const installs = skill.installs || 0
  const version = skill.latest || 'v1.0.0'
  const author = skill.author || ''
  return `${bold(skill.slug)}  ${yellow(`v${version.replace(/^v/, '')}`)}\n  ${dim(desc)}  ${author ? `@${author}` : ''}  ${dim(`📦 ${installs}`)}  ${dim(`⭐ ${stars}`)}`
}

export async function searchCommand(query, options = {}) {
  if (options.registry) {
    try {
      const items = await searchRegistry(query)

      if (items.length === 0) {
        console.log(`\nNo skills found in registry for "${query}".`)
        console.log(
          '  Publish your own skill with: rolecraft publish ./<skill>/',
        )
        return
      }

      console.log(`\n📦 Registry results for "${query}":\n`)
      const rows = items.map((s) => [
        s.slug,
        s.description || 'No description',
        `v${(s.latest || 'v1.0.0').replace(/^v/, '')}`,
        String(s.stars || 0),
        String(s.installs || 0),
      ])
      for (const line of renderTable(
        ['SLUG', 'DESCRIPTION', 'VERSION', 'STARS', 'INSTALLS'],
        rows,
      ))
        console.log(line)
      console.log(`\n${items.length} result(s) found.`)
    } catch (err) {
      if (err.message?.includes('rate limit')) {
        console.log(
          '\n⚠️  GitHub API rate limit reached. Set GITHUB_TOKEN to search the registry.',
        )
        return
      }
      if (err.message?.includes('Registry not found')) {
        console.log('\n⚠️  Registry is not yet available. Coming soon.')
        return
      }
      throw err
    }
    return
  }

  if (options.skillsSh) {
    try {
      const data = await apiSearch(query, { skillsSh: true })
      const items = data.results

      if (items.length === 0) {
        console.log(`\nNo skills found on skills.sh for "${query}".`)
        return
      }

      console.log(`\n🔍 [Experimental] skills.sh results for "${query}":\n`)
      const rows = items.map((s) => [
        `${s.source}/${s.skillId}`,
        s.name || 'No description',
        String(s.installs || 0),
        'skills.sh',
      ])
      for (const line of renderTable(
        ['SKILL', 'DESCRIPTION', 'INSTALLS', 'SOURCE'],
        rows,
      ))
        console.log(line)
      console.log(`\n${items.length} result(s) found.`)
      console.log(
        '\n⚠️  skills.sh integration is experimental. The API may change or become unavailable.',
      )
    } catch (err) {
      if (err.message?.includes('skills.sh API error')) {
        throw err
      }
      throw new Error(
        'Failed to search skills.sh. Check your internet connection.',
      )
    }
    return
  }

  let data
  try {
    data = await apiSearch(query)
  } catch (err) {
    if (err.message?.includes('rate limit')) {
      console.log(
        '\n⚠️  GitHub API rate limit reached. Try again later or use a GitHub token.',
      )
      return
    }
    if (err.message?.includes('GitHub API error')) {
      throw err
    }
    throw new Error(`Failed to search GitHub. Check your internet connection.`)
  }

  const items = data.results

  if (items.length === 0) {
    console.log(`\nNo skills found for "${query}".`)
    return
  }

  console.log(`\n🔍 Search results for "${query}":\n`)

  if (options.interactive) {
    await pickAndInstall(items)
  } else {
    const rows = items.map((r) => [
      r.full_name,
      r.description || 'No description',
      String(r.stargazers_count || 0),
      r.language || 'N/A',
    ])
    for (const line of renderTable(
      ['REPOSITORY', 'DESCRIPTION', 'STARS', 'LANGUAGE'],
      rows,
    ))
      console.log(line)
    console.log(`\n${items.length} result(s) found.`)
  }
}
