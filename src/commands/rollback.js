import { apiRollback } from '../api/rollback.js'
import { UserError } from '../utils/errors.js'

export async function rollbackCommand(args) {
  const pos = args.filter((a) => !a.startsWith('-'))
  const slug = pos[0]

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: rolecraft rollback <slug> [options]

Restore a skill to its previous version. Requires a history entry
(created automatically when you use rolecraft update or re-install).

Options:
  --list              Show available rollback versions
  --dry-run           Preview what would be restored without making changes
  --help, -h          Show this help

Examples:
  rolecraft rollback my-skill            Restore most recent backup
  rolecraft rollback my-skill --list     List rollback history
  rolecraft rollback my-skill --dry-run  Preview restore
`)
    return
  }

  if (!slug) {
    throw new UserError('Missing slug argument.', {
      suggestion: 'rolecraft rollback my-skill',
      code: 'ROLLBACK_MISSING_SLUG',
    })
  }

  const result = await apiRollback(slug, {
    dryRun: args.includes('--dry-run'),
    list: args.includes('--list'),
  })

  if (result.list || result.dryRun) {
    if (result.dryRun) {
      console.log(`\n🔄 Dry-run: rollback "${result.slug}"`)
      console.log(`   Files to restore: ${result.files.join(', ')}`)
      console.log(`   Targets: ${result.targets.join(', ')}`)
      console.log(`   Previous version: ${result.prevContentSha}`)
      console.log(`\n   Run without --dry-run to apply.`)
    } else {
      console.log(`\n📜 Rollback history for "${result.slug}":`)
      console.log(`   Current: ${result.currentVersion}`)
      if (result.history.length === 0) {
        console.log('   No previous versions available.')
      }
      for (const h of result.history) {
        console.log(
          `   ${' '.repeat(8)}v${h.version}: ${h.contentSha} (${h.installedAt})`,
        )
      }
    }
    return
  }

  console.log(`\n✅ Rolled back "${result.slug}" to previous version.`)
  console.log(`   Files restored: ${result.files.length}`)
  console.log(`   Targets: ${result.targets.map((t) => t.target).join(', ')}`)
}
