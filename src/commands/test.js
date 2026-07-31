import { apiTest } from '../api/test.js'
import { existsSync } from 'node:fs'

function icon(pass) {
  if (pass === true) return '✅'
  if (pass === false) return '❌'
  return '⏭️'
}

function iconAscii(pass) {
  if (pass === true) return '[OK]'
  if (pass === false) return '[FAIL]'
  return '[SKIP]'
}

function gradeIcon(grade) {
  if (grade === 'A') return '✅'
  if (grade === 'B') return '⚠️'
  if (grade === 'C') return '⚠️'
  return '❌'
}

function gradeIconAscii(grade) {
  if (grade === 'A') return '[OK]'
  if (grade === 'B') return '[WARN]'
  if (grade === 'C') return '[WARN]'
  return '[FAIL]'
}

function useEmoji(options) {
  if (options.noEmoji) return false
  if (!process.stdout.isTTY) return false
  return true
}

function useColor(options) {
  if (options.noColor) return false
  if (process.env.NO_COLOR) return false
  if (!process.stdout.isTTY) return false
  return true
}

function colorize(text, color, enabled) {
  if (!enabled) return text
  const codes = {
    red: '31',
    green: '32',
    yellow: '33',
    blue: '34',
    magenta: '35',
    cyan: '36',
    gray: '90',
    bold: '1',
    dim: '2',
  }
  const code = codes[color] || '0'
  return `\x1b[${code}m${text}\x1b[0m`
}

function printSingleResult(result, options) {
  const emoji = useEmoji(options)
  const color = useColor(options)

  const getIcon = emoji ? icon : iconAscii

  if (options.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  const skillLabel = result.skill || result.skillPath || 'unknown'
  console.log(
    `\n${colorize('🔬', 'cyan', color)} ${colorize(`Testing: ${skillLabel}`, 'bold', color)}\n`,
  )

  for (const a of result.assertions) {
    const mark = getIcon(a.pass)
    const line = `  ${mark} ${a.detail}`
    if (a.pass === false) {
      console.log(colorize(line, 'red', color))
    } else if (a.pass === null) {
      console.log(colorize(line, 'gray', color))
    } else {
      console.log(line)
    }
  }

  const scoreColor =
    result.score >= 75 ? 'green' : result.score >= 50 ? 'yellow' : 'red'
  console.log(
    `\n${colorize(`Score: ${result.score}/100 → ${result.grade} (${result.label})`, scoreColor, color)}`,
  )

  if (result.suggestions && result.suggestions.length > 0) {
    console.log(colorize('\nSuggestions:', 'yellow', color))
    for (const s of result.suggestions) {
      console.log(`  ${colorize('→', 'cyan', color)} ${s}`)
    }
  }
  console.log()
}

function printAllResults(data, options) {
  const emoji = useEmoji(options)
  const color = useColor(options)

  if (options.json) {
    console.log(JSON.stringify(data, null, 2))
    return
  }

  const getGradeIcon = emoji ? gradeIcon : gradeIconAscii

  console.log(colorize('\nTesting all installed skills...\n', 'bold', color))

  for (const r of data.results) {
    if (r.error) {
      console.log(
        `  ${colorize(getGradeIcon('F'), 'red', color)} ${r.skill.padEnd(28)} ${colorize(`${r.score}/100`, 'red', color)}  ${gradeLabel(r.grade)}  ${colorize(`→ ${r.error}`, 'red', color)}`,
      )
      continue
    }
    const mark = getGradeIcon(r.grade)
    const scoreColor =
      r.score >= 75 ? 'green' : r.score >= 50 ? 'yellow' : 'red'
    const needsReview =
      r.score < 50 ? ` ${colorize('→ needs review', 'red', color)}` : ''
    console.log(
      `  ${colorize(mark, scoreColor, color)} ${r.skill.padEnd(28)} ${colorize(`${r.score}/100`, scoreColor, color)}  ${gradeLabel(r.grade)}${needsReview}`,
    )
  }

  if (data.summary) {
    console.log(
      `\n${colorize('📋', 'cyan', color)} Summary: ${data.summary.passed}/${data.summary.total} passed, ${data.summary.failed} failed`,
    )
  }
  console.log()
}

function gradeLabel(grade) {
  const labels = { A: 'A', B: 'B', C: 'C', D: 'D', F: 'F' }
  return labels[grade] || grade
}

export async function testCommand(skillPath, options = {}) {
  if (options.all) {
    const data = await apiTest(null, { all: true })
    printAllResults(data, options)
    return
  }

  if (!skillPath) {
    console.error('Usage: rolecraft test <skill-path>')
    console.error('       rolecraft test --all')
    throw new Error('Missing skill path argument.')
  }

  if (!existsSync(skillPath)) {
    throw new Error(`Skill file not found: ${skillPath}`)
  }

  const result = await apiTest(skillPath, options)
  printSingleResult(result, options)
}
