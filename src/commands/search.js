import { stdin as input, stdout as output } from 'node:process'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import { apiSearch } from '../api/search.js'

export { setFetch } from '../api/search.js'

const CSI = '\x1b['
const sgr = (n) => `${CSI}${n}m`
const cursorTo = (r, c) => `${CSI}${r};${c}H`
const eraseLine = `${CSI}K`
const hideCursor = `${CSI}?25l`
const showCursor = `${CSI}?25h`
const clearScreen = `${CSI}2J${CSI}H`

const text = (code, s) => `${code}${s}${sgr(0)}`
const cyan = (s) => text(sgr(36), s)
const yellow = (s) => text(sgr(33), s)
const dim = (s) => text(sgr(2), s)
const bold = (s) => text(sgr(1), s)

export function formatRepo(r) {
  const desc = r.description || 'No description'
  const stars = r.stargazers_count || 0
  const lang = r.language || 'N/A'
  return `${bold(r.full_name)}\n  ${dim(desc)}  ${yellow(`⭐ ${stars}`)}  ${cyan(lang)}`
}

let promptUser = defaultPrompt

async function defaultPrompt(query) {
  const { createInterface } = await import('node:readline')
  const rl = createInterface({ input, output })
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

export function setPromptUser(fn) {
  promptUser = fn || defaultPrompt
}

const ITEM_LINES = 4

function tuiFormat(item, selected) {
  const sel = selected ? `${sgr(7)} > ${sgr(0)}` : '   '
  const name = selected ? bold(item.full_name) : dim(item.full_name)
  const desc = item.description || 'No description'
  return [
    `${sel}${name}`,
    `   ├─ ${desc}`,
    `   ├─ ⭐ ${item.stargazers_count}  📝 ${item.language || 'N/A'}`,
    `   └─ rolecraft install ${item.full_name}`,
  ]
}

async function runTUI(items) {
  const wasRaw = input.isRaw
  input.setRawMode(true)
  input.resume()

  let selectedIndex = 0
  let scrollOffset = 0
  const termRows = output.rows || 24
  const reservedRows = 2
  const availRows = termRows - reservedRows
  const visibleCount = Math.min(
    Math.max(1, Math.floor(availRows / ITEM_LINES)),
    items.length,
  )
  const statusRow = termRows

  function render() {
    let out = clearScreen + hideCursor
    out += '\n'
    const end = Math.min(scrollOffset + visibleCount, items.length)
    for (let i = scrollOffset; i < end; i++) {
      const lines = tuiFormat(items[i], i === selectedIndex)
      for (const line of lines) out += `${line}\n`
    }
    out +=
      cursorTo(statusRow, 1) +
      eraseLine +
      sgr(7) +
      '  ↑/↓ move · Enter select · q quit  ' +
      sgr(0)
    output.write(out)
  }

  function ensureVisible(index) {
    if (index < scrollOffset) {
      scrollOffset = index
      return true
    }
    if (index >= scrollOffset + visibleCount) {
      scrollOffset = index - visibleCount + 1
      return true
    }
    return false
  }

  render()

  return new Promise((resolve) => {
    function onData(buf) {
      const key = buf.toString()

      if (key === '\u001b[A') {
        if (selectedIndex > 0) {
          selectedIndex--
          ensureVisible(selectedIndex)
          render()
        }
      } else if (key === '\u001b[B') {
        if (selectedIndex < items.length - 1) {
          selectedIndex++
          ensureVisible(selectedIndex)
          render()
        }
      } else if (key === '\r' || key === '\n') {
        cleanup()
        resolve(selectedIndex)
      } else if (key === '\u0003' || key === 'q' || key === 'Q') {
        cleanup()
        resolve(-1)
      }
    }

    function cleanup() {
      input.removeListener('data', onData)
      input.pause()
      input.setRawMode(wasRaw)
      output.write(showCursor)
    }

    input.on('data', onData)
  })
}

async function promptSelect(items) {
  console.log()
  for (let i = 0; i < items.length; i++) {
    const line = formatRepo(items[i]).split('\n')
    console.log(`  ${bold(cyan(String(i + 1).padStart(2, ' ')))} ${line[0]}`)
    console.log(`     ${line[1]}`)
    console.log()
  }

  const answer = await promptUser(
    `Which skill to install? [1-${items.length}, q to quit]: `,
  )

  const trimmed = (answer || '').trim().toLowerCase()
  if (trimmed === 'q') return -1
  const index = parseInt(trimmed, 10)
  if (Number.isNaN(index) || index < 1 || index > items.length) {
    console.log(`Invalid choice. Enter a number between 1 and ${items.length}.`)
    return -2
  }
  return index - 1
}

async function pickAndInstall(items) {
  let selectedIndex

  if (output.isTTY && items.length > 0) {
    selectedIndex = await runTUI(items)
  } else {
    selectedIndex = await promptSelect(items)
  }

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

export async function searchCommand(query, options = {}) {
  if (options.skillsSh) {
    try {
      const data = await apiSearch(query, { skillsSh: true })
      const items = data.results

      if (items.length === 0) {
        console.log(`\nNo skills found on skills.sh for "${query}".`)
        return
      }

      console.log(`\n🔍 [Experimental] skills.sh results for "${query}":\n`)
      for (const skill of items) {
        const line = formatSkillsShItem(skill).split('\n')
        console.log(`   ${line[0]}`)
        console.log(`   ├─ ${line[1]}`)
        console.log(
          `   └─ rolecraft install ${skill.installSource || `${skill.source}/${skill.skillId}`}`,
        )
        console.log()
      }
      console.log(`${items.length} result(s) found.`)
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

  if (data.fromLookup) {
    console.log(`\n🔍 Search results for "${query}":\n`)
  } else {
    console.log(`\n🔍 Search results for "${query}":\n`)
  }

  if (options.interactive) {
    await pickAndInstall(items)
  } else {
    for (const repo of items) {
      const desc = repo.description || 'No description'
      console.log(`   ${repo.full_name}`)
      console.log(`   ├─ ${desc}`)
      console.log(
        `   ├─ ⭐ ${repo.stargazers_count}  📝 ${repo.language || 'N/A'}`,
      )
      console.log(`   └─ rolecraft install ${repo.full_name}`)
      console.log()
    }
    console.log(`${items.length} result(s) found.`)
  }
}
