import { readFile, readdir, stat } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { execSync as defaultExecSync, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { get as defaultHttpsGet } from 'node:https'
import { computeContentHash } from './lockfile.js'

let runExec = defaultExecSync
let runHttpsGet = defaultHttpsGet

export function setExecSync(fn) {
  runExec = fn
}

export function setHttpsGet(fn) {
  runHttpsGet = fn
}

let runSpawn = spawnSync

export function setSpawnSync(fn) {
  runSpawn = fn
}

function runGit(args, opts = {}) {
  const result = runSpawn('git', args, { stdio: 'pipe', timeout: 30000, ...opts })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const msg = result.stderr?.toString() || result.stdout?.toString() || `git exited with code ${result.status}`
    throw new Error(msg)
  }
  return result
}

function removeDir(dir) {
  const result = spawnSync('rm', ['-rf', dir], { stdio: 'pipe' })
  if (result.error) throw result.error
}

function isGitHubRef(source) {
  return /^[\w.-]+\/[\w.-]+$/.test(source) && !source.startsWith('/') && !source.startsWith('.')
}

function isLocalPath(source) {
  return source.startsWith('/') || source.startsWith('.') || source.startsWith('~')
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

function scanForSkill(dir, maxDepth = 3) {
  const results = []

  function scan(currentDir, depth = 0) {
    if (depth > maxDepth) return
    let entries
    try {
      entries = readdirSync(currentDir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name === '.git') continue
      const fullPath = join(currentDir, entry.name)
      if (entry.isDirectory()) {
        scan(fullPath, depth + 1)
      } else if (entry.name === 'SKILL.md') {
        try {
          const c = readFileSync(fullPath, 'utf-8')
          const meta = parseMetadata(c)
          results.push({ dir: dirname(fullPath), ...meta, content: c })
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  scan(dir)
  return results
}

async function resolveLocal(source) {
  const expanded = source.replace(/^~/, homedir())

  let skillDir
  try {
    const st = await stat(expanded)
    if (st.isDirectory()) {
      skillDir = expanded
    } else if (st.isFile() && basename(expanded) === 'SKILL.md') {
      skillDir = dirname(expanded)
    } else {
      throw new Error(`Source must be a SKILL.md file or a directory containing one`)
    }
  } catch (e) {
    if (e.message?.startsWith('Source must be')) throw e
    throw new Error(`Source not found: ${expanded}`)
  }

  const directPath = join(skillDir, 'SKILL.md')
  try {
    const content = await readFile(directPath, 'utf-8')
    const meta = parseMetadata(content)
    const dirEntries = await readdir(skillDir, { withFileTypes: true })
    const files = dirEntries.filter(e => e.name !== '.git').map(e => e.name)
    const fileContents = {}
    for (const f of files) {
      try { fileContents[f] = readFileSync(join(skillDir, f), 'utf-8') } catch {}
    }
    return { ...meta, content, files, fileContents, contentSha: computeContentHash(fileContents), skillDir, sourcePath: source, sourceType: 'local' }
  } catch {
    // direct SKILL.md not found, scan recursively
  }

  const found = scanForSkill(skillDir)
  if (found.length === 0) {
    throw new Error(`No SKILL.md found in ${skillDir}`)
  }

  const skill = found[0]
  const files = readdirSync(skill.dir, { withFileTypes: true })
    .filter(e => e.name !== '.git')
    .map(e => e.name)

  const fileContents = {}
  for (const f of files) {
    try { fileContents[f] = readFileSync(join(skill.dir, f), 'utf-8') } catch {}
  }

  return { ...skill, files, fileContents, contentSha: computeContentHash(fileContents), skillDir: skill.dir, sourcePath: source, sourceType: 'local' }
}

async function resolveGitHub(source) {
  const tmpDir = join(tmpdir(), `rolecraft-${randomUUID().slice(0, 8)}`)
  const url = `https://github.com/${source}.git`

  try {
    runGit(['clone', '--depth', '1', url, tmpDir])
  } catch {
    removeDir(tmpDir)
    throw new Error(`Failed to clone GitHub repo ${source}`)
  }

  try {
    const found = scanForSkill(tmpDir)

    if (found.length === 0) {
      throw new Error(`No SKILL.md found in GitHub repo ${source}`)
    }

    const skill = found[0]
    const files = readdirSync(skill.dir, { withFileTypes: true })
      .filter(e => e.name !== '.git')
      .map(e => e.name)

    const fileContents = {}
    for (const f of files) {
      try {
        fileContents[f] = readFileSync(join(skill.dir, f), 'utf-8')
      } catch {
        // skip unreadable files
      }
    }

    const owner = source.split('/')[0]
    return {
      ...skill,
      owner: skill.owner === 'local' ? owner : skill.owner,
      slug: skill.slug === 'unknown' || skill.slug === skill.name ? `${owner}/${skill.name}` : skill.slug,
      files,
      fileContents,
      contentSha: computeContentHash(fileContents),
      sourcePath: source,
      sourceType: 'github',
    }
  } finally {
    removeDir(tmpDir)
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

async function resolveGitUrl(source) {
  const tmpDir = join(tmpdir(), `rolecraft-${randomUUID().slice(0, 8)}`)
  const url = normalizeGitUrl(source)

  try {
    runGit(['clone', '--depth', '1', url, tmpDir])
  } catch {
    throw new Error(`Failed to clone repository from ${source}`)
  }

  const found = scanForSkill(tmpDir)

  if (found.length === 0) {
    removeDir(tmpDir)
    throw new Error(`No SKILL.md found in repository ${source}`)
  }

  const skill = found[0]
  const files = readdirSync(skill.dir, { withFileTypes: true })
    .filter(e => e.name !== '.git')
    .map(e => e.name)

  const fileContents = {}
  for (const f of files) {
    try { fileContents[f] = readFileSync(join(skill.dir, f), 'utf-8') } catch {}
  }

  removeDir(tmpDir)

  return {
    ...skill,
    owner: skill.owner === 'local' ? 'remote' : skill.owner,
    slug: skill.slug === 'unknown' || skill.slug === skill.name ? `remote/${skill.name}` : skill.slug,
    files,
    fileContents,
    contentSha: computeContentHash(fileContents),
    sourcePath: source,
    sourceType: 'git',
  }
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
  return new Promise((resolve, reject) => {
    const req = runHttpsGet(url, { headers: { Accept: 'application/json' } }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk.toString() })
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`npm registry returned HTTP ${res.statusCode} for ${url}`))
          return
        }
        try { resolve(JSON.parse(data)) } catch (e) { reject(new Error(`Invalid JSON from npm registry: ${e.message}`)) }
      })
      res.on('error', reject)
    })
    req.on('error', reject)
  })
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const req = runHttpsGet(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${res.statusCode}`))
        res.resume()
        return
      }
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        writeFileSync(dest, Buffer.concat(chunks))
        resolve()
      })
      res.on('error', reject)
    })
    req.on('error', reject)
  })
}

async function resolveNpm(source) {
  const { pkgName, version } = parseNpmRef(source)
  const encodedName = pkgName.replace(/\//g, '%2F')

  let metadata
  try {
    metadata = await fetchJson(`https://registry.npmjs.org/${encodedName}`)
  } catch (e) {
    throw new Error(`Failed to fetch npm package "${pkgName}": ${e.message}`)
  }

  const ver = version === 'latest' ? metadata['dist-tags']?.latest : version
  if (!ver) throw new Error(`No "latest" tag found for npm package "${pkgName}"`)

  const pkgVersionData = metadata.versions?.[ver]
  if (!pkgVersionData) throw new Error(`Version "${ver}" not found for npm package "${pkgName}"`)

  const tarballUrl = pkgVersionData.dist?.tarball
  if (!tarballUrl) throw new Error(`No tarball URL found for ${pkgName}@${ver}`)

  const tmpDir = mkdtempSync(join(tmpdir(), 'rolecraft-npm-'))
  const tarballPath = join(tmpDir, 'package.tgz')

  try {
    await downloadFile(tarballUrl, tarballPath)
    const tarResult = runSpawn('tar', ['-xzf', tarballPath, '-C', tmpDir], { stdio: 'pipe', timeout: 30000 })
    if (tarResult.error) throw tarResult.error
    if (tarResult.status !== 0) throw new Error(`tar extraction failed with code ${tarResult.status}`)
  } catch (e) {
    removeDir(tmpDir)
    throw new Error(`Failed to download/extract npm package "${pkgName}@${ver}": ${e.message}`)
  }

  let packageDir
  try {
    packageDir = join(tmpDir, 'package')
    const found = scanForSkill(packageDir)

    if (found.length === 0) {
      throw new Error(`No SKILL.md found in npm package ${pkgName}@${ver}`)
    }

    const skill = found[0]
    const files = readdirSync(skill.dir, { withFileTypes: true })
      .filter(e => e.name !== '.git')
      .map(e => e.name)

    const fileContents = {}
    for (const f of files) {
      try { fileContents[f] = readFileSync(join(skill.dir, f), 'utf-8') } catch {}
    }

    return {
      ...skill,
      owner: skill.owner === 'local' ? pkgName : skill.owner,
      slug: skill.slug === 'unknown' || skill.slug === skill.name ? `${pkgName}/${skill.name}` : skill.slug,
      files,
      fileContents,
      contentSha: computeContentHash(fileContents),
      sourcePath: source,
      sourceType: 'npm',
    }
  } finally {
    removeDir(tmpDir)
  }
}

export async function resolveSource(source) {
  if (isNpmRef(source)) {
    return await resolveNpm(source)
  }
  if (isGitHubRef(source)) {
    return await resolveGitHub(source)
  }
  if (isLocalPath(source)) {
    return await resolveLocal(source)
  }
  if (isGitUrl(source)) {
    return await resolveGitUrl(source)
  }
  throw new Error(`Invalid source: "${source}". Use a local path (./, /, ~), GitHub ref (owner/repo), git URL, or npm package (npm:package)`)
}
