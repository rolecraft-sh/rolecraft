import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import {
  detectFormat,
  skillToMdc,
  mdcToSkill,
  parseFrontmatter,
} from '../utils/converter.js'
import { expandTilde } from '../utils/paths.js'
import { UserError } from '../utils/errors.js'

function findSkillFile(dir, entries) {
  for (const e of entries) {
    if (e.isFile() && e.name === 'SKILL.md') return join(dir, e.name)
  }
  return null
}

function findMdcFiles(dir, entries) {
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.mdc'))
    .map((e) => join(dir, e.name))
}

async function detectSingleFileFormat(inputPath) {
  const content = await readFile(inputPath, 'utf-8').catch(() => {
    throw new Error(`Source not found: ${inputPath}`)
  })

  const format = detectFormat(inputPath)
  if (format) return format

  if (content.includes('slug:')) return 'skill'
  if (content.includes('alwaysApply:') || content.includes('globs:'))
    return 'mdc'

  throw new Error(
    `Cannot detect format. Name file SKILL.md (skill) or use .mdc extension.`,
  )
}

async function collectSources(expanded) {
  let entries
  try {
    entries = await readdir(expanded, { withFileTypes: true })
  } catch {
    return [
      { inputPath: expanded, format: await detectSingleFileFormat(expanded) },
    ]
  }

  const skillFile = findSkillFile(expanded, entries)
  if (skillFile) return [{ inputPath: skillFile, format: 'skill' }]

  const mdcFiles = findMdcFiles(expanded, entries)
  if (mdcFiles.length > 0) {
    return mdcFiles.map((inputPath) => ({ inputPath, format: 'mdc' }))
  }

  throw new Error(`No SKILL.md or .mdc files found in ${expanded}`)
}

function outputPathFor(format, outDir, content) {
  if (format !== 'skill') return join(outDir, 'SKILL.md')
  const parsed = parseFrontmatter(content)
  const slug = (parsed.attrs.slug || parsed.attrs.name || 'skill').replace(
    /\//g,
    '-',
  )
  return join(outDir, `${slug}.mdc`)
}

export async function convertApi(source, options = {}) {
  const expanded = expandTilde(source)
  const outDir = options.output || process.cwd()
  const sources = await collectSources(expanded)

  const plans = []
  const claimed = new Map()

  for (const { inputPath, format } of sources) {
    const content = await readFile(inputPath, 'utf-8')
    if (!content.trim()) {
      throw new Error(`Source is empty: ${inputPath}`)
    }

    const outPath = outputPathFor(format, outDir, content)

    const existing = claimed.get(outPath)
    if (existing) {
      throw new UserError(`Two sources would write the same file: ${outPath}`, {
        suggestion: `Convert "${existing}" and "${inputPath}" one at a time, or pass a different --output for each.`,
        code: 'CONVERT_OUTPUT_COLLISION',
      })
    }
    claimed.set(outPath, inputPath)

    plans.push({ inputPath, format, outPath, content })
  }

  if (options.dryRun) {
    return plans.map((plan) => ({
      dryRun: true,
      from: plan.inputPath,
      to: plan.outPath,
    }))
  }

  await mkdir(outDir, { recursive: true })

  const results = []
  for (const plan of plans) {
    const body =
      plan.format === 'skill'
        ? skillToMdc(plan.content)
        : mdcToSkill(plan.content, basename(plan.inputPath))
    await writeFile(plan.outPath, body, 'utf-8')
    results.push({
      from: plan.inputPath,
      to: plan.outPath,
      format: plan.format === 'skill' ? 'skill-to-mdc' : 'mdc-to-skill',
    })
  }

  return results
}
