import { accessSync, readdirSync, constants } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createInterface as defaultCreateInterface } from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
import { resolveSkills } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import {
  parseMcpServersFromSkill,
  resolveMcpSource,
  addMcpServer,
  getSupportedMcpAgents,
} from '../utils/mcp.js'
import agents from '../agents.js'
import { createSpinner } from '../utils/spinner.js'

let createInterface = defaultCreateInterface

export function setCreateInterface(fn) {
  createInterface = fn
}

const KNOWN_AGENTS = agents.map((a) => ({
  flag: a.flag,
  label: a.name,
  dir: () => a.getDir(),
}))

export function detectAgents() {
  const found = []
  for (const agent of KNOWN_AGENTS) {
    const dir = agent.dir()
    try {
      accessSync(dir, constants.F_OK)
      found.push(agent)
    } catch {
      // agent not installed
    }
  }
  return found
}

function globalAgentsDir() {
  return join(homedir(), '.agents', 'skills')
}

function askQuestion(query) {
  const rl = createInterface({ input, output })
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

function selectSkillsInteractive(skills) {
  console.log()
  for (let i = 0; i < skills.length; i++) {
    console.log(`  ${i + 1}. ${skills[i].name}`)
    if (skills[i].description) {
      console.log(`      ${skills[i].description}`)
    }
  }

  return (async () => {
    while (true) {
      console.log()
      const answer = await askQuestion(
        'Enter numbers (space-separated) to select, "all" for all, or press Enter to confirm selection: ',
      )

      if (answer === '' || answer === null || answer === undefined) {
        console.log('  No skills selected. Nothing to install.')
        return null
      }

      if (answer === 'all') {
        console.log(`  Selected all ${skills.length} skills.`)
        return skills
      }

      const parts = answer.split(/\s+/).map((p) => parseInt(p, 10))
      const selected = []
      for (const p of parts) {
        if (!Number.isNaN(p) && p >= 1 && p <= skills.length) {
          selected.push(skills[p - 1])
          console.log(`  ${skills[p - 1].name} selected`)
        }
      }

      if (selected.length > 0) {
        return selected
      }
    }
  })()
}

export async function setupCommand(source, options = {}) {
  const agents = detectAgents()
  const projectDir = join(process.cwd(), '.agents', 'skills')

  console.log('\n🔍 Detecting agents...\n')

  if (agents.length === 0) {
    console.log('   No supported agents detected.\n')
    console.log('   rolecraft installs skills into agent skill directories.')
    console.log('   Install an AI coding agent (opencode, claude-code, cursor,')
    console.log(
      '   windsurf, devin, codex, copilot, aider, cline, gemini-cli, cody,',
    )
    console.log(
      '   continue, warp, codeium, fabric, goose, tabnine, supermaven, pr-pilot,',
    )
    console.log(
      '   loom, roo, trae, hermes, kiro, augment, kilo, openhands, junie, factory, command-code, cortex, mistral-vibe, qwen-code, openclaw, codebuddy, mux, pi, autohand-code, rovo-dev, firebender, ibm-bob, aider-desk, code-arts-doer, code-maker, code-studio,',
    )
    console.log(
      '   crush, eve, forge, inference-sh, jazz, iflow, kilo-code, kode, lingma, mcp-jam, moxby, ona, qoder, reasonix, terra-mind, tiny-cloud, zencoder,',
    )
    console.log(
      '   amp, antigravity, antigravity-cli, deepagents, dexto, loaf, replit, zed, promptscript, astrbot, qoder-cn, trae-cn, zenflow, neovate, pochi, adal, droid, chatgpt, codearts-agent, universal) first.',
    )
    return
  }

  console.log('   Detected agents:')
  for (const agent of agents) {
    const skillCount = countSkills(agent.dir())
    console.log(`   • ${agent.label.padEnd(15)} ${skillCount} skill(s)`)
  }

  const globalCount = countSkills(globalAgentsDir())
  console.log(`\n   Global (~/.agents/skills/):   ${globalCount} skill(s)`)
  const projectSkillCount = countSkills(projectDir)
  if (projectSkillCount > 0) {
    console.log(
      `   Project (./.agents/skills/):  ${projectSkillCount} skill(s)`,
    )
  }

  console.log()

  if (source) {
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

    const spinner = createSpinner(`📦 Resolving ${source}...`)
    spinner.start()
    const allSkills = await resolveSkills(source)
    spinner.succeed(`Found ${allSkills.length} skill(s)`)

    let selectedSkills
    if (options.skill && options.skill.length > 0) {
      const skillNames = options.skill.map((n) => n.toLowerCase())
      selectedSkills = allSkills.filter(
        (s) =>
          skillNames.includes(s.name.toLowerCase()) ||
          skillNames.includes(s.slug.toLowerCase()),
      )
      if (selectedSkills.length === 0) {
        throw new Error(
          `No matching skills found for: ${options.skill.join(', ')}. Available: ${allSkills.map((s) => s.name).join(', ')}`,
        )
      }
    } else if (allSkills.length === 1) {
      selectedSkills = allSkills
    } else if (options.yes) {
      selectedSkills = allSkills
      console.log(`   Installing all ${allSkills.length} skills`)
    } else {
      const result = await selectSkillsInteractive(allSkills)
      if (!result) {
        console.log('Setup cancelled.')
        return
      }
      selectedSkills = result
    }

    const targets = agents.map((a) => a.flag)
    targets.push('project')

    if (options.dryRun) {
      console.log(
        `\n📋 [dry-run] Would install ${selectedSkills.length} skill(s):\n`,
      )
      for (const skill of selectedSkills) {
        console.log(`   Skill:     ${skill.name} (${skill.slug})`)
        console.log(`   Source:    ${source}`)
        console.log(`   Mode:      copy`)
        console.log(`   Files:     ${skill.files.join(', ')}`)
        console.log(`   Targets:   ${targets.join(', ')}\n`)
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

      const results = await installSkill(resolved, targets)

      const pathCounts = new Map()
      for (const r of results) {
        const count = pathCounts.get(r.path) || 0
        pathCounts.set(r.path, count + 1)
      }

      console.log(`   Installed to ${results.length} agent(s):`)
      for (const [path, count] of pathCounts) {
        const detail = count > 1 ? ` (×${count} agents)` : ''
        console.log(`     ${path}${detail}`)
      }

      if (resolved.content) {
        const mcpServers = parseMcpServersFromSkill(resolved.content)
        if (mcpServers.length > 0) {
          console.log(
            `\n   Skill includes ${mcpServers.length} MCP server(s). Installing...`,
          )
          const supported = getSupportedMcpAgents()
          const mcpTargets = agents
            .filter((a) => supported.includes(a.flag))
            .map((a) => a.flag)
          for (const server of mcpServers) {
            const resolvedMcp = await resolveMcpSource(server.source)
            let installedCount = 0
            for (const agent of mcpTargets) {
              const ok = await addMcpServer(agent, server.name, resolvedMcp)
              if (ok) installedCount++
            }
            console.log(
              `     ${installedCount}/${mcpTargets.length} agents: MCP server "${server.name}" installed`,
            )
          }
        }
      }
    }
  } else {
    console.log('To install a skill to all detected agents:')
    console.log('  rolecraft setup <source>\n')
    console.log('Examples:')
    console.log('  rolecraft setup ./my-skill')
    console.log('  rolecraft setup rolecraft-sh/skills')
    console.log('\nOptions:')
    console.log(
      '  --list        List available skills from a source without installing',
    )
    console.log(
      '  --skill <n>   Install specific skills by name (comma-separated)',
    )
    console.log('  --yes, -y     Install all skills without prompt')
    console.log('  --dry-run     Preview without installing')
  }
}

function countSkills(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter(
      (e) => e.isDirectory() && !e.name.startsWith('.'),
    ).length
  } catch {
    return 0
  }
}
