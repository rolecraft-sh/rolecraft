import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { execSync } from 'node:child_process'

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

export async function upgradeApi(options = {}) {
  const current = pkg.version
  const latest = await fetchLatestVersion()

  const isUpToDate = latest ? compareVersions(latest, current) <= 0 : null

  const result = {
    current,
    latest: latest || null,
    isUpToDate,
  }

  if (options.dryRun) {
    result.dryRun = true
    return result
  }

  if (!latest) {
    result.upgraded = false
    result.reason =
      'Could not fetch latest version. Check your internet connection.'
    return result
  }

  if (isUpToDate) {
    result.upgraded = false
    result.reason = 'Already up to date'
    return result
  }

  if (!SAFE_VERSION.test(latest)) {
    throw new Error(`Invalid version: ${latest}`)
  }

  const runExecSync = options.execSync || execSync

  try {
    runExecSync(`npm install -g ${pkg.name}@${latest}`, {
      stdio: options.silent ? 'pipe' : 'inherit',
      env: {
        ...process.env,
        npm_config_fund: 'false',
        npm_config_audit: 'false',
      },
    })
    result.upgraded = true
    result.version = latest
  } catch {
    throw new Error(
      'Upgrade failed. Try running manually: npm install -g rolecraft',
    )
  }

  return result
}
