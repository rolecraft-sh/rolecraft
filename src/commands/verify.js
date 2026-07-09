import { readLock, getProjectLockPath, computeContentHash, getAgentsDir } from '../utils/lockfile.js'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import agents from '../agents.js'

const agentDirMap = Object.fromEntries(
  agents.map(a => [a.name, a.getDir])
)

async function readFilesFromDir(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const fc = {}
    for (const e of entries) {
      if (e.isFile()) fc[e.name] = await readFile(join(dir, e.name), 'utf-8')
    }
    return Object.keys(fc).length > 0 ? fc : null
  } catch {}
  return null
}

function findFileChanges(installedFiles, expectedHashes) {
  const changes = []
  const expectedFiles = expectedHashes ? Object.keys(expectedHashes) : []
  const installedNames = Object.keys(installedFiles)

  for (const name of installedNames) {
    if (expectedHashes && expectedHashes[name] !== undefined) {
      const currentHash = createHash('sha256').update(installedFiles[name]).digest('hex')
      if (currentHash !== expectedHashes[name]) {
        changes.push(`modified: ${name}`)
      }
    } else {
      changes.push(`added: ${name}`)
    }
  }

  for (const name of expectedFiles) {
    if (!installedNames.includes(name)) {
      changes.push(`missing: ${name}`)
    }
  }

  return changes
}

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
    const dirsToCheck = (entry.agents || []).map(name => {
      if (name === 'project') return join(process.cwd(), '.agents', 'skills', normSlug)
      const dirFn = agentDirMap[name]
      return dirFn ? join(dirFn(), normSlug) : null
    }).filter(Boolean)

    if (dirsToCheck.length === 0) {
      dirsToCheck.push(
        join(getAgentsDir(), normSlug),
        join(process.cwd(), '.agents', 'skills', normSlug),
      )
    }

    let foundAny = false
    let allMatch = true

    for (const dir of dirsToCheck) {
      const fc = await readFilesFromDir(dir)
      if (fc === null) continue

      foundAny = true
      const hash = computeContentHash(fc)
      if (hash !== entry.contentSha) {
        const changes = findFileChanges(fc, entry.fileHashes)
        const detail = changes.length > 0 ? ` (${changes.join(', ')})` : ''
        console.error(`   ❌ ${slug}: hash mismatch in ${dir}${detail}`)
        allMatch = false
        allPassed = false
      }
    }

    if (!foundAny) {
      console.error(`   ❌ ${slug}: skill directory not found`)
      allPassed = false
      continue
    }

    if (allMatch) {
      totalChecked++
      console.log(`   ✅ ${slug} (hash match)`)
    }
  }

  console.log()
  if (allPassed) {
    console.log(`✅ All ${totalChecked} skill(s) verified successfully.`)
  } else {
    console.error(`❌ Some skills failed verification.`)
    if (frozen) throw new Error('Some skills failed verification.')
  }
}
