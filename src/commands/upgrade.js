import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createSpinner } from '../utils/spinner.js'
import { upgradeApi } from '../api/upgrade.js'

export { compareVersions } from '../api/upgrade.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'),
)

export async function upgradeCommand(options = {}) {
  const current = pkg.version

  const spinner = createSpinner(`📦 Checking for updates (v${current})...`)
  spinner.start()

  const result = await upgradeApi({
    dryRun: options.dryRun,
    execSync: options.execSync,
    onCheck: ({ latest, isUpToDate }) => {
      spinner.succeed()
      if (options.dryRun || !latest) return

      console.log(`   Current: v${current}`)
      console.log(`   Latest:  v${latest}\n`)
      if (!isUpToDate) {
        console.log(`   ⬆️  Upgrading to v${latest}...\n`)
      }
    },
  })

  if (options.dryRun) {
    console.log(`\n📋 [dry-run] Would upgrade:\n`)
    console.log(`   Current: v${result.current}`)
    if (result.latest) {
      console.log(`   Latest:  v${result.latest}`)
      if (result.isUpToDate === false) {
        console.log(
          `   Would install: npm install -g ${pkg.name}@${result.latest}`,
        )
      } else {
        console.log('   Status: already up to date')
      }
    } else {
      console.log('   (could not fetch latest version)')
    }
    console.log()
    return
  }

  if (!result.latest) {
    console.log(
      '   ⚠️  Could not check for updates. Check your internet connection.',
    )
    console.log('   Latest: https://www.npmjs.com/package/rolecraft\n')
    return
  }

  if (result.isUpToDate) {
    console.log('   ✅ You are already using the latest version.\n')
    return
  }

  if (result.upgraded) {
    console.log(`\n   ✅ Upgraded to v${result.version}\n`)
    console.log(
      '   Restart your terminal or re-source your shell to use the new version.\n',
    )
  }
}
