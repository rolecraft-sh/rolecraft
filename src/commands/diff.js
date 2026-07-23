import { apiDiff } from '../api/diff.js'

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
    cyan: '36',
    gray: '90',
    bold: '1',
    dim: '2',
  }
  const code = codes[color] || '0'
  return `\x1b[${code}m${text}\x1b[0m`
}

function formatVal(v) {
  if (v === undefined || v === null) return '(undefined)'
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

function printDiff(result, options) {
  const color = useColor(options)

  if (options.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log(
    `\n${colorize(`=== ${result.a} → ${result.b} ===`, 'bold', color)}`,
  )

  const fmChanges = Object.keys(result.frontmatter)
  if (fmChanges.length > 0) {
    console.log(colorize('\n--- Frontmatter Changes ---', 'cyan', color))
    for (const key of fmChanges) {
      const c = result.frontmatter[key]
      console.log(`  ${colorize(`--- ${key}:`, 'red', color)}`)
      console.log(`  ${colorize(`- ${formatVal(c.from)}`, 'red', color)}`)
      console.log(`  ${colorize(`+ ${formatVal(c.to)}`, 'green', color)}`)
    }
  }

  console.log(colorize('\n--- Section Changes ---', 'cyan', color))

  for (const sec of result.sections) {
    if (sec.status === 'added') {
      console.log(colorize(`\n## ${sec.heading} (added)`, 'green', color))
      for (const line of sec.added) {
        console.log(colorize(`+${line}`, 'green', color))
      }
    } else if (sec.status === 'removed') {
      console.log(colorize(`\n## ${sec.heading} (removed)`, 'red', color))
      for (const line of sec.removed) {
        console.log(colorize(`-${line}`, 'red', color))
      }
    } else {
      console.log(`\n## ${sec.heading}`)
      for (const line of sec.removed) {
        console.log(colorize(`-${line}`, 'red', color))
      }
      for (const line of sec.added) {
        console.log(colorize(`+${line}`, 'green', color))
      }
    }
  }

  if (result.stats.unchangedSections > 0 && !options.brief) {
    console.log(
      colorize(
        `\n${result.stats.unchangedSections} section(s) unchanged (not shown)`,
        'gray',
        color,
      ),
    )
  }

  console.log(
    colorize(
      `\nSummary: ${result.stats.changedSections} changed, ${result.stats.addedSections} added, ${result.stats.removedSections} removed, ${result.stats.unchangedSections} unchanged, ${result.stats.frontmatterChanges} frontmatter changes`,
      'bold',
      color,
    ),
  )
  console.log()
}

function printBrief(result, options) {
  const color = useColor(options)

  if (options.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log(
    `\n${colorize(`=== ${result.a} → ${result.b} ===`, 'bold', color)}`,
  )

  const fmChanges = Object.keys(result.frontmatter)
  if (fmChanges.length > 0) {
    console.log(colorize('\nFrontmatter changes:', 'yellow', color))
    for (const key of fmChanges) {
      const c = result.frontmatter[key]
      console.log(
        `  ${key}: ${colorize(formatVal(c.from), 'red', color)} → ${colorize(formatVal(c.to), 'green', color)}`,
      )
    }
  }

  console.log(colorize('\nSections:', 'yellow', color))
  for (const sec of result.sections) {
    const statusColor =
      sec.status === 'added'
        ? 'green'
        : sec.status === 'removed'
          ? 'red'
          : 'yellow'
    const label =
      sec.status === 'added' ? '+' : sec.status === 'removed' ? '-' : '~'
    const detail = []
    if (sec.added.length > 0) detail.push(`+${sec.added.length}`)
    if (sec.removed.length > 0) detail.push(`-${sec.removed.length}`)
    console.log(
      `  ${colorize(label, statusColor, color)} ${sec.heading} (${detail.join(', ')})`,
    )
  }

  console.log(
    colorize(
      `\nSummary: ${result.stats.changedSections} changed, ${result.stats.addedSections} added, ${result.stats.removedSections} removed`,
      'bold',
      color,
    ),
  )
  console.log()
}

export async function diffCommand(skillA, skillB, options = {}) {
  if (!skillA || !skillB) {
    console.error('Usage: rolecraft diff <skill-a> <skill-b>')
    console.error('       rolecraft diff <skill-a> <skill-b> --json')
    console.error('       rolecraft diff <skill-a> <skill-b> --brief')
    throw new Error('Missing skill argument(s).')
  }

  const result = await apiDiff(skillA, skillB, options)

  if (options.brief) {
    printBrief(result, options)
  } else {
    printDiff(result, options)
  }
}
