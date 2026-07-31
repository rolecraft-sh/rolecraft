import { apiVerify } from '../api/verify.js'

export async function verifyCommand(frozen) {
  const result = await apiVerify(process.cwd(), frozen)

  if (result.verified.length === 0 && result.failed.length === 0) {
    console.log('No skills in lockfile.')
    return
  }

  console.log(
    `\n🔍 Verifying ${result.verified.length + result.failed.length} skill(s)...\n`,
  )

  for (const v of result.verified) {
    console.log(`   ✅ ${v.slug} (hash match)`)
  }
  for (const f of result.failed) {
    if (f.reason === 'directory not found') {
      console.error(`   ❌ ${f.slug}: skill directory not found`)
    } else if (f.reason === 'missing source in lockfile') {
      console.error(`   ❌ ${f.slug}: missing source in lockfile`)
    } else if (f.dirs) {
      for (const d of f.dirs) {
        const changes =
          d.changes?.length > 0 ? ` (${d.changes.join(', ')})` : ''
        console.error(`   ❌ ${f.slug}: hash mismatch in ${d.dir}${changes}`)
      }
    } else {
      console.error(`   ❌ ${f.slug}: ${f.reason}`)
    }
  }

  console.log()
  if (result.allPassed) {
    console.log(
      `✅ All ${result.totalVerified} skill(s) verified successfully.`,
    )
  } else {
    console.error(`❌ Some skills failed verification.`)
    if (frozen) throw new Error('Some skills failed verification.')
  }
}
