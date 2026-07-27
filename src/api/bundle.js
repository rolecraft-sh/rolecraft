import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { installCommand } from '../commands/install.js'

function parseSources(raw, filePath) {
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    if (parsed.skills && Array.isArray(parsed.skills)) return parsed.skills
    throw new Error(
      'JSON bundle must be an array of sources or an object with a "skills" array',
    )
  }

  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
}

async function resolveBundleFile(arg) {
  const isFilePath =
    arg.endsWith('.json') ||
    arg.endsWith('.txt') ||
    arg.startsWith('./') ||
    arg.startsWith('../') ||
    arg.startsWith('/') ||
    arg.startsWith('~')
  if (isFilePath) {
    const resolvedPath = arg.startsWith('~')
      ? join(process.env.HOME || '/tmp', arg.slice(1))
      : arg
    for (const candidate of [resolvedPath, join(process.cwd(), arg)]) {
      try {
        await readFile(candidate, 'utf-8')
        return candidate
      } catch {}
    }
    throw new Error(`Bundle file not found: ${arg}`)
  }

  const candidates = [
    arg,
    join(process.cwd(), arg),
    `${arg}.json`,
    `${arg}.txt`,
    join(process.cwd(), `${arg}.json`),
    join(process.cwd(), `${arg}.txt`),
  ]

  for (const candidate of candidates) {
    try {
      await readFile(candidate, 'utf-8')
      return candidate
    } catch {}
  }
  return null
}

export async function bundleApi(sources, options = {}) {
  let skillSources

  if (typeof sources === 'string') {
    const filePath = await resolveBundleFile(sources)
    if (filePath) {
      const raw = await readFile(filePath, 'utf-8')
      skillSources = parseSources(raw, filePath)
    } else {
      skillSources = [sources]
    }
  } else {
    skillSources = sources
  }

  if (skillSources.length === 0) {
    return { installed: 0, failed: 0, results: [] }
  }

  const results = []
  let successCount = 0
  let failCount = 0

  for (const source of skillSources) {
    try {
      await installCommand(source, {
        global: true,
        project: true,
        noMcp: options.noMcp || false,
        dryRun: options.dryRun || false,
      })
      successCount++
      results.push({ source, status: 'ok' })
    } catch (err) {
      failCount++
      results.push({ source, status: 'failed', error: err.message })
    }
  }

  if (options.dryRun) {
    return { dryRun: true, skills: skillSources }
  }

  return { installed: successCount, failed: failCount, results }
}
