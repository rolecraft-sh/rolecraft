import { accessSync, constants, readFileSync, readdirSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { homedir, platform, release } from 'node:os'
import { readLock, getProjectLockPath, getAgentsDir } from '../utils/lockfile.js'
import { detectAgents } from './setup.js'
import agents from '../agents.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'))

function icon(status) {
  return status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌'
}

function permString(dir) {
  try {
    const s = statSync(dir)
    const mode = s.mode & parseInt('777', 8)
    const r = (mode & 4) ? 'r' : '-'
    const w = (mode & 2) ? 'w' : '-'
    const x = (mode & 1) ? 'x' : '-'
    return `${r}${w}${x}`
  } catch {
    return '---'
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function dirSize(dirPath) {
  try {
    let total = 0
    const entries = readdirSync(dirPath, { withFileTypes: true })
    for (const e of entries) {
      const full = join(dirPath, e.name)
      if (e.isDirectory()) {
        total += dirSize(full)
      } else if (e.isFile()) {
        total += statSync(full).size
      } else if (e.isSymbolicLink()) {
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
      if (e.isDirectory()) {
        count += countBrokenSymlinks(full)
      } else if (e.isSymbolicLink()) {
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
  if (typeof lock.skills !== 'object' || lock.skills === null) return 'skills missing or not an object'
  for (const [slug, entry] of Object.entries(lock.skills)) {
    if (typeof entry !== 'object' || entry === null) return `entry "${slug}" is not an object`
  }
  return null
}

const KNOWN_MCP_COMMANDS = ['npx', 'node', 'uvx', 'pipx', 'go', 'deno', 'cargo', 'python3', 'python']

function commandExists(cmd) {
  try {
    execSync(`which ${cmd} 2>/dev/null || command -v ${cmd} 2>/dev/null`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function validateMcpServers(detected) {
  const seenPaths = new Set()
  const results = []

  for (const agent of agents) {
    if (!agent.mcp || !detected.some(d => d.flag === agent.flag)) continue

    const configPath = agent.mcp.getPath()
    if (seenPaths.has(configPath)) {
      results.push({ agent: agent.flag, configPath, status: 'pass', detail: 'shared config (already validated)' })
      continue
    }
    seenPaths.add(configPath)

    let raw, data
    try {
      raw = readFileSync(configPath, 'utf-8')
    } catch {
      results.push({ agent: agent.flag, configPath, status: 'warn', detail: 'config file not found' })
      continue
    }

    try {
      data = JSON.parse(raw)
    } catch {
      results.push({ agent: agent.flag, configPath, status: 'error', detail: 'invalid JSON' })
      continue
    }

    let entries = []
    let format = 'mcpServers'

    if (Array.isArray(data.experimental?.mcpServers)) {
      entries = data.experimental.mcpServers
      format = 'experimental.mcpServers (Continue)'
    } else if (data.servers && typeof data.servers === 'object') {
      entries = Object.entries(data.servers).map(([name, s]) => ({ name, ...s }))
      format = 'servers (Copilot)'
    } else if (data.mcpServers && typeof data.mcpServers === 'object') {
      entries = Object.entries(data.mcpServers).map(([name, s]) => ({ name, ...s }))
      format = 'mcpServers (standard)'
    }

    if (entries.length === 0) {
      results.push({ agent: agent.flag, configPath, status: 'warn', detail: `no MCP servers configured (${format})` })
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
          issues.push({ name, issue: `command "${entry.command}" not found in PATH` })
          errors++
          continue
        }
      }

      if (entry.command === 'node' && entry.args && entry.args.length > 0) {
        for (const arg of entry.args) {
          if (arg.startsWith('/') || arg.startsWith('./') || arg.startsWith('~')) {
            const resolvedPath = arg.startsWith('~') ? join(homedir(), arg.slice(1)) : arg
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

export async function doctorCommand(options = {}) {
  const jsonMode = options.json
  let passed = 0
  let warnings = 0
  let errors = 0

  const jsonChecks = []

  function checked(label, status, detail = '') {
    if (jsonMode) {
      jsonChecks.push({ label, status, detail })
    } else {
      console.log(`   ${icon(status)} ${label.padEnd(38)} ${detail}`)
    }
    if (status === 'pass') passed++
    else if (status === 'warn') warnings++
    else errors++
  }

  if (!jsonMode) {
    console.log('\n🔬 rolecraft doctor — System Health Check\n')
  }

  // --- Environment ---
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

  // --- ~/.agents directory ---
  const home = process.env.HOME || homedir()
  const agentsDir = join(home, '.agents')
  try {
    accessSync(agentsDir, constants.F_OK)
    checked('~/.agents directory', 'pass', agentsDir)
    checked('~/.agents permissions', 'pass', permString(agentsDir))
  } catch {
    checked('~/.agents directory', 'warn', 'not yet created')
  }

  // --- Lockfile checks ---
  const globalLock = await readLock()
  const globalSkillCount = Object.keys(globalLock.skills).length

  const schemaErr = validateLockfileSchema(globalLock)
  if (schemaErr) {
    checked('Global lockfile schema', 'error', schemaErr)
  } else {
    checked('Global lockfile schema', 'pass', `v${globalLock.version}, valid`)
  }

  if (globalSkillCount > 0) {
    checked('Global lockfile', 'pass', `${globalSkillCount} skill(s) tracked`)
  } else {
    checked('Global lockfile', 'warn', 'no global skills')
  }

  const projectLock = await readLock(getProjectLockPath(process.cwd())).catch(() => null)
  const projectSkillCount = projectLock ? Object.keys(projectLock.skills).length : 0
  if (projectSkillCount > 0) {
    checked('Project lockfile', 'pass', `${projectSkillCount} skill(s) tracked`)
  } else {
    checked('Project lockfile', 'warn', 'no project skills')
  }

  // --- Disk usage ---
  const skillDirs = [
    ...(globalSkillCount > 0 || true ? [getAgentsDir()] : []),
    ...(projectSkillCount > 0 ? [join(process.cwd(), '.agents', 'skills')] : []),
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
  if (totalSkillDirs > 0 || globalSkillCount > 0 || projectSkillCount > 0) {
    checked('Disk usage', 'pass', `${totalSkillDirs} skill(s), ${formatBytes(totalSize)} total`)
  } else {
    checked('Disk usage', 'warn', 'no skills installed')
  }

  // --- Agent detection ---
  const detected = detectAgents()
  const totalAgents = agents.length
  if (detected.length > 0) {
    checked('Agent detection', 'pass', `${detected.length}/${totalAgents} supported agents detected`)
    for (const agent of detected) {
      const dir = agent.dir()
      const skillCount = countAgentSkills(dir)
      const perms = permString(dir)
      let detail = `${skillCount} skill(s)`
      if (perms !== '---') detail += ` [${perms}]`
      checked(`  └ ${agent.label}`, skillCount > 0 ? 'pass' : 'warn', detail)
    }
  } else {
    checked('Agent detection', 'warn', 'no supported agents detected')
  }

  // --- Orphaned skill directories ---
  const allLockSlugs = new Set(Object.keys(globalLock.skills))
  if (projectLock) {
    for (const slug of Object.keys(projectLock.skills)) {
      allLockSlugs.add(slug)
    }
  }
  let orphanedDirs = 0
  try {
    const entries = readdirSync(getAgentsDir(), { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.')) {
        const normSlug = allLockSlugs.has(e.name) || allLockSlugs.has(e.name.replace(/-/g, '/'))
        if (!normSlug) {
          orphanedDirs++
        }
      }
    }
  } catch {}
  if (orphanedDirs > 0) {
    checked('Orphaned skill dirs', 'warn', `${orphanedDirs} director(ies) not in any lockfile`)
  } else {
    checked('Orphaned skill dirs', 'pass', 'none')
  }

  // --- Skill integrity ---
  const allSkills = { ...globalLock.skills }
  if (projectLock) {
    for (const [slug, entry] of Object.entries(projectLock.skills)) {
      allSkills[slug] = entry
    }
  }

  let missingDirs = 0
  let hashMismatches = 0
  let verifiedSkills = 0
  let brokenSymlinks = 0
  for (const [slug, entry] of Object.entries(allSkills)) {
    const normSlug = slug.replace(/\//g, '-')
    const searchDirs = [join(getAgentsDir(), normSlug), join(process.cwd(), '.agents', 'skills', normSlug)]
    const existingDir = searchDirs.find(d => {
      try { accessSync(d, constants.F_OK); return true } catch { return false }
    })
    if (!existingDir) {
      missingDirs++
      continue
    }
    brokenSymlinks += countBrokenSymlinks(existingDir)
    if (entry.contentSha) {
      try {
        const files = readdirSync(existingDir).filter(f => f.endsWith('.md'))
        const fc = {}
        for (const f of files) {
          fc[f] = readFileSync(join(existingDir, f), 'utf-8')
        }
        const { computeContentHash } = await import('../utils/lockfile.js')
        const hash = computeContentHash(fc)
        if (hash !== entry.contentSha) {
          hashMismatches++
        }
        verifiedSkills++
      } catch {
        hashMismatches++
      }
    } else {
      verifiedSkills++
    }
  }

  if (Object.keys(allSkills).length > 0) {
    const integrityIssues = (hashMismatches + missingDirs + brokenSymlinks) > 0
    let detail = `${verifiedSkills} checked`
    if (hashMismatches > 0) detail += `, ${hashMismatches} hash mismatch(es)`
    if (missingDirs > 0) detail += `, ${missingDirs} missing director(ies)`
    if (brokenSymlinks > 0) detail += `, ${brokenSymlinks} broken symlink(s)`
    checked('Skill integrity', integrityIssues ? 'warn' : 'pass', detail)
  } else {
    checked('Skill integrity', 'warn', 'no skills to verify')
  }

  // --- MCP server health ---
  const mcpResults = validateMcpServers(detected)
  const mcpPass = mcpResults.filter(r => r.status === 'pass').length
  const mcpWarn = mcpResults.filter(r => r.status === 'warn').length
  const mcpError = mcpResults.filter(r => r.status === 'error').length
  const totalMcp = mcpResults.length

  if (mcpPass > 0 || mcpWarn > 0) {
    const detail = `${mcpPass} ok, ${mcpWarn} warning(s), ${mcpError} error(s) across ${totalMcp} agent(s)`
    checked('MCP configs', mcpError > 0 ? 'warn' : 'pass', detail)
    for (const result of mcpResults) {
      if (result.status === 'pass') {
        checked(`  └ ${result.agent}`, 'pass', result.detail)
      } else {
        let detail = result.detail
        if (result.issues) {
          for (const issue of result.issues) {
            const icon = result.status === 'error' ? '❌' : '⚠️'
            detail += `\n       ${icon} ${issue.name}: ${issue.issue}`
          }
        }
        checked(`  └ ${result.agent}`, result.status, detail)
      }
    }
  } else if (mcpError > 0) {
    checked('MCP configs', 'error', `${mcpError} agent(s) with broken config`)
    for (const result of mcpResults) {
      checked(`  └ ${result.agent}`, 'error', result.detail)
    }
  } else {
    checked('MCP servers', 'warn', 'none configured')
  }

  // --- Network check (optional) ---
  if (options.network) {
    try {
      const resp = await fetch('https://github.com', { method: 'HEAD', signal: AbortSignal.timeout(5000) })
      checked('Network (GitHub)', resp.ok ? 'pass' : 'warn', `HTTP ${resp.status}`)
    } catch {
      checked('Network (GitHub)', 'warn', 'unreachable')
    }
  }

  // --- Output ---
  if (jsonMode) {
    const result = {}
    for (const c of jsonChecks) {
      result[c.label] = { status: c.status, detail: c.detail }
    }
    console.log(JSON.stringify({
      status: errors > 0 ? 'unhealthy' : warnings > 0 ? 'degraded' : 'healthy',
      checks: result,
      summary: { passed, warnings, errors },
    }, null, 2))
    return
  }

  const total = passed + warnings + errors
  console.log(`\n📋 Summary: ${passed}/${total} passed, ${warnings} warnings, ${errors} errors\n`)
}

function countAgentSkills(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .length
  } catch {
    return 0
  }
}
