import { accessSync, constants, readFileSync, readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readLock, getProjectLockPath, getAgentsDir } from '../utils/lockfile.js'
import { detectAgents } from './setup.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'))

function icon(status) {
  return status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌'
}

export async function doctorCommand() {
  let passed = 0
  let warnings = 0
  let errors = 0

  function report(label, status, detail = '') {
    console.log(`   ${icon(status)} ${label.padEnd(38)} ${detail}`)
    if (status === 'pass') passed++
    else if (status === 'warn') warnings++
    else errors++
  }

  console.log('\n🔬 rolecraft doctor — System Health Check\n')

  report('Node.js version', 'pass', `v${process.versions.node}`)
  const [major] = process.versions.node.split('.').map(Number)
  if (major < 20) {
    report('Node.js compatibility', 'error', '>= 20 required, please upgrade')
  }

  try {
    execSync('git --version', { stdio: 'ignore' })
    report('Git availability', 'pass', 'detected')
  } catch {
    report('Git availability', 'warn', 'not found (needed for GitHub sources)')
  }

  try {
    execSync('npm --version', { stdio: 'ignore' })
    report('npm availability', 'pass', 'detected')
  } catch {
    report('npm availability', 'warn', 'not found (needed for npm sources)')
  }

  report('rolecraft version', 'pass', `v${pkg.version}`)
  report('Home directory', 'pass', process.env.HOME || '~')

  const agentsDir = join(process.env.HOME || '~', '.agents')
  try {
    accessSync(agentsDir, constants.F_OK)
    report('~/.agents directory', 'pass', agentsDir)
  } catch {
    report('~/.agents directory', 'warn', 'not yet created')
  }

  const globalLock = await readLock()
  const globalSkillCount = Object.keys(globalLock.skills).length
  if (globalSkillCount > 0) {
    report('Global lockfile', 'pass', `${globalSkillCount} skill(s) tracked`)
  } else {
    report('Global lockfile', 'warn', 'no global skills')
  }

  const projectLock = await readLock(getProjectLockPath(process.cwd())).catch(() => null)
  const projectSkillCount = projectLock ? Object.keys(projectLock.skills).length : 0
  if (projectSkillCount > 0) {
    report('Project lockfile', 'pass', `${projectSkillCount} skill(s) tracked`)
  } else {
    report('Project lockfile', 'warn', 'no project skills')
  }

  const agents = detectAgents()
  if (agents.length > 0) {
    report('Agent detection', 'pass', `${agents.length} agent(s) found`)
    for (const agent of agents) {
      const skillCount = countAgentSkills(agent.dir())
      const label = `  └ ${agent.label}`
      if (skillCount > 0) {
        report(label, 'pass', `${skillCount} skill(s)`)
      } else {
        report(label, 'warn', 'no skills installed')
      }
    }
  } else {
    report('Agent detection', 'warn', 'no supported agents detected')
  }

  const allSkills = { ...globalLock.skills }
  if (projectLock) {
    for (const [slug, entry] of Object.entries(projectLock.skills)) {
      allSkills[slug] = entry
    }
  }

  let missingDirs = 0
  let hashMismatches = 0
  let verifiedSkills = 0
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
    report('Skill integrity', (hashMismatches + missingDirs) === 0 ? 'pass' : 'warn',
      `${verifiedSkills} checked, ${hashMismatches} hash mismatch(es), ${missingDirs} missing director(ies)`)
  } else {
    report('Skill integrity', 'warn', 'no skills to verify')
  }

  console.log(`\n📋 Summary: ${passed} passed, ${warnings} warnings, ${errors} errors\n`)
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
