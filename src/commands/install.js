import { createInterface as defaultCreateInterface } from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
import { resolveSource, resolveSkills } from '../utils/resolver.js'
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

async function selectSkillsInteractive(skills) {
  const choices = skills.map((s, i) => ({
    index: i,
    label: s.name,
    description: s.description || `slug: ${s.slug}`,
    selected: false,
  }))

  console.log()
  for (let i = 0; i < choices.length; i++) {
    console.log(`  ${i + 1}. ${choices[i].label}`)
    if (choices[i].description) {
      console.log(`      ${choices[i].description}`)
    }
  }

  while (true) {
    console.log()
    const answer = await askQuestion('Enter numbers (space-separated) to select, "all" for all, or press Enter to confirm selection: ')

    if (answer === '' || answer === null || answer === undefined) {
      const selected = choices.filter(c => c.selected).map(c => skills[c.index])
      if (selected.length === 0) {
        const retry = await askQuestion('No skills selected. Try again? [Y/n] ')
        if (retry === 'n' || retry === 'no') return null
        continue
      }
      return selected
    }

    if (answer === 'all') {
      for (const c of choices) c.selected = true
      const all = skills.slice()
      console.log(`  Selected all ${all.length} skills.`)
      return all
    }

    const parts = answer.split(/\s+/).map(p => parseInt(p, 10))
    for (const p of parts) {
      if (!isNaN(p) && p >= 1 && p <= choices.length) {
        choices[p - 1].selected = !choices[p - 1].selected
        const status = choices[p - 1].selected ? 'selected' : 'deselected'
        console.log(`  ${choices[p - 1].label} ${status}`)
      }
    }
  }
}

export async function installCommand(source, options) {
  const hasScopeFlags = options.global || options.project || agents.some(a => options[a.flag])
  const scope = hasScopeFlags ? options : options.yes ? { global: false, project: true } : await askScope()

  if (options.list) {
    const spinner = createSpinner('Resolving skills...')
    spinner.start()
    const skills = await resolveSkills(source)
    spinner.succeed(`Found ${skills.length} skill(s)`)
    console.log()
    for (const s of skills) {
      console.log(`  ${s.name}`)
      console.log(`    Slug:       ${s.slug}`)
      console.log(`    Owner:      ${s.owner}`)
      if (s.description) console.log(`    Description: ${s.description}`)
      console.log(`    Files:      ${s.files.join(', ')}`)
      console.log()
    }
    return
  }

  if (options.frozenLockfile) {
    const { readLock, getProjectLockPath } = await import('../utils/lockfile.js')
    const [globalLock, projectLock] = await Promise.all([
      readLock(),
      readLock(getProjectLockPath(process.cwd())).catch(() => ({ skills: {} })),
    ])
    const { slug } = await resolveSource(source)
    const existing = globalLock.skills[slug] || projectLock.skills[slug]
    if (existing) {
      throw new Error(`Skill "${slug}" already installed. Use \`rolecraft update ${slug}\` to update or omit --frozen-lockfile to overwrite.`)
    }
  }

  const spinner = createSpinner('Resolving skills...')
  spinner.start()
  const allSkills = await resolveSkills(source)
  spinner.succeed(`Found ${allSkills.length} skill(s)`)

  let selectedSkills
  if (options.skill && options.skill.length > 0) {
    const skillNames = options.skill.map(n => n.toLowerCase())
    selectedSkills = allSkills.filter(s =>
      skillNames.includes(s.name.toLowerCase()) || skillNames.includes(s.slug.toLowerCase())
    )
    if (selectedSkills.length === 0) {
      throw new Error(`No matching skills found for: ${options.skill.join(', ')}. Available: ${allSkills.map(s => s.name).join(', ')}`)
    }
  } else if (allSkills.length === 1) {
    selectedSkills = allSkills
  } else if (options.yes) {
    selectedSkills = allSkills
    console.log(`   Installing all ${allSkills.length} skills`)
  } else {
    const result = await selectSkillsInteractive(allSkills)
    if (!result) {
      console.log('Install cancelled.')
      return
    }
    selectedSkills = result
  }

  const targets = []
  if (scope.global) targets.push('agents')
  if (scope.project) targets.push('project')
  for (const agent of agents) {
    if (scope[agent.flag]) targets.push(agent.flag)
  }

  if (options.dryRun) {
    const mode = options.symlink ? 'symlink' : 'copy'
    console.log(`\n[dry-run] Would install ${selectedSkills.length} skill(s):\n`)
    for (const skill of selectedSkills) {
      console.log(`   Skill:     ${skill.name} (${skill.slug})`)
      console.log(`   Source:    ${source}`)
      console.log(`   Mode:      ${mode}`)
      console.log(`   Files:     ${skill.files.join(', ')}`)
      console.log(`   Targets:   ${targets.join(', ')}`)
      console.log()
    }
    return
  }

  for (const skill of selectedSkills) {
    const resolved = {
      ...skill,
      sourcePath: skill.sourcePath || source,
      sourceType: skill.sourceType || 'local',
    }

    console.log()
    console.log(`   Skill:    ${resolved.name}`)
    console.log(`   Slug:     ${resolved.slug}`)
    console.log(`   Owner:    ${resolved.owner}`)
    console.log(`   Files:    ${resolved.files.join(', ')}`)

    const security = scanSkill(resolved)
    console.log(formatSecurityReport(security))
    const level = security.score >= 90 ? 'safe' : security.score >= 70 ? 'review' : 'danger'

    if (level === 'danger' && !options.yes) {
      throw new Error(`Install of "${resolved.name}" blocked by security scan. Use --yes to force install.`)
    }

    if (level === 'review' && !options.yes) {
      const answer = await askQuestion(`\n  "${resolved.name}" requires review. Continue? [y/N] `)
      if (answer !== 'y' && answer !== 'yes') {
        console.log(`  Skipping "${resolved.name}".`)
        continue
      }
    }

    const results = await installSkill(resolved, targets, options.symlink ? 'symlink' : 'copy')

    console.log(`\n  Installed "${resolved.name}":`)
    for (const r of results) {
      console.log(`    ${r.label} -> ${r.path}`)
    }

    if (resolved.content && !options.noMcp) {
      const mcpServers = parseMcpServersFromSkill(resolved.content)
      if (mcpServers.length > 0) {
        console.log(`\n  Skill includes ${mcpServers.length} MCP server(s). Installing...`)
        const supportedAgents = getSupportedMcpAgents()
        const mcpTargets = targets.filter(t => t !== 'project' && supportedAgents.includes(t))
        for (const server of mcpServers) {
          const resolvedMcp = resolveMcpSource(server.source)
          let installedCount = 0
          for (const agent of mcpTargets) {
            const ok = await addMcpServer(agent, server.name, resolvedMcp)
            if (ok) installedCount++
          }
          console.log(`    ${installedCount}/${mcpTargets.length} agents: MCP server "${server.name}" installed`)
        }
      }
    }
  }
}
