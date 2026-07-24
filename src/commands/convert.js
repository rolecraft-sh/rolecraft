import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'
import {
  detectFormat,
  skillToMdc,
  mdcToSkill,
  parseFrontmatter,
} from '../utils/converter.js'

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

export async function convertCommand(source, options = {}) {
  const expanded = source.startsWith('~')
    ? join(homedir(), source.slice(1))
    : source
  const outDir = options.output || process.cwd()

  const entries = await readdir(expanded, { withFileTypes: true }).catch(
    async () => {
      // Not a directory — read as a single file
      const content = await readFile(expanded, 'utf-8').catch(() => {
        throw new Error(`Source not found: ${expanded}`)
      })

      const format = detectFormat(expanded)
      if (!format) {
        if (content.includes('slug:')) {
          await convertSingleFile(expanded, 'skill', outDir, options)
        } else if (
          content.includes('alwaysApply:') ||
          content.includes('globs:')
        ) {
          await convertSingleFile(expanded, 'mdc', outDir, options)
        } else {
          throw new Error(
            `Cannot detect format. Name file SKILL.md (skill) or use .mdc extension.`,
          )
        }
        return
      }
      await convertSingleFile(expanded, format, outDir, options)
    },
  )

  if (!entries) return

  const skillFile = findSkillFile(expanded, entries)
  if (skillFile) {
    await convertSingleFile(skillFile, 'skill', outDir, options)
    return
  }

  const mdcFiles = findMdcFiles(expanded, entries)
  if (mdcFiles.length > 0) {
    for (const mf of mdcFiles) {
      await convertSingleFile(mf, 'mdc', outDir, options)
    }
    return
  }

  throw new Error(`No SKILL.md or .mdc files found in ${expanded}`)
}

async function convertSingleFile(inputPath, format, outDir, options) {
  const content = await readFile(inputPath, 'utf-8')
  if (!content.trim()) {
    throw new Error(`Source is empty: ${inputPath}`)
  }

  if (options.dryRun) {
    console.log(`  Would convert: ${inputPath}`)
    if (format === 'skill') {
      const parsed = parseFrontmatter(content)
      const slug = parsed.attrs.slug || parsed.attrs.name || 'skill'
      console.log(`  To:           ${join(outDir, `${slug}.mdc`)}`)
    } else {
      console.log(`  To:           ${join(outDir, 'SKILL.md')}`)
    }
    return
  }

  await mkdir(outDir, { recursive: true })

  if (format === 'skill') {
    const parsed = parseFrontmatter(content)
    const slug = (parsed.attrs.slug || parsed.attrs.name || 'skill').replace(
      /\//g,
      '-',
    )
    const outPath = join(outDir, `${slug}.mdc`)
    await writeFile(outPath, skillToMdc(content), 'utf-8')
    console.log(`  Converted:    ${inputPath}`)
    console.log(`  To:           ${outPath}`)
  } else {
    const outPath = join(outDir, 'SKILL.md')
    await writeFile(outPath, mdcToSkill(content, basename(inputPath)), 'utf-8')
    console.log(`  Converted:    ${inputPath}`)
    console.log(`  To:           ${outPath}`)
  }
}
