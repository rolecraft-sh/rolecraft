import { readFile, readdir, stat } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'

function isGitHubRef(source) {
  return /^[\w.-]+\/[\w.-]+$/.test(source) && !source.startsWith('/') && !source.startsWith('.')
}

function isLocalPath(source) {
  return source.startsWith('/') || source.startsWith('.') || source.startsWith('~')
}

function parseMetadata(content) {
  const slugMatch = content.match(/^# slug:\s*(\S+)$/m)
  const nameMatch = content.match(/^name:\s*(\S+)$/m)
  const ownerMatch = content.match(/^# owner:\s*(\S+)$/m)

  const name = nameMatch?.[1] || slugMatch?.[1]?.split('/')?.[1] || 'unknown'
  const slug = slugMatch?.[1] || name
  const owner = ownerMatch?.[1] || 'local'

  return { name, slug, owner }
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
  const st = await stat(expanded)

  let skillDir
  if (st.isDirectory()) {
    skillDir = expanded
  } else if (st.isFile() && basename(expanded) === 'SKILL.md') {
    skillDir = dirname(expanded)
  } else {
    throw new Error(`Source must be a SKILL.md file or a directory containing one`)
  }

  const directPath = join(skillDir, 'SKILL.md')
  try {
    await stat(directPath)
    const content = await readFile(directPath, 'utf-8')
    const meta = parseMetadata(content)
    const dirEntries = await readdir(skillDir, { withFileTypes: true })
    const files = dirEntries.filter(e => e.name !== '.git').map(e => e.name)
    return { ...meta, content, files, skillDir, sourcePath: source, sourceType: 'local' }
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

  return { ...skill, files, skillDir: skill.dir, sourcePath: source, sourceType: 'local' }
}

async function resolveGitHub(source) {
  const tmpDir = join(tmpdir(), `rolecraft-${randomUUID().slice(0, 8)}`)
  const url = `https://github.com/${source}.git`

  try {
    execSync(`git clone --depth 1 "${url}" "${tmpDir}"`, { stdio: 'pipe', timeout: 30000 })
  } catch {
    throw new Error(`Failed to clone GitHub repo ${source}`)
  }

  const found = scanForSkill(tmpDir)

  if (found.length === 0) {
    execSync(`rm -rf "${tmpDir}"`)
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

  execSync(`rm -rf "${tmpDir}"`)

  const owner = source.split('/')[0]
  return {
    ...skill,
    owner: skill.owner === 'local' ? owner : skill.owner,
    slug: skill.slug === 'unknown' || skill.slug === skill.name ? `${owner}/${skill.name}` : skill.slug,
    files,
    fileContents,
    sourcePath: source,
    sourceType: 'github',
  }
}

export async function resolveSource(source) {
  if (isGitHubRef(source)) {
    return await resolveGitHub(source)
  }
  if (isLocalPath(source)) {
    return await resolveLocal(source)
  }
  throw new Error(`Invalid source: "${source}". Use a local path (./, /, ~) or GitHub ref (owner/repo)`)
}
