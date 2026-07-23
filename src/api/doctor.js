import {
  accessSync,
  constants,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { homedir, platform, release } from 'node:os'
import {
  readLock,
  getProjectLockPath,
  getAgentsDir,
  computeContentHash,
} from '../utils/lockfile.js'
import { detectAgents } from '../commands/setup.js'
import { parseFrontmatter } from '../utils/converter.js'
import agents from '../agents.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'),
)

function dirSize(dirPath) {
  try {
    let total = 0
    const entries = readdirSync(dirPath, { withFileTypes: true })
    for (const e of entries) {
      const full = join(dirPath, e.name)
      if (e.isDirectory()) total += dirSize(full)
      else if (e.isFile()) total += statSync(full).size
      else if (e.isSymbolicLink()) {
        try {
          total += statSync(full).size
        } catch {}
      }
    }
    return total
  } catch {
    return 0
  }
}

function countBrokenSymlinks(dirPath) {
  let count = 0
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })
    for (const e of entries) {
      const full = join(dirPath, e.name)
      if (e.isDirectory()) count += countBrokenSymlinks(full)
      else if (e.isSymbolicLink()) {
        try {
          accessSync(full, constants.F_OK)
        } catch {
          count++
        }
      }
    }
  } catch {}
  return count
}

function validateLockfileSchema(lock) {
  if (typeof lock !== 'object' || lock === null) return 'not an object'
  if (typeof lock.version !== 'number') return 'version missing or not a number'
  if (typeof lock.skills !== 'object' || lock.skills === null)
    return 'skills missing or not an object'
  for (const [slug, entry] of Object.entries(lock.skills)) {
    if (typeof entry !== 'object' || entry === null)
      return `entry "${slug}" is not an object`
  }
  return null
}

const KNOWN_MCP_COMMANDS = [
  'npx',
  'node',
  'uvx',
  'pipx',
  'go',
  'deno',
  'cargo',
  'python3',
  'python',
]

function commandExists(cmd) {
  try {
    execSync(`which ${cmd} 2>/dev/null || command -v ${cmd} 2>/dev/null`, {
      stdio: 'pipe',
    })
    return true
  } catch {
    return false
  }
}

function validateMcpServers(detected) {
  const seenPaths = new Set()
  const results = []

  for (const agent of agents) {
    if (!agent.mcp || !detected.some((d) => d.flag === agent.flag)) continue
    const configPath = agent.mcp.getPath()
    if (seenPaths.has(configPath)) {
      results.push({
        agent: agent.flag,
        configPath,
        status: 'pass',
        detail: 'shared config (already validated)',
      })
      continue
    }
    seenPaths.add(configPath)

    let raw, data
    try {
      raw = readFileSync(configPath, 'utf-8')
    } catch {
      results.push({
        agent: agent.flag,
        configPath,
        status: 'warn',
        detail: 'config file not found',
      })
      continue
    }
    try {
      data = JSON.parse(raw)
    } catch {
      results.push({
        agent: agent.flag,
        configPath,
        status: 'error',
        detail: 'invalid JSON',
      })
      continue
    }

    let entries = []
    let format = 'mcpServers'

    if (Array.isArray(data.experimental?.mcpServers)) {
      entries = data.experimental.mcpServers
      format = 'experimental.mcpServers (Continue)'
    } else if (data.servers && typeof data.servers === 'object') {
      entries = Object.entries(data.servers).map(([name, s]) => ({
        name,
        ...s,
      }))
      format = 'servers (Copilot)'
    } else if (data.mcpServers && typeof data.mcpServers === 'object') {
      entries = Object.entries(data.mcpServers).map(([name, s]) => ({
        name,
        ...s,
      }))
      format = 'mcpServers (standard)'
    }

    if (entries.length === 0) {
      results.push({
        agent: agent.flag,
        configPath,
        status: 'warn',
        detail: `no MCP servers configured (${format})`,
      })
      continue
    }

    let errors = 0
    let warnings = 0
    const issues = []

    for (const entry of entries) {
      const name = entry.name || '(unnamed)'
      if (!entry.command) {
        issues.push({ name, issue: 'missing command field' })
        errors++
        continue
      }
      if (KNOWN_MCP_COMMANDS.includes(entry.command)) {
        if (!commandExists(entry.command)) {
          issues.push({
            name,
            issue: `command "${entry.command}" not found in PATH`,
          })
          errors++
          continue
        }
      }
      if (entry.command === 'node' && entry.args && entry.args.length > 0) {
        for (const arg of entry.args) {
          if (
            arg.startsWith('/') ||
            arg.startsWith('./') ||
            arg.startsWith('~')
          ) {
            const resolvedPath = arg.startsWith('~')
              ? join(homedir(), arg.slice(1))
              : arg
            try {
              accessSync(resolvedPath, constants.F_OK)
            } catch {
              issues.push({ name, issue: `file not found: ${arg}` })
              warnings++
            }
          }
        }
      }
    }

    const totalEntries = entries.length
    const healthyEntries = totalEntries - errors
    if (errors > 0) {
      results.push({
        agent: agent.flag,
        configPath,
        status: 'error',
        detail: `${healthyEntries}/${totalEntries} server(s) OK, ${errors} error(s)`,
        issues,
      })
    } else if (warnings > 0) {
      results.push({
        agent: agent.flag,
        configPath,
        status: 'warn',
        detail: `${healthyEntries}/${totalEntries} server(s) OK, ${warnings} warning(s)`,
        issues,
      })
    } else {
      results.push({
        agent: agent.flag,
        configPath,
        status: 'pass',
        detail: `${totalEntries} server(s) OK`,
      })
    }
  }

  return results
}

function countAgentSkills(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter(
      (e) => e.isDirectory() && !e.name.startsWith('.'),
    ).length
  } catch {
    return 0
  }
}

function splitSections(body) {
  const lines = body.split('\n')
  const sections = []
  let current = null
  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)/)
    if (headingMatch) {
      if (current) sections.push(current)
      current = { heading: headingMatch[1].trim(), lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}

function parseSkillContent(skillDir) {
  const skillPath = join(skillDir, 'SKILL.md')
  try {
    const raw = readFileSync(skillPath, 'utf-8')
    const { attrs, body } = parseFrontmatter(raw)
    const sections = splitSections(body)
    return { attrs, sections }
  } catch {
    return null
  }
}

function detectSkillConflicts(allSkills, agentsDir, cwd) {
  const skills = {}
  for (const slug of Object.keys(allSkills)) {
    const normSlug = slug.replace(/\//g, '-')
    const searchDirs = [
      join(agentsDir, normSlug),
      join(cwd, '.agents', 'skills', normSlug),
    ]
    const existingDir = searchDirs.find((d) => {
      try {
        accessSync(d, constants.F_OK)
        return true
      } catch {
        return false
      }
    })
    if (!existingDir) continue
    const parsed = parseSkillContent(existingDir)
    if (parsed) skills[slug] = parsed
  }

  const conflicts = []
  const slugs = Object.keys(skills)
  if (slugs.length < 2) return conflicts

  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const a = slugs[i]
      const b = slugs[j]
      const skillA = skills[a]
      const skillB = skills[b]
      const sectionsA = new Map(skillA.sections.map((s) => [s.heading, s]))
      const sectionsB = new Map(skillB.sections.map((s) => [s.heading, s]))

      const pairConflicts = []

      for (const [heading, secA] of sectionsA) {
        if (!sectionsB.has(heading)) continue
        const secB = sectionsB.get(heading)
        const setA = new Set(secA.lines.filter((l) => l.trim()))
        const setB = new Set(secB.lines.filter((l) => l.trim()))
        const diffA = [...setA].filter((l) => !setB.has(l))
        const diffB = [...setB].filter((l) => !setA.has(l))
        if (diffA.length === 0 && diffB.length === 0) continue
        pairConflicts.push({
          heading,
          a: diffA.slice(0, 3),
          b: diffB.slice(0, 3),
        })
      }

      if (pairConflicts.length > 0) {
        conflicts.push({ a, b, sections: pairConflicts })
      }
    }
  }

  return conflicts
}

export async function apiDoctor(cwd = process.cwd(), options = {}) {
  const checks = []
  let passed = 0
  let warnings = 0
  let errors = 0

  function checked(label, status, detail = '') {
    checks.push({ label, status, detail })
    if (status === 'pass') passed++
    else if (status === 'warn') warnings++
    else errors++
  }

  checked('Node.js version', 'pass', `v${process.versions.node}`)
  const [major] = process.versions.node.split('.').map(Number)
  if (major < 20) {
    checked('Node.js compatibility', 'error', '>= 20 required, please upgrade')
  }

  try {
    execSync('git --version', { stdio: 'ignore' })
    checked('Git availability', 'pass', 'detected')
  } catch {
    checked('Git availability', 'warn', 'not found (needed for GitHub sources)')
  }

  try {
    execSync('npm --version', { stdio: 'ignore' })
    checked('npm availability', 'pass', 'detected')
  } catch {
    checked('npm availability', 'warn', 'not found (needed for npm sources)')
  }

  checked('rolecraft version', 'pass', `v${pkg.version}`)
  checked('Node.js location', 'pass', process.execPath)
  checked('Platform', 'pass', `${platform()} ${release()}`)
  checked('Home directory', 'pass', process.env.HOME || homedir())

  const home = process.env.HOME || homedir()
  const agentsDir = join(home, '.agents')
  try {
    accessSync(agentsDir, constants.F_OK)
    checked('~/.agents directory', 'pass', agentsDir)
  } catch {
    checked('~/.agents directory', 'warn', 'not yet created')
  }

  const globalLock = await readLock()
  const globalSkillCount = Object.keys(globalLock.skills).length
  const schemaErr = validateLockfileSchema(globalLock)

  if (schemaErr) checked('Global lockfile schema', 'error', schemaErr)
  else
    checked('Global lockfile schema', 'pass', `v${globalLock.version}, valid`)

  if (globalSkillCount > 0)
    checked('Global lockfile', 'pass', `${globalSkillCount} skill(s) tracked`)
  else checked('Global lockfile', 'warn', 'no global skills')

  const projectLock = await readLock(getProjectLockPath(cwd)).catch(() => null)
  const projectSkillCount = projectLock
    ? Object.keys(projectLock.skills).length
    : 0
  if (projectSkillCount > 0)
    checked('Project lockfile', 'pass', `${projectSkillCount} skill(s) tracked`)
  else checked('Project lockfile', 'warn', 'no project skills')

  const skillDirs = [
    getAgentsDir(),
    ...[projectSkillCount > 0 ? join(cwd, '.agents', 'skills') : []],
  ]
  let totalSize = 0
  let totalSkillDirs = 0
  for (const d of skillDirs) {
    try {
      const entries = readdirSync(d, { withFileTypes: true })
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith('.')) {
          totalSkillDirs++
          totalSize += dirSize(join(d, e.name))
        }
      }
    } catch {}
  }
  if (totalSkillDirs > 0 || globalSkillCount > 0 || projectSkillCount > 0)
    checked(
      'Disk usage',
      'pass',
      `${totalSkillDirs} skill(s), ${formatBytes(totalSize)} total`,
    )
  else checked('Disk usage', 'warn', 'no skills installed')

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const detected = detectAgents()
  const totalAgents = agents.length
  const detectedResults = []

  if (detected.length > 0) {
    checked(
      'Agent detection',
      'pass',
      `${detected.length}/${totalAgents} supported agents detected`,
    )
    for (const agent of detected) {
      const dir = agent.dir()
      const skillCount = countAgentSkills(dir)
      detectedResults.push({
        flag: agent.flag,
        label: agent.label,
        dir,
        skillCount,
      })
    }
  } else {
    checked('Agent detection', 'warn', 'no supported agents detected')
  }

  const allLockSlugs = new Set(Object.keys(globalLock.skills))
  if (projectLock)
    for (const slug of Object.keys(projectLock.skills)) allLockSlugs.add(slug)

  let orphanedDirs = 0
  try {
    const entries = readdirSync(getAgentsDir(), { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.')) {
        const normSlug =
          allLockSlugs.has(e.name) ||
          allLockSlugs.has(e.name.replace(/-/g, '/'))
        if (!normSlug) orphanedDirs++
      }
    }
  } catch {}
  if (orphanedDirs > 0)
    checked(
      'Orphaned skill dirs',
      'warn',
      `${orphanedDirs} director(ies) not in any lockfile`,
    )
  else checked('Orphaned skill dirs', 'pass', 'none')

  const allSkills = { ...globalLock.skills }
  if (projectLock)
    for (const [slug, entry] of Object.entries(projectLock.skills))
      allSkills[slug] = entry

  let missingDirs = 0
  let hashMismatches = 0
  let verifiedSkills = 0
  let brokenSymlinks = 0

  for (const [slug, entry] of Object.entries(allSkills)) {
    const normSlug = slug.replace(/\//g, '-')
    const searchDirs = [
      join(getAgentsDir(), normSlug),
      join(cwd, '.agents', 'skills', normSlug),
    ]
    const existingDir = searchDirs.find((d) => {
      try {
        accessSync(d, constants.F_OK)
        return true
      } catch {
        return false
      }
    })
    if (!existingDir) {
      missingDirs++
      continue
    }
    brokenSymlinks += countBrokenSymlinks(existingDir)
    if (entry.contentSha) {
      try {
        const files = readdirSync(existingDir).filter((f) => f.endsWith('.md'))
        const fc = {}
        for (const f of files)
          fc[f] = readFileSync(join(existingDir, f), 'utf-8')
        const hash = computeContentHash(fc)
        if (hash !== entry.contentSha) hashMismatches++
        verifiedSkills++
      } catch {
        hashMismatches++
      }
    } else verifiedSkills++
  }

  if (Object.keys(allSkills).length > 0) {
    const integrityIssues = hashMismatches + missingDirs + brokenSymlinks > 0
    let detail = `${verifiedSkills} checked`
    if (hashMismatches > 0) detail += `, ${hashMismatches} hash mismatch(es)`
    if (missingDirs > 0) detail += `, ${missingDirs} missing director(ies)`
    if (brokenSymlinks > 0) detail += `, ${brokenSymlinks} broken symlink(s)`
    checked('Skill integrity', integrityIssues ? 'warn' : 'pass', detail)
  } else checked('Skill integrity', 'warn', 'no skills to verify')

  const mcpResults = validateMcpServers(detected)
  const mcpPass = mcpResults.filter((r) => r.status === 'pass').length
  const mcpWarn = mcpResults.filter((r) => r.status === 'warn').length
  const mcpError = mcpResults.filter((r) => r.status === 'error').length
  const totalMcp = mcpResults.length

  if (mcpPass > 0 || mcpWarn > 0) {
    const detail = `${mcpPass} ok, ${mcpWarn} warning(s), ${mcpError} error(s) across ${totalMcp} agent(s)`
    checked('MCP configs', mcpError > 0 ? 'warn' : 'pass', detail)
  } else if (mcpError > 0) {
    checked('MCP configs', 'error', `${mcpError} agent(s) with broken config`)
  } else {
    checked('MCP servers', 'warn', 'none configured')
  }

  if (options.network) {
    try {
      const resp = await fetch('https://github.com', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      checked(
        'Network (GitHub)',
        resp.ok ? 'pass' : 'warn',
        `HTTP ${resp.status}`,
      )
    } catch {
      checked('Network (GitHub)', 'warn', 'unreachable')
    }
  }

  let skillConflicts = []
  if (options.deep) {
    const allSkills = { ...globalLock.skills }
    if (projectLock)
      for (const [slug, entry] of Object.entries(projectLock.skills))
        allSkills[slug] = entry

    skillConflicts = detectSkillConflicts(allSkills, getAgentsDir(), cwd)
    if (skillConflicts.length > 0)
      checked(
        'Conflict detection',
        'warn',
        `${skillConflicts.length} conflict(s) found among ${Object.keys(allSkills).length} skill(s)`,
      )
    else
      checked(
        'Conflict detection',
        'pass',
        `${Object.keys(allSkills).length} skill(s) checked, no conflicts`,
      )
  }

  const status =
    errors > 0 ? 'unhealthy' : warnings > 0 ? 'degraded' : 'healthy'
  const total = passed + warnings + errors

  return {
    status,
    checks,
    summary: { passed, warnings, errors, total },
    agents: detectedResults,
    mcp: mcpResults,
    skills: {
      global: globalSkillCount,
      project: projectSkillCount,
      orphaned: orphanedDirs,
      missingDirs,
      hashMismatches,
      verified: verifiedSkills,
      brokenSymlinks,
    },
    conflicts: skillConflicts,
  }
}
