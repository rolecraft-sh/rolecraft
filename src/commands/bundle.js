import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
import { installCommand } from './install.js'

function askQuestion(query) {
  const rl = createInterface({ input, output })
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function parseSources(raw, filePath) {
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    if (parsed.skills && Array.isArray(parsed.skills)) return parsed.skills
    throw new Error('JSON bundle must be an array of sources or an object with a "skills" array')
  }

  return raw.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
}

async function resolveBundleFile(arg) {
  const isFilePath = arg.endsWith('.json') || arg.endsWith('.txt') || arg.startsWith('./') || arg.startsWith('../') || arg.startsWith('/') || arg.startsWith('~')
  if (isFilePath) {
    const resolvedPath = arg.startsWith('~') ? join(process.env.HOME || '/tmp', arg.slice(1)) : arg
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

async function installSources(sources, label, options, noMcp = false) {
  if (sources.length === 0) {
    console.log('No skills to install.')
    return
  }

  console.log(`\n📦 Installing ${sources.length} skill(s)${label}:${label ? '\n' : ''}`)

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    console.log(`   [${i + 1}/${sources.length}] ${source}`)

    if (options.dryRun) continue

    try {
      await installCommand(source, { global: true, project: true, noMcp: noMcp, dryRun: options.dryRun })
      successCount++
    } catch (err) {
      console.error(`   ❌ ${source}: ${err.message}`)
      failCount++
    }
  }

  console.log()
  if (options.dryRun) {
    console.log(`📋 Would install ${sources.length} skill(s). Use without --dry-run to install.`)
    return
  }

  if (failCount === 0) {
    console.log(`✅ All ${successCount} skill(s) installed successfully.`)
  } else {
    console.log(`⚠️  ${successCount} installed, ${failCount} failed.`)
    if (options.frozenLockfile) throw new Error('Some skills failed to install.')
  }
}

export async function bundleCreateCommand(name) {
  let bundleName = name
  let filePath

  if (bundleName) {
    bundleName = bundleName.replace(/\.json$/, '')
    filePath = join(process.cwd(), `${bundleName}.json`)
  } else {
    console.log('\n📝 Creating a new bundle file\n')
    bundleName = await askQuestion('Bundle name (my-bundle): ') || 'my-bundle'
    const defaultPath = join(process.cwd(), `${bundleName}.json`)
    const answer = await askQuestion(`File path (${defaultPath}): `)
    filePath = answer || defaultPath
    if (!filePath.endsWith('.json')) filePath += '.json'
  }

  const template = {
    name: bundleName,
    skills: [
      'owner/skill-name',
    ],
  }

  try {
    await writeFile(filePath, JSON.stringify(template, null, 2) + '\n', 'utf-8')
  } catch {
    const overwrite = await askQuestion(`\n⚠️  ${filePath} already exists. Overwrite? [y/N]: `)
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Aborted.')
      return
    }
    await writeFile(filePath, JSON.stringify(template, null, 2) + '\n', 'utf-8')
  }
  console.log(`\n✅ Created ${filePath}`)
  console.log(`\nAdd skills to the "skills" array and install with:\n`)
  console.log(`   rolecraft bundle ${filePath}`)
}

export async function bundleCommand(sources, options = {}) {
  if (typeof sources === 'string') {
    const filePath = await resolveBundleFile(sources)
    if (filePath) {
      const raw = await readFile(filePath, 'utf-8')
      const parsed = parseSources(raw, filePath)
      await installSources(parsed, ` from ${filePath}`, options, options.noMcp)
      return
    }
    await installSources([sources], '', options, options.noMcp)
    return
  }

  await installSources(sources, '', options, options.noMcp)
}
