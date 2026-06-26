import { createInterface } from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'

let runFetch = globalThis.fetch
let askQuestion = defaultAskQuestion

export function setFetch(fn) {
  runFetch = fn
}

export function setAskQuestion(fn) {
  askQuestion = fn || defaultAskQuestion
}

function defaultAskQuestion(query) {
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
  const answer = await askQuestion(`Which skill to install? [1-${items.length}, q to quit]: `)

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

export async function searchCommand(query, options = {}) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+filename:SKILL.md&per_page=20&sort=stars`

  let response
  try {
    response = await runFetch(url, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    throw new Error('Failed to search GitHub. Check your internet connection.')
  }

  if (response.status === 403) {
    console.log('\n⚠️  GitHub API rate limit reached. Try again later or use a local source.\n')
    return
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.items.length === 0) {
    console.log(`\nNo skills found for "${query}".`)
    return
  }

  console.log(`\n🔍 Search results for "${query}":\n`)
  for (const repo of data.items) {
    const desc = repo.description || 'No description'
    console.log(`   ${repo.full_name}`)
    console.log(`   ├─ ${desc}`)
    console.log(`   ├─ ⭐ ${repo.stargazers_count}  📝 ${repo.language || 'N/A'}`)
    console.log(`   └─ rolecraft install ${repo.full_name}`)
    console.log()
  }
  console.log(`${data.items.length} result(s) found.`)

  if (options.interactive) {
    await pickAndInstall(data.items)
  }
}
