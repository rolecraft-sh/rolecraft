import { createInterface as defaultCreateInterface } from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
import { apiInstallSkills } from '../api/install.js'
import agents from '../agents.js'
import { createProgressBar } from '../utils/spinner.js'

let createInterface = defaultCreateInterface
let askQuestion = defaultAskQuestion

function defaultAskQuestion(query) {
  const rl = createInterface({ input, output })
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

export function setAskQuestion(fn) {
  askQuestion = fn || defaultAskQuestion
}

export function setCreateInterface(fn) {
  createInterface = fn
}

export function resetAskQuestion() {
  askQuestion = defaultAskQuestion
}

async function askScope() {
  console.log('\nWhere do you want to install this skill?\n')
  console.log('  1) Global (~/.agents/skills/)')
  console.log('  2) Project (./.agents/skills/) [default]')
  console.log('  3) Both\n')

  const answer = await askQuestion('Choice [1/2/3] (default: 2): ')

  switch (answer) {
    case '1':
      return { global: true, project: false }
    case '3':
      return { global: true, project: true }
    default:
      return { global: false, project: true }
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
    if (choices[i].description) console.log(`      ${choices[i].description}`)
  }

  while (true) {
    console.log()
    const answer = await askQuestion(
      'Enter numbers (space-separated) to select, "all" for all, or press Enter to confirm selection: ',
    )

    if (answer === '' || answer === null || answer === undefined) {
      const selected = choices
        .filter((c) => c.selected)
        .map((c) => skills[c.index])
      if (selected.length === 0) {
        const retry = await askQuestion('No skills selected. Try again? [Y/n] ')
        if (retry === 'n' || retry === 'no') return null
        continue
      }
      return selected
    }

    if (answer === 'all') {
      for (const c of choices) c.selected = true
      console.log(`  Selected all ${skills.length} skills.`)
      return skills.slice()
    }

    const parts = answer.split(/\s+/).map((p) => parseInt(p, 10))
    for (const p of parts) {
      if (!Number.isNaN(p) && p >= 1 && p <= choices.length) {
        choices[p - 1].selected = !choices[p - 1].selected
        const status = choices[p - 1].selected ? 'selected' : 'deselected'
        console.log(`  ${choices[p - 1].label} ${status}`)
      }
    }
  }
}

export async function installCommand(source, options) {
  const hasScopeFlags =
    options.global || options.project || agents.some((a) => options[a.flag])
  const scope = hasScopeFlags
    ? options
    : options.yes
      ? { global: false, project: true }
      : await askScope()

  if (options.list) {
    const bar = createProgressBar('Resolving skills...')
    bar.start()
    const { resolveSkills } = await import('../utils/resolver.js')
    const skills = await resolveSkills(source)
    bar.succeed(`Found ${skills.length} skill(s)`)
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

  const apiOptions = {
    cwd: process.cwd(),
    scope,
    yes: options.yes,
    dryRun: options.dryRun,
    frozenLockfile: options.frozenLockfile,
    symlink: options.symlink,
    noMcp: options.noMcp,
    skill: options.skill,
  }

  if (!options.yes && !options.skill && !options.dryRun) {
    const bar = createProgressBar('Resolving skills...')
    bar.start()
    const { resolveSkills } = await import('../utils/resolver.js')
    const allSkills = await resolveSkills(source)
    bar.succeed(`Found ${allSkills.length} skill(s)`)

    if (allSkills.length > 1) {
      const result = await selectSkillsInteractive(allSkills)
      if (!result) {
        console.log('Install cancelled.')
        return
      }
      apiOptions.skill = result.map((s) => s.slug)
    }
  }

  if (options.dryRun) {
    const result = await apiInstallSkills(source, {
      ...apiOptions,
      dryRun: true,
    })
    const mode = options.symlink ? 'symlink' : 'copy'
    console.log(`\n[dry-run] Would install ${result.skills.length} skill(s):\n`)
    for (const skill of result.skills) {
      console.log(`   Skill:     ${skill.name} (${skill.slug})`)
      console.log(`   Source:    ${source}`)
      console.log(`   Mode:      ${mode}`)
      console.log(`   Files:     ${skill.files.join(', ')}`)
      console.log(`   Targets:   ${skill.targets.join(', ')}`)
      console.log()
    }
    return
  }

  let result

  try {
    result = await apiInstallSkills(source, apiOptions)
  } catch (err) {
    if (err.message?.includes('security review') && !options.yes) {
      console.log('\n   Security scan: REVIEW')
      const answer = await askQuestion(
        `\n  Skill requires review. Continue? [y/N] `,
      )
      if (answer !== 'y' && answer !== 'yes') {
        console.log('  Skipping.')
        return
      }
      result = await apiInstallSkills(source, { ...apiOptions, yes: true })
    } else {
      throw err
    }
  }

  for (const skillResult of result.results) {
    console.log()
    console.log(`   Skill:    ${skillResult.name}`)
    console.log(`   Slug:     ${skillResult.slug}`)
    console.log(`   Owner:    ${skillResult.owner}`)
    if (skillResult.security) {
      const { formatSecurityReport } = await import('../utils/security.js')
      console.log(formatSecurityReport(skillResult.security))
    }
    console.log(`\n  Installed "${skillResult.name}":`)
    for (const r of skillResult.install) {
      console.log(`    ${r.label} -> ${r.path}`)
    }
  }

  for (const mcp of result.mcpResults) {
    console.log(`\n  MCP server "${mcp.server}" from ${mcp.source}:`)
    for (const inst of mcp.installed) {
      if (inst.success) {
        console.log(`    ✅ ${inst.agent}: installed`)
      }
    }
  }
}
