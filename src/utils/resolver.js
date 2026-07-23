import { readFile, readdir, stat, rm } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { Writable } from 'node:stream'
import { join, dirname, basename } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { execSync as defaultExecSync, spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { get as defaultHttpsGet } from 'node:https'
import { computeContentHash } from './lockfile.js'

let _runExec = defaultExecSync
let runHttpsGet = defaultHttpsGet

export function setExecSync(fn) {
  _runExec = fn
}

export function setHttpsGet(fn) {
  runHttpsGet = fn
}

let runSpawn = spawnSync

export function setSpawnSync(fn) {
  runSpawn = fn
}

function runGit(args, opts = {}) {
  const result = runSpawn('git', args, {
    stdio: 'pipe',
    timeout: 30000,
    ...opts,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const msg =
      result.stderr?.toString() ||
      result.stdout?.toString() ||
      `git exited with code ${result.status}`
    throw new Error(msg)
  }
  return result
}

function isGitHubRef(source) {
  return (
    /^[\w.-]+\/[\w.-]+$/.test(source) &&
    !source.startsWith('/') &&
    !source.startsWith('.')
  )
}

function isLocalPath(source) {
  return (
    source.startsWith('/') || source.startsWith('.') || source.startsWith('~')
  )
}

function parseMetadata(content) {
  let name, slug, owner, description

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (frontmatterMatch) {
    const yaml = frontmatterMatch[1]
    const nameMatch = yaml.match(/^name:\s*(.+)$/m)
    const slugMatch = yaml.match(/^slug:\s*(\S+)$/m)
    const ownerMatch = yaml.match(/^owner:\s*(\S+)$/m)
    const descMatch = yaml.match(/^description:\s*(.+)$/m)

    name = nameMatch?.[1]?.trim() || 'unknown'
    slug = slugMatch?.[1] || name
    owner = ownerMatch?.[1] || 'local'
    description = descMatch?.[1]?.trim() || undefined
  }

  if (!slug) {
    const oldSlugMatch = content.match(/^# slug:\s*(\S+)$/m)
    const oldNameMatch = content.match(/^name:\s*(\S+)$/m)
    const oldOwnerMatch = content.match(/^# owner:\s*(\S+)$/m)

    name = oldNameMatch?.[1] || oldSlugMatch?.[1]?.split('/')?.[1] || 'unknown'
    slug = oldSlugMatch?.[1] || name
    owner = oldOwnerMatch?.[1] || 'local'
  }

  return { name, slug, owner, description }
}

async function readFileContents(skillDir) {
  let entries
  try {
    entries = await readdir(skillDir, { withFileTypes: true })
  } catch {
    return {}
  }
  const files = entries.filter((e) => e.name !== '.git').map((e) => e.name)
  const fileContents = {}
  for (const f of files) {
    try {
      fileContents[f] = await readFile(join(skillDir, f), 'utf-8')
    } catch {}
  }
  return fileContents
}

async function enrichSkill(found) {
  const fileContents = await readFileContents(found.dir)
  const files = Object.keys(fileContents)
  return {
    name: found.name,
    slug: found.slug,
    owner: found.owner,
    description: found.description,
    content: found.content,
    files,
    fileContents,
    contentSha: computeContentHash(fileContents),
    skillDir: found.dir,
  }
}

async function scanForSkill(dir, maxDepth = 3) {
  const results = []
  const seenDirs = new Set()

  async function tryAddSkill(skillDir) {
    if (seenDirs.has(skillDir)) return
    const skillPath = join(skillDir, 'SKILL.md')
    try {
      const c = await readFile(skillPath, 'utf-8')
      const meta = parseMetadata(c)
      seenDirs.add(skillDir)
      results.push({ dir: skillDir, ...meta, content: c })
    } catch {
      // skip unreadable or missing files
    }
  }

  const containerCandidates = [
    join(dir, 'skills'),
    join(dir, '.agents', 'skills'),
    join(dir, '.claude', 'skills'),
    join(dir, '.cursor', 'skills'),
  ]

  for (const containerDir of containerCandidates) {
    let entries
    try {
      entries = await readdir(containerDir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === '.git') continue
      const skillDir = join(containerDir, entry.name)
      await tryAddSkill(skillDir)
      if (!seenDirs.has(skillDir)) {
        let subEntries
        try {
          subEntries = await readdir(skillDir, { withFileTypes: true })
        } catch {
          continue
        }
        for (const sub of subEntries) {
          if (!sub.isDirectory() || sub.name === '.git') continue
          await tryAddSkill(join(skillDir, sub.name))
        }
      }
    }
  }

  async function scan(currentDir, depth = 0) {
    if (depth > maxDepth) return
    let entries
    try {
      entries = await readdir(currentDir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name === '.git') continue
      const fullPath = join(currentDir, entry.name)
      if (entry.isDirectory()) {
        await scan(fullPath, depth + 1)
      } else if (entry.name === 'SKILL.md') {
        const skillDir = dirname(fullPath)
        if (!seenDirs.has(skillDir)) {
          try {
            const c = await readFile(fullPath, 'utf-8')
            const meta = parseMetadata(c)
            seenDirs.add(skillDir)
            results.push({ dir: skillDir, ...meta, content: c })
          } catch {
            // skip unreadable files
          }
        }
      }
    }
  }

  await scan(dir)
  return results
}

async function resolveLocalInternal(source) {
  const expanded = source.replace(/^~/, homedir())

  let skillDir
  try {
    const st = await stat(expanded)
    if (st.isDirectory()) {
      skillDir = expanded
    } else if (st.isFile() && basename(expanded) === 'SKILL.md') {
      skillDir = dirname(expanded)
    } else {
      throw new Error(
        `Source must be a SKILL.md file or a directory containing one`,
      )
    }
  } catch (e) {
    if (e.message?.startsWith('Source must be')) throw e
    throw new Error(`Source not found: ${expanded}`)
  }

  const directPath = join(skillDir, 'SKILL.md')
  try {
    const content = await readFile(directPath, 'utf-8')
    const meta = parseMetadata(content)
    const fileContents = await readFileContents(skillDir)
    const files = Object.keys(fileContents)
    return {
      skills: [
        {
          ...meta,
          content,
          files,
          fileContents,
          contentSha: computeContentHash(fileContents),
          skillDir,
        },
      ],
      sourcePath: source,
      sourceType: 'local',
    }
  } catch {
    // direct SKILL.md not found, scan recursively
  }

  const found = await scanForSkill(skillDir)
  if (found.length === 0) {
    throw new Error(`No SKILL.md found in ${skillDir}`)
  }

  const enriched = await Promise.all(found.map(enrichSkill))
  return { skills: enriched, sourcePath: source, sourceType: 'local' }
}

async function resolveGitHubInternal(source) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'rolecraft-gh-'))
  const url = `https://github.com/${source}.git`

  try {
    runGit(['clone', '--depth', '1', url, tmpDir])
  } catch {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    throw new Error(`Failed to clone GitHub repo ${source}`)
  }

  try {
    const found = await scanForSkill(tmpDir)

    if (found.length === 0) {
      throw new Error(`No SKILL.md found in GitHub repo ${source}`)
    }

    const owner = source.split('/')[0]
    const enriched = await Promise.all(
      found.map(async (f) => {
        const e = await enrichSkill(f)
        return {
          ...e,
          owner: e.owner === 'local' ? owner : e.owner,
          slug:
            e.slug === 'unknown' || e.slug === e.name
              ? `${owner}/${e.name}`
              : e.slug,
        }
      }),
    )
    return { skills: enriched, sourcePath: source, sourceType: 'github' }
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

function isGitUrl(source) {
  if (/^https?:\/\/(gitlab|bitbucket)\.com\//.test(source)) return true
  if (/^git@[\w.-]+:[\w.-]+\/[\w.-]+(\.git)?$/.test(source)) return true
  if (/^https?:\/\/[\w.-]+\/[\w.-]+\/[\w.-]+(\.git)?$/.test(source)) return true
  return false
}

function normalizeGitUrl(source) {
  if (/^git@/.test(source)) {
    return source.replace(/^git@([^:]+):/, 'https://$1/')
  }
  return source
}

async function resolveGitUrlInternal(source) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'rolecraft-git-'))
  const url = normalizeGitUrl(source)

  try {
    runGit(['clone', '--depth', '1', url, tmpDir])
  } catch {
    throw new Error(`Failed to clone repository from ${source}`)
  }

  const found = await scanForSkill(tmpDir)

  if (found.length === 0) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    throw new Error(`No SKILL.md found in repository ${source}`)
  }

  const enriched = await Promise.all(
    found.map(async (f) => {
      const e = await enrichSkill(f)
      return {
        ...e,
        owner: e.owner === 'local' ? 'remote' : e.owner,
        slug:
          e.slug === 'unknown' || e.slug === e.name
            ? `remote/${e.name}`
            : e.slug,
      }
    }),
  )

  await rm(tmpDir, { recursive: true, force: true }).catch(() => {})

  return { skills: enriched, sourcePath: source, sourceType: 'git' }
}

function isNpmRef(source) {
  return source.startsWith('npm:')
}

function parseNpmRef(source) {
  const npmPart = source.slice(4)
  if (!npmPart) throw new Error(`Invalid npm reference: "${source}"`)
  let pkgName, version

  if (npmPart.startsWith('@')) {
    const slashIdx = npmPart.indexOf('/')
    if (slashIdx === -1) throw new Error(`Invalid npm reference: "${source}"`)
    const rest = npmPart.slice(slashIdx + 1)
    const atIdx = rest.indexOf('@')
    if (atIdx > 0) {
      pkgName = npmPart.slice(0, slashIdx + 1 + atIdx)
      version = rest.slice(atIdx + 1)
    } else {
      pkgName = npmPart
      version = 'latest'
    }
  } else {
    const atIdx = npmPart.lastIndexOf('@')
    if (atIdx > 0) {
      pkgName = npmPart.slice(0, atIdx)
      version = npmPart.slice(atIdx + 1)
    } else {
      pkgName = npmPart
      version = 'latest'
    }
  }

  return { pkgName, version }
}

function fetchJson(url) {
  const parsed = new URL(url)
  if (
    !parsed.hostname.endsWith('.npmjs.org') &&
    parsed.hostname !== 'npmjs.org'
  ) {
    throw new Error(`Fetch not allowed from ${parsed.hostname}`)
  }
  const safeUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`
  return new Promise((resolve, reject) => {
    const req = runHttpsGet(
      safeUrl,
      { headers: { Accept: 'application/json' } },
      (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk.toString()
        })
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(
              new Error(
                `npm registry returned HTTP ${res.statusCode} for ${safeUrl}`,
              ),
            )
            return
          }
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(new Error(`Invalid JSON from npm registry: ${e.message}`))
          }
        })
        res.on('error', reject)
      },
    )
    req.on('error', reject)
  })
}

async function downloadFile(url, dest) {
  const parsed = new URL(url)
  if (parsed.hostname !== 'registry.npmjs.org') {
    throw new Error(`Download not allowed from ${parsed.hostname}`)
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: HTTP ${response.status}`)
  }

  const fileStream = createWriteStream(dest)
  const writable = Writable.toWeb(fileStream)
  await response.body.pipeTo(writable)
}

async function resolveNpmInternal(source) {
  const { pkgName, version } = parseNpmRef(source)
  const encodedName = pkgName.replace(/\//g, '%2F')

  let metadata
  try {
    metadata = await fetchJson(`https://registry.npmjs.org/${encodedName}`)
  } catch (e) {
    throw new Error(`Failed to fetch npm package "${pkgName}": ${e.message}`)
  }

  const ver = version === 'latest' ? metadata['dist-tags']?.latest : version
  if (!ver)
    throw new Error(`No "latest" tag found for npm package "${pkgName}"`)

  const pkgVersionData = metadata.versions?.[ver]
  if (!pkgVersionData)
    throw new Error(`Version "${ver}" not found for npm package "${pkgName}"`)

  const tarballUrl = pkgVersionData.dist?.tarball
  if (!tarballUrl) throw new Error(`No tarball URL found for ${pkgName}@${ver}`)

  const tmpDir = mkdtempSync(join(tmpdir(), 'rolecraft-npm-'))
  const tarballPath = join(tmpDir, 'package.tgz')

  try {
    await downloadFile(tarballUrl, tarballPath)
    const tarResult = runSpawn('tar', ['-xzf', tarballPath, '-C', tmpDir], {
      stdio: 'pipe',
      timeout: 30000,
    })
    if (tarResult.error) throw tarResult.error
    if (tarResult.status !== 0)
      throw new Error(`tar extraction failed with code ${tarResult.status}`)
  } catch (e) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    throw new Error(
      `Failed to download/extract npm package "${pkgName}@${ver}": ${e.message}`,
    )
  }

  let packageDir
  try {
    packageDir = join(tmpDir, 'package')
    const found = await scanForSkill(packageDir)

    if (found.length === 0) {
      throw new Error(`No SKILL.md found in npm package ${pkgName}@${ver}`)
    }

    const enriched = await Promise.all(
      found.map(async (f) => {
        const e = await enrichSkill(f)
        return {
          ...e,
          owner: e.owner === 'local' ? pkgName : e.owner,
          slug:
            e.slug === 'unknown' || e.slug === e.name
              ? `${pkgName}/${e.name}`
              : e.slug,
        }
      }),
    )
    return { skills: enriched, sourcePath: source, sourceType: 'npm' }
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

function pickFirst({ skills, sourcePath, sourceType }) {
  if (skills.length === 0) {
    throw new Error('No skills found')
  }
  return { ...skills[0], sourcePath, sourceType }
}

async function resolveAll(source) {
  if (isNpmRef(source)) {
    return await resolveNpmInternal(source)
  }
  if (isGitHubRef(source)) {
    return await resolveGitHubInternal(source)
  }
  if (isLocalPath(source)) {
    return await resolveLocalInternal(source)
  }
  if (isGitUrl(source)) {
    return await resolveGitUrlInternal(source)
  }
  throw new Error(
    `Invalid source: "${source}". Use a local path (./, /, ~), GitHub ref (owner/repo), git URL, or npm package (npm:package)`,
  )
}

export async function resolveSource(source) {
  const result = await resolveAll(source)
  return pickFirst(result)
}

export async function resolveSkills(source) {
  const result = await resolveAll(source)
  return result.skills.map((s) => ({
    ...s,
    sourcePath: result.sourcePath,
    sourceType: result.sourceType,
  }))
}
