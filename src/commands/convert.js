import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'
import { homedir } from 'node:os'
import { detectFormat, skillToMdc, mdcToSkill, parseFrontmatter } from '../utils/converter.js'

async function findSkillFile(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.isFile() && e.name === 'SKILL.md') return join(dir, e.name)
  }
  return null
}

async function findMdcFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries.filter(e => e.isFile() && e.name.endsWith('.mdc')).map(e => join(dir, e.name))
}

export async function convertCommand(source, options = {}) {
  const expanded = source.startsWith('~') ? join(homedir(), source.slice(1)) : source
  let statResult

  try {
    statResult = await stat(expanded)
  } catch {
    throw new Error(`Source not found: ${expanded}`)
  }

  const outDir = options.output || process.cwd()

  if (statResult.isDirectory()) {
    const skillFile = await findSkillFile(expanded)
    if (skillFile) {
      await convertSingleFile(skillFile, 'skill', outDir, options)
      return
    }

    const mdcFiles = await findMdcFiles(expanded)
    if (mdcFiles.length > 0) {
      for (const mf of mdcFiles) {
        await convertSingleFile(mf, 'mdc', outDir, options)
      }
      return
    }

    throw new Error(`No SKILL.md or .mdc files found in ${expanded}`)
  }

  const format = detectFormat(expanded)
  if (!format) {
    const content = await readFile(expanded, 'utf-8')
    if (content.includes('slug:')) {
      await convertSingleFile(expanded, 'skill', outDir, options)
    } else if (content.includes('alwaysApply:') || content.includes('globs:')) {
      await convertSingleFile(expanded, 'mdc', outDir, options)
    } else {
      throw new Error(`Cannot detect format. Name file SKILL.md (skill) or use .mdc extension.`)
    }
    return
  }

  await convertSingleFile(expanded, format, outDir, options)
}

async function convertSingleFile(inputPath, format, outDir, options) {
  const content = await readFile(inputPath, 'utf-8')

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
    const slug = (parsed.attrs.slug || parsed.attrs.name || 'skill').replace(/\//g, '-')
    const filename = `${slug}.mdc`
    const outPath = join(outDir, filename)
    const result = skillToMdc(content)
    await writeFile(outPath, result, 'utf-8')
    console.log(`  Converted:    ${inputPath}`)
    console.log(`  To:           ${outPath}`)
  } else {
    const outPath = join(outDir, 'SKILL.md')
    const result = mdcToSkill(content, basename(inputPath))
    await writeFile(outPath, result, 'utf-8')
    console.log(`  Converted:    ${inputPath}`)
    console.log(`  To:           ${outPath}`)
  }
}
