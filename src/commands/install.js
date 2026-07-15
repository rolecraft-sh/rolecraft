import { createInterface as defaultCreateInterface } from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import { scanSkill, formatSecurityReport } from '../utils/security.js'
import { parseMcpServersFromSkill, resolveMcpSource, addMcpServer, getSupportedMcpAgents } from '../utils/mcp.js'
import agents from '../agents.js'
import { createSpinner } from '../utils/spinner.js'

let createInterface = defaultCreateInterface
let askQuestion = defaultAskQuestion

export function setCreateInterface(fn) {
  createInterface = fn
}

export function setAskQuestion(fn) {
  askQuestion = fn
}

export function resetAskQuestion() {
  askQuestion = defaultAskQuestion
}

function defaultAskQuestion(query) {
  const rl = createInterface({ input, output })
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

async function askScope() {
  console.log('\nWhere do you want to install this skill?\n')
  console.log('  1) Global (~/.agents/skills/)')
  console.log('  2) Project (./.agents/skills/) [default]')
  console.log('  3) Both\n')

  const answer = await askQuestion('Choice [1/2/3] (default: 2): ')

  switch (answer) {
    case '1': return { global: true, project: false, claude: false }
    case '3': return { global: true, project: true, claude: false }
    default:  return { global: false, project: true, claude: false }
  }
}

export async function installCommand(source, options) {
  const hasScopeFlags = options.global || options.project || agents.some(a => options[a.flag])
  const scope = hasScopeFlags ? options : options.yes ? { global: false, project: true } : await askScope()

  if (options.frozenLockfile) {
    const { readLock, getProjectLockPath } = await import('../utils/lockfile.js')
    const [globalLock, projectLock] = await Promise.all([
      readLock(),
      readLock(getProjectLockPath(process.cwd())).catch(() => ({ skills: {} })),
    ])
    const resolveSource = (await import('../utils/resolver.js')).resolveSource
    const { slug } = await resolveSource(source)
    const existing = globalLock.skills[slug] || projectLock.skills[slug]
    if (existing) {
      throw new Error(`Skill "${slug}" already installed. Use \`rolecraft update ${slug}\` to update or omit --frozen-lockfile to overwrite.`)
    }
  }

  const spinner = createSpinner(`🔍 Resolving ${source}...`)
  spinner.start()
  const resolved = await resolveSource(source)
  spinner.succeed(`📦 Found: ${resolved.name}`)
  console.log(`   Slug:     ${resolved.slug}`)
  console.log(`   Owner:    ${resolved.owner}`)
  console.log(`   Files:    ${resolved.files.join(', ')}`)

  const security = scanSkill(resolved)
  console.log(formatSecurityReport(security))
  const level = security.score >= 90 ? 'safe' : security.score >= 70 ? 'review' : 'danger'

  if (level === 'danger' && !options.yes) {
    throw new Error('Install blocked by security scan. Use --yes to force install.')
  }

  if (level === 'review' && !options.yes) {
    const answer = await askQuestion('\n⚠️  Continue with installation? [y/N] ')
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Install cancelled.')
      return
    }
  }

  console.log()

  const targets = []
  if (scope.global) targets.push('agents')
  if (scope.project) targets.push('project')
  for (const agent of agents) {
    if (scope[agent.flag]) targets.push(agent.flag)
  }

  if (options.dryRun) {
    const mode = options.symlink ? 'symlink' : 'copy'
    console.log(`\n📋 [dry-run] Would install skill:\n`)
    console.log(`   Skill:     ${resolved.name} (${resolved.slug})`)
    console.log(`   Source:    ${source}`)
    console.log(`   Mode:      ${mode}`)
    console.log(`   Files:     ${resolved.files.join(', ')}`)
    console.log(`   Targets:   ${targets.join(', ')}\n`)
    return
  }

  const results = await installSkill(resolved, targets, options.symlink ? 'symlink' : 'copy')

  console.log('✅ Installed successfully:\n')
  for (const r of results) {
    console.log(`   ${r.label} → ${r.path}`)
  }

  if (resolved.content && !options.noMcp) {
    const mcpServers = parseMcpServersFromSkill(resolved.content)
    if (mcpServers.length > 0) {
      console.log(`\n🔧 Skill includes ${mcpServers.length} MCP server(s). Installing...`)
      const supportedAgents = getSupportedMcpAgents()
      const mcpTargets = targets.filter(t => t !== 'project' && supportedAgents.includes(t))
      for (const server of mcpServers) {
        const resolvedMcp = resolveMcpSource(server.source)
        let installedCount = 0
        for (const agent of mcpTargets) {
          const ok = await addMcpServer(agent, server.name, resolvedMcp)
          if (ok) installedCount++
        }
        console.log(`   ${installedCount}/${mcpTargets.length} agents: MCP server "${server.name}" installed`)
      }
    }
  }
}
