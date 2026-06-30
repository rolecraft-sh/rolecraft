import { stdin as input, stdout as output } from 'node:process'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'

let runFetch = globalThis.fetch
let pickItem = defaultPickItem

export function setFetch(fn) {
  runFetch = fn
}

export function setPickItem(fn) {
  pickItem = fn || defaultPickItem
}

const ESC = '\x1b'
const CSI = `${ESC}[`
function cursorHide() { output.write(`${CSI}?25l`) }
function cursorShow() { output.write(`${CSI}?25h`) }
function clearLine() { output.write(`${CSI}2K\r`) }
function moveUp(n) { output.write(`${CSI}${n}A`) }
function moveDown(n) { output.write(`${CSI}${n}B`) }
function text(color, s) { return `${color}${s}${ESC}[0m` }
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

function pickAndInstallTUI(items) {
  return new Promise(resolve => {
    if (!input.isTTY) {
      resolve(null)
      return
    }

    let selected = 0
    const total = items.length
    const startY = output.rows ? output.rows - Math.min(total + 6, output.rows) : 2

    cursorHide()
    output.write(`\n${bold('Select a skill to install (↑↓ to navigate, Enter to select, q to quit):')}\n\n`)

    let listStartLine = output.cursorTo ? null : 0

    function render() {
      moveUp(Math.min(total + 4, output.rows || 30))
      for (let i = 0; i < total; i++) {
        clearLine()
        const prefix = i === selected ? `${green('▸')} ${cyan(bold(String(i + 1).padStart(2, ' ')))}` : `  ${dim(String(i + 1).padStart(2, ' '))}`
        const suffix = i === selected ? ` ${green('◀ install')}` : ''
        const line = formatRepo(items[i]).split('\n')
        output.write(`${prefix} ${line[0]}${suffix}\n`)
        clearLine()
        output.write(`   ${line[1]}\n`)
      }
      clearLine()
      output.write(`\n  ${dim('q')} quit · ${dim('↑/↓')} navigate · ${dim('Enter')} install\n`)
    }

    render()

    function onData(key) {
      if (key === 'q' || key === 'Q') {
        cleanup()
        resolve(null)
        return
      }
      if (key === '\x1b[A' || key === 'k') {
        selected = selected > 0 ? selected - 1 : total - 1
        render()
        return
      }
      if (key === '\x1b[B' || key === 'j') {
        selected = selected < total - 1 ? selected + 1 : 0
        render()
        return
      }
      if (key === '\r' || key === '\n') {
        cleanup()
        resolve(items[selected])
        return
      }
    }

    function cleanup() {
      input.removeListener('data', onData)
      input.setRawMode(false)
      cursorShow()
      output.write('\n')
    }

    try {
      input.setRawMode(true)
      input.resume()
      input.on('data', onData)
    } catch {
      cleanup()
      resolve(null)
    }
  })
}

async function pickAndInstall(items) {
  const selected = await pickItem(items)
  if (!selected) {
    console.log('Aborted.')
    return
  }

  const source = selected.full_name
  console.log(`📦 Installing "${source}"...`)
  try {
    const resolved = await resolveSource(source)
    const targets = ['project']
    await installSkill(resolved, targets)
    console.log(`✅ Installed "${resolved.name}" to ./.agents/skills/`)
  } catch (err) {
    console.error(`❌ Failed to install: ${err.message}`)
  }
}

export function defaultPickItem(items) {
  return pickAndInstallTUI(items)
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
