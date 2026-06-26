import { readLock, getProjectLockPath, computeContentHash, getAgentsDir } from '../utils/lockfile.js'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

export async function verifyCommand(frozen) {
  const [globalLock, projectLock] = await Promise.all([
    readLock(),
    readLock(getProjectLockPath(process.cwd())).catch(() => ({ skills: {} })),
  ])

  const allSkills = { ...globalLock.skills }
  for (const [slug, entry] of Object.entries(projectLock.skills)) {
    if (!allSkills[slug]) allSkills[slug] = entry
  }

  const entries = Object.entries(allSkills)
  if (entries.length === 0) {
    console.log('No skills in lockfile.')
    return
  }

  let allPassed = true
  let totalChecked = 0

  console.log(`\n🔍 Verifying ${entries.length} skill(s)...\n`)

  for (const [slug, entry] of entries) {
    if (frozen && !entry.source) {
      console.error(`   ❌ ${slug}: missing source in lockfile`)
      allPassed = false
      continue
    }

    const normSlug = slug.replace(/\//g, '-')
    let installedHash = null

    const globalDir = join(getAgentsDir(), normSlug)
    try {
      const entries2 = await readdir(globalDir, { withFileTypes: true })
      const fc = {}
      for (const e of entries2) {
        if (e.isFile()) fc[e.name] = await readFile(join(globalDir, e.name), 'utf-8')
      }
      if (Object.keys(fc).length > 0) installedHash = computeContentHash(fc)
    } catch {}

    if (!installedHash) {
      const projectDir = join(process.cwd(), '.agents', 'skills', normSlug)
      try {
        const entries2 = await readdir(projectDir, { withFileTypes: true })
        const fc = {}
        for (const e of entries2) {
          if (e.isFile()) fc[e.name] = await readFile(join(projectDir, e.name), 'utf-8')
        }
        if (Object.keys(fc).length > 0) installedHash = computeContentHash(fc)
      } catch {}
    }

    if (!installedHash) {
      console.error(`   ❌ ${slug}: skill directory not found`)
      allPassed = false
      continue
    }

    totalChecked++
    if (installedHash === entry.contentSha) {
      console.log(`   ✅ ${slug} (hash match)`)
    } else {
      console.error(`   ❌ ${slug}: hash mismatch (expected ${entry.contentSha}, got ${installedHash})`)
      allPassed = false
    }
  }

  console.log()
  if (allPassed) {
    console.log(`✅ All ${totalChecked} skill(s) verified successfully.`)
  } else {
    console.error(`❌ Some skills failed verification.`)
    if (frozen) process.exit(1)
  }
}
