import {
  readLock,
  getProjectLockPath,
  computeContentHash,
  getAgentsDir,
  normalizeSlug,
  readSkillFiles,
} from '../utils/lockfile.js'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import agents from '../agents.js'
import { assertSafeSlug } from '../utils/installer.js'
import { UserError } from '../utils/errors.js'

const agentDirMap = Object.fromEntries(agents.map((a) => [a.name, a.getDir]))

// Reads the installed directory with the same helper the resolver hashed it
// with. These two used to disagree on the file set — the resolver walked
// recursively, this did not — so any skill with a subdirectory was reported as
// a mismatch while `contentSha` had never covered those files either (#325).
async function readFilesFromDir(dir) {
  const fc = await readSkillFiles(dir)
  return Object.keys(fc).length > 0 ? fc : null
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

    const normSlug = normalizeSlug(slug)
    const candidateDirs = (entry.agents || [])
      .map((name) => {
        if (name === 'project') {
          return {
            baseDir: join(cwd, '.agents', 'skills'),
            dir: join(cwd, '.agents', 'skills', normSlug),
          }
        }
        const dirFn = agentDirMap[name]
        return dirFn ? { baseDir: dirFn(), dir: join(dirFn(), normSlug) } : null
      })
      .filter(Boolean)

    if (candidateDirs.length === 0) {
      candidateDirs.push(
        { baseDir: getAgentsDir(), dir: join(getAgentsDir(), normSlug) },
        {
          baseDir: join(cwd, '.agents', 'skills'),
          dir: join(cwd, '.agents', 'skills', normSlug),
        },
      )
    }

    let unsafeSlug = false
    const dirsToCheck = []
    for (const { baseDir, dir } of candidateDirs) {
      try {
        assertSafeSlug(slug, baseDir, join(baseDir, slug))
        assertSafeSlug(slug, baseDir, dir)
        dirsToCheck.push(dir)
      } catch (err) {
        if (err instanceof UserError && err.userCode === 'UNSAFE_SLUG') {
          unsafeSlug = true
          break
        }
        throw err
      }
    }

    if (unsafeSlug) {
      failed.push({
        slug,
        reason: `unsafe slug: refusing path traversal for "${slug}"`,
      })
      allPassed = false
      continue
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
