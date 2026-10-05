import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { askQuestion } from '../utils/tui.js'
import {
  loadBundleSources,
  installBundleSources,
} from '../api/bundle-internal.js'

async function ask(query) {
  return askQuestion(query, { lowercase: false })
}

async function installSources(sources, label, options, noMcp = false) {
  if (sources.length === 0) {
    console.log('No skills to install.')
    return
  }

  console.log(
    `\n📦 Installing ${sources.length} skill(s)${label}:${label ? '\n' : ''}`,
  )

  if (options.dryRun) {
    for (const source of sources) console.log(`   • ${source}`)
    console.log(`\n📋 [dry-run] Would install ${sources.length} skill(s).\n`)
    return
  }

  const { installed: successCount, failed: failCount } =
    await installBundleSources(
      sources,
      { yes: true, noMcp },
      {
        onStart: (source, index) =>
          console.log('   [%s/%s] %s', index + 1, sources.length, source),
        onError: (source, error) =>
          console.error('   ❌ %s: %s', source, error?.message),
      },
    )

  console.log()

  if (failCount === 0) {
    console.log(`✅ All ${successCount} skill(s) installed successfully.`)
  } else {
    console.log(`⚠️  ${successCount} installed, ${failCount} failed.`)
    if (options.frozenLockfile)
      throw new Error('Some skills failed to install.')
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
    bundleName = (await ask('Bundle name (my-bundle): ')) || 'my-bundle'
    const defaultPath = join(process.cwd(), `${bundleName}.json`)
    const answer = await ask(`File path (${defaultPath}): `)
    filePath = answer || defaultPath
    if (!filePath.endsWith('.json')) filePath += '.json'
  }

  const template = {
    name: bundleName,
    skills: ['owner/skill-name'],
  }

  try {
    await writeFile(filePath, `${JSON.stringify(template, null, 2)}\n`, 'utf-8')
  } catch {
    const overwrite = await ask(
      `\n⚠️  ${filePath} already exists. Overwrite? [y/N]: `,
    )
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Aborted.')
      return
    }
    await writeFile(filePath, `${JSON.stringify(template, null, 2)}\n`, 'utf-8')
  }
  console.log(`\n✅ Created ${filePath}`)
  console.log(`\nAdd skills to the "skills" array and install with:\n`)
  console.log(`   rolecraft bundle ${filePath}`)
}

export async function bundleCommand(sources, options = {}) {
  const { sources: parsed, filePath } = await loadBundleSources(sources)
  await installSources(
    parsed,
    filePath ? ` from ${filePath}` : '',
    options,
    options.noMcp,
  )
}
