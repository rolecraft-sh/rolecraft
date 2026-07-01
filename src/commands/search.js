import { createInterface } from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'

let runFetch = globalThis.fetch
let promptUser = defaultPrompt

export function setFetch(fn) {
  runFetch = fn
}

export function setPromptUser(fn) {
  promptUser = fn || defaultPrompt
}

const CSI = '\x1b['
const text = (color, s) => `${color}${s}\x1b[0m`
const cyan = s => text(`${CSI}36m`, s)
const green = s => text(`${CSI}32m`, s)
const yellow = s => text(`${CSI}33m`, s)
const dim = s => text(`${CSI}2m`, s)
const bold = s => text(`${CSI}1m`, s)

export function formatRepo(r) {
  const desc = r.description || 'No description'
  const stars = r.stargazers_count || 0
  const lang = r.language || 'N/A'
  return `${bold(r.full_name)}\n  ${dim(desc)}  ${yellow(`⭐ ${stars}`)}  ${cyan(lang)}`
}

function defaultPrompt(query) {
  const rl = createInterface({ input, output })
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

async function pickAndInstall(items) {
  console.log()
  for (let i = 0; i < items.length; i++) {
    const line = formatRepo(items[i]).split('\n')
    console.log(`  ${cyan(bold(String(i + 1).padStart(2, ' ')))} ${line[0]}`)
    console.log(`     ${line[1]}`)
    console.log()
  }

  const answer = await promptUser(`Which skill to install? [1-${items.length}, q to quit]: `)

  if (answer === 'q') {
    console.log('Aborted.')
    return
  }

  const index = parseInt(answer, 10)
  if (isNaN(index) || index < 1 || index > items.length) {
    console.log(`Invalid choice. Enter a number between 1 and ${items.length}.`)
    return
  }

  const repo = items[index - 1]
  const source = repo.full_name
  console.log(`\n📦 Installing "${source}"...`)
  try {
    const resolved = await resolveSource(source)
    const targets = ['project']
    await installSkill(resolved, targets)
    console.log(`✅ Installed "${resolved.name}" to ./.agents/skills/`)
  } catch (err) {
    console.error(`❌ Failed to install: ${err.message}`)
  }
}

function isGitHubRef(source) {
  return /^[\w.-]+\/[\w.-]+$/.test(source) && !source.startsWith('/') && !source.startsWith('.')
}

async function searchGitHub(query, filenameFilter = true) {
  const q = filenameFilter
    ? `${encodeURIComponent(query)}+filename:SKILL.md`
    : encodeURIComponent(query)
  const url = `https://api.github.com/search/repositories?q=${q}&per_page=20&sort=stars`

  const response = await runFetch(url, {
    headers: { Accept: 'application/vnd.github.v3+json' },
    signal: AbortSignal.timeout(10000),
  })

  if (response.status === 403) {
    return { rateLimited: true }
  }

  if (!response.ok) {
    return { error: `GitHub API error: ${response.status}` }
  }

  return await response.json()
}

async function lookupGithubRepo(ref) {
  const url = `https://api.github.com/repos/${ref}`
  try {
    const response = await runFetch(url, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

async function searchOrLookup(query) {
  if (isGitHubRef(query)) {
    const repo = await lookupGithubRepo(query)
    if (repo) {
      const items = [{
        full_name: repo.full_name,
        description: repo.description,
        stargazers_count: repo.stargazers_count,
        language: repo.language,
      }]
      const data = await searchGitHub(query, true)
      if (data.items && data.items.length > 0) {
        return data
      }
      return { items, fromLookup: true }
    }
  }
  return await searchGitHub(query, true)
}

function displayResults(data, query) {
  const fromLookup = data.fromLookup
  if (fromLookup) {
    console.log(`\n🔍 Search results for "${query}":\n`)
  } else {
    console.log(`\n🔍 Search results for "${query}":\n`)
  }

  for (const repo of data.items) {
    const desc = repo.description || 'No description'
    console.log(`   ${repo.full_name}`)
    console.log(`   ├─ ${desc}`)
    console.log(`   ├─ ⭐ ${repo.stargazers_count}  📝 ${repo.language || 'N/A'}`)
    console.log(`   └─ rolecraft install ${repo.full_name}`)
    console.log()
  }
  console.log(`${data.items.length} result(s) found.`)
}

export async function searchCommand(query, options = {}) {
  let data

  try {
    data = await searchOrLookup(query)
  } catch {
    throw new Error('Failed to search GitHub. Check your internet connection.')
  }

  if (data.rateLimited) {
    console.log('\n⚠️  GitHub API rate limit reached. Try again later or use a local source.\n')
    return
  }

  if (data.error) {
    throw new Error(data.error)
  }

  if (data.items.length === 0) {
    try {
      data = await searchGitHub(query, false)
    } catch {
      throw new Error('Failed to search GitHub. Check your internet connection.')
    }

    if (data.rateLimited) {
      console.log('\n⚠️  GitHub API rate limit reached. Try again later or use a local source.\n')
      return
    }

    if (data.items.length === 0) {
      console.log(`\nNo skills found for "${query}".`)
      return
    }

    console.log(`\nNo skills found with SKILL.md file. Search results for "${query}":\n`)
  }

  displayResults(data, query)

  if (options.interactive) {
    await pickAndInstall(data.items)
  }
}
