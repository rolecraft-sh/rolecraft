import { apiCompose } from '../api/compose.js'
import { writeFileSync, existsSync } from 'node:fs'

function useColor(options) {
  if (options.noColor) return false
  if (process.env.NO_COLOR) return false
  if (!process.stdout.isTTY) return false
  return true
}

function colorize(text, color, enabled) {
  if (!enabled) return text
  const codes = {
    green: '32',
    yellow: '33',
    cyan: '36',
    bold: '1',
  }
  const code = codes[color] || '0'
  return `\x1b[${code}m${text}\x1b[0m`
}

function printResult(data, sources, options) {
  const color = useColor(options)

  if (options.json) {
    console.log(JSON.stringify(data, null, 2))
    return
  }

  const mode = options.mode || 'merge'

  console.log(
    colorize(
      `\nComposing ${sources.length} skills (${mode} mode)...`,
      'bold',
      color,
    ),
  )

  if (options.dryRun) {
    console.log(colorize('\n--- Preview (dry-run) ---', 'cyan', color))
    console.log(data.content)
    console.log(colorize('--- End Preview ---', 'cyan', color))
  }

  console.log(colorize(`\nCompose result:`, 'bold', color))
  console.log(
    `  ${colorize('✓', 'green', color)} ${data.stats.mergedSections} sections composed`,
  )
  console.log(
    `  ${colorize('✓', 'green', color)} ${data.stats.frontmatterFields} frontmatter fields`,
  )
  console.log(
    `  ${colorize('✓', 'green', color)} Sources: ${data.stats.sources}`,
  )
  console.log(`  ${colorize('✓', 'green', color)} Mode: ${mode}`)

  if (data.stats.totalInputSections !== data.stats.totalOutputSections) {
    console.log(
      `  ${colorize('✓', 'green', color)} Input: ${data.stats.totalInputSections} sections → Output: ${data.stats.totalOutputSections} sections`,
    )
  }
  console.log()
}

export async function composeCommand(sources, options = {}) {
  if (!sources || sources.length < 2) {
    console.error(
      'Usage: rolecraft compose <skill-a> <skill-b> [<skill-c> ...]',
    )
    console.error(
      '       rolecraft compose <skill-a> <skill-b> -o output.SKILL.md',
    )
    console.error(
      '       rolecraft compose <skill-a> <skill-b> --chain --name combined',
    )
    throw new Error('At least 2 skill files required.')
  }

  const data = await apiCompose(sources, options)

  if (options.dryRun) {
    printResult(data, sources, options)
    return
  }

  if (options.output) {
    if (existsSync(options.output) && !options.force) {
      throw new Error(
        `Output file already exists: ${options.output}. Use --force to overwrite.`,
      )
    }
    writeFileSync(options.output, data.content, 'utf-8')
    console.log(`\n✓ Written to ${options.output}`)
  } else {
    console.log(data.content)
  }

  printResult(data, sources, options)
}
