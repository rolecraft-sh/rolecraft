import {
  readLock,
  getProjectLockPath,
  computeContentHash,
  getAgentsDir,
} from '../utils/lockfile.js'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import agents from '../agents.js'

const agentDirMap = Object.fromEntries(agents.map((a) => [a.name, a.getDir]))

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
      const currentHash = createHash('sha256')
        .update(installedFiles[name])
        .digest('hex')
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

export async function apiVerify(cwd = process.cwd(), frozen = false) {
  const globalLock = await readLock()
  const projectLock = await readLock(getProjectLockPath(cwd)).catch(() => ({
    skills: {},
  }))

  const allSkills = { ...globalLock.skills }
  for (const [slug, entry] of Object.entries(projectLock.skills)) {
    if (!allSkills[slug]) allSkills[slug] = entry
  }

  const entries = Object.entries(allSkills)
  if (entries.length === 0) return { verified: [], failed: [], allPassed: true }

  const verified = []
  const failed = []
  let allPassed = true

  for (const [slug, entry] of entries) {
    if (frozen && !entry.source) {
      failed.push({ slug, reason: 'missing source in lockfile' })
      allPassed = false
      continue
    }

    const normSlug = slug.replace(/\//g, '-')
    const dirsToCheck = (entry.agents || [])
      .map((name) => {
        if (name === 'project') return join(cwd, '.agents', 'skills', normSlug)
        const dirFn = agentDirMap[name]
        return dirFn ? join(dirFn(), normSlug) : null
      })
      .filter(Boolean)

    if (dirsToCheck.length === 0) {
      dirsToCheck.push(
        join(getAgentsDir(), normSlug),
        join(cwd, '.agents', 'skills', normSlug),
      )
    }

    let foundAny = false
    let allMatch = true
    const dirResults = []

    for (const dir of dirsToCheck) {
      const fc = await readFilesFromDir(dir)
      if (fc === null) continue

      foundAny = true
      const hash = computeContentHash(fc)
      if (hash !== entry.contentSha) {
        const changes = findFileChanges(fc, entry.fileHashes)
        dirResults.push({
          dir,
          hash,
          expected: entry.contentSha,
          status: 'mismatch',
          changes,
        })
        allMatch = false
        allPassed = false
      } else {
        dirResults.push({ dir, hash, status: 'match' })
      }
    }

    if (!foundAny) {
      failed.push({ slug, reason: 'directory not found' })
      allPassed = false
      continue
    }

    if (allMatch) {
      verified.push({ slug, dirs: dirResults, contentSha: entry.contentSha })
    } else {
      failed.push({
        slug,
        dirs: dirResults.filter((d) => d.status !== 'match'),
      })
    }
  }

  return {
    verified,
    failed,
    allPassed,
    totalVerified: verified.length,
    totalFailed: failed.length,
  }
}
