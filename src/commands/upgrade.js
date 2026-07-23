import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { execSync } from 'node:child_process'
import { createSpinner } from '../utils/spinner.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'),
)

const SAFE_VERSION = /^\d+\.\d+\.\d+(-[\w.]+)?$/

export function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}

async function fetchLatestVersion() {
  try {
    const res = await fetch('https://registry.npmjs.org/rolecraft/latest')
    if (!res.ok) throw new Error(`npm registry returned ${res.status}`)
    const data = await res.json()
    return data.version
  } catch {
    return null
  }
}

export async function upgradeCommand(options = {}) {
  const current = pkg.version

  const spinner = createSpinner(`📦 Checking for updates (v${current})...`)
  spinner.start()
  const latest = await fetchLatestVersion()
  spinner.succeed()

  if (options.dryRun) {
    console.log(`\n📋 [dry-run] Would upgrade:\n`)
    console.log(`   Current: v${current}`)
    if (latest) {
      console.log(`   Latest:  v${latest}`)
      if (compareVersions(latest, current) > 0) {
        console.log(`   Would install: npm install -g ${pkg.name}@${latest}`)
      } else {
        console.log('   Status: already up to date')
      }
    } else {
      console.log('   (could not fetch latest version)')
    }
    console.log()
    return
  }

  if (!latest) {
    console.log(
      '   ⚠️  Could not check for updates. Check your internet connection.',
    )
    console.log('   Latest: https://www.npmjs.com/package/rolecraft\n')
    return
  }

  console.log(`   Current: v${current}`)
  console.log(`   Latest:  v${latest}\n`)

  if (compareVersions(latest, current) <= 0) {
    console.log('   ✅ You are already using the latest version.\n')
    return
  }

  console.log(`   ⬆️  Upgrading to v${latest}...\n`)

  const runExecSync = options.execSync || execSync

  try {
    if (!SAFE_VERSION.test(latest)) {
      throw new Error(`Invalid version: ${latest}`)
    }
    runExecSync(`npm install -g ${pkg.name}@${latest}`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_fund: 'false',
        npm_config_audit: 'false',
      },
    })
    console.log(`\n   ✅ Upgraded to v${latest}\n`)
    console.log(
      '   Restart your terminal or re-source your shell to use the new version.\n',
    )
  } catch {
    throw new Error(
      'Upgrade failed. Try running manually: npm install -g rolecraft',
    )
  }
}
