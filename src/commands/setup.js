import { accessSync, readdirSync, constants } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createInterface as defaultCreateInterface } from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
import { getAgentsDir, getClaudeDir, getCursorDir, getWindsurfDir, getCodexDir, getCopilotProjectDir, getAiderDir, getClineDir, getDevinDir, getGeminiDir, getCodyDir, getContinueDir, getWarpDir, getCodeiumDir, getFabricDir, getGooseDir, getTabnineDir, getSupermavenDir, getPrPilotDir, getLoomDir, getRooDir, getTraeDir, getHermesDir, getKiroDir, getAugmentDir, getKiloDir, getOpenHandsDir, getJunieDir, getFactoryDir, getCommandCodeDir, getCortexDir, getMistralVibeDir, getQwenCodeDir, getOpenClawDir, getCodeBuddyDir, getMuxDir, getPiDir, getAutohandCodeDir, getRovoDevDir, getFirebenderDir, getBobDir, getAiderDeskDir, getCodeArtsDoerDir, getCodeMakerDir, getCodeStudioDir, getCrushDir, getEveDir, getForgeDir, getInferenceShDir, getJazzDir, getIFlowDir, getKiloCodeDir, getKodeDir, getLingmaDir, getMcpJamDir, getMoxbyDir, getOnaDir, getQoderDir, getReasonixDir, getTerraMindDir, getTinyCloudDir, getZencoderDir, getZapDir, getCodeepDir, getKimiCodeDir, getZCodeDir, getAstrbotDir, getQoderCnDir, getTraeCnDir, getZenflowDir, getNeovateDir, getPochiDir, getAdalDir, getDroidDir, getChatgptDir, getCodeartsAgentDir, getUniversalDir } from '../utils/lockfile.js'
import { resolveSkills } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import { parseMcpServersFromSkill, resolveMcpSource, addMcpServer, getSupportedMcpAgents } from '../utils/mcp.js'
import { createSpinner } from '../utils/spinner.js'

let createInterface = defaultCreateInterface

export function setCreateInterface(fn) {
  createInterface = fn
}

const KNOWN_AGENTS = [
  { flag: 'agents', label: 'opencode', dir: getAgentsDir },
  { flag: 'claude', label: 'claude-code', dir: getClaudeDir },
  { flag: 'cursor', label: 'cursor', dir: getCursorDir },
  { flag: 'windsurf', label: 'windsurf', dir: getWindsurfDir },
  { flag: 'codex', label: 'codex', dir: getCodexDir },
  { flag: 'copilot', label: 'copilot', dir: () => getCopilotProjectDir() },
  { flag: 'aider', label: 'aider', dir: getAiderDir },
  { flag: 'cline', label: 'cline', dir: getClineDir },
  { flag: 'devin', label: 'devin', dir: getDevinDir },
  { flag: 'gemini', label: 'gemini-cli', dir: getGeminiDir },
  { flag: 'cody', label: 'cody', dir: getCodyDir },
  { flag: 'continue', label: 'continue', dir: getContinueDir },
  { flag: 'warp', label: 'warp', dir: getWarpDir },
  { flag: 'codeium', label: 'codeium', dir: getCodeiumDir },
  { flag: 'fabric', label: 'fabric', dir: getFabricDir },
  { flag: 'goose', label: 'goose', dir: getGooseDir },
  { flag: 'tabnine', label: 'tabnine', dir: getTabnineDir },
  { flag: 'supermaven', label: 'supermaven', dir: getSupermavenDir },
  { flag: 'pr-pilot', label: 'pr-pilot', dir: getPrPilotDir },
  { flag: 'loom', label: 'loom', dir: getLoomDir },
  { flag: 'roo', label: 'roo-code', dir: getRooDir },
  { flag: 'trae', label: 'trae', dir: getTraeDir },
  { flag: 'hermes', label: 'hermes', dir: getHermesDir },
  { flag: 'kiro', label: 'kiro', dir: getKiroDir },
  { flag: 'augment', label: 'augment', dir: getAugmentDir },
  { flag: 'kilo', label: 'kilo-code', dir: getKiloDir },
  { flag: 'openhands', label: 'openhands', dir: getOpenHandsDir },
  { flag: 'junie', label: 'junie', dir: getJunieDir },
  { flag: 'factory', label: 'factory', dir: getFactoryDir },
  { flag: 'command-code', label: 'command-code', dir: getCommandCodeDir },
  { flag: 'cortex', label: 'cortex', dir: getCortexDir },
  { flag: 'mistral-vibe', label: 'mistral-vibe', dir: getMistralVibeDir },
  { flag: 'qwen-code', label: 'qwen-code', dir: getQwenCodeDir },
  { flag: 'openclaw', label: 'openclaw', dir: getOpenClawDir },
  { flag: 'codebuddy', label: 'codebuddy', dir: getCodeBuddyDir },
  { flag: 'mux', label: 'mux', dir: getMuxDir },
  { flag: 'pi', label: 'pi', dir: getPiDir },
  { flag: 'autohand-code', label: 'autohand-code', dir: getAutohandCodeDir },
  { flag: 'rovo', label: 'rovo-dev', dir: getRovoDevDir },
  { flag: 'firebender', label: 'firebender', dir: getFirebenderDir },
  { flag: 'bob', label: 'ibm-bob', dir: getBobDir },
  { flag: 'aider-desk', label: 'aider-desk', dir: getAiderDeskDir },
  { flag: 'code-arts-doer', label: 'code-arts-doer', dir: getCodeArtsDoerDir },
  { flag: 'code-maker', label: 'code-maker', dir: getCodeMakerDir },
  { flag: 'code-studio', label: 'code-studio', dir: getCodeStudioDir },
  { flag: 'crush', label: 'crush', dir: getCrushDir },
  { flag: 'eve', label: 'eve', dir: getEveDir },
  { flag: 'forge', label: 'forge', dir: getForgeDir },
  { flag: 'inference-sh', label: 'inference-sh', dir: getInferenceShDir },
  { flag: 'jazz', label: 'jazz', dir: getJazzDir },
  { flag: 'iflow', label: 'iflow', dir: getIFlowDir },
  { flag: 'kilo-code', label: 'kilo-code', dir: getKiloCodeDir },
  { flag: 'kode', label: 'kode', dir: getKodeDir },
  { flag: 'lingma', label: 'lingma', dir: getLingmaDir },
  { flag: 'mcp-jam', label: 'mcp-jam', dir: getMcpJamDir },
  { flag: 'moxby', label: 'moxby', dir: getMoxbyDir },
  { flag: 'ona', label: 'ona', dir: getOnaDir },
  { flag: 'qoder', label: 'qoder', dir: getQoderDir },
  { flag: 'reasonix', label: 'reasonix', dir: getReasonixDir },
  { flag: 'terra-mind', label: 'terra-mind', dir: getTerraMindDir },
  { flag: 'tiny-cloud', label: 'tiny-cloud', dir: getTinyCloudDir },
  { flag: 'zencoder', label: 'zencoder', dir: getZencoderDir },
  { flag: 'zap', label: 'zap', dir: getZapDir },
  { flag: 'codeep', label: 'codeep', dir: getCodeepDir },
  { flag: 'kimi-code', label: 'kimi-code', dir: getKimiCodeDir },
  { flag: 'zcode', label: 'zcode', dir: getZCodeDir },
  { flag: 'amp', label: 'amp', dir: getAgentsDir },
  { flag: 'antigravity', label: 'antigravity', dir: getAgentsDir },
  { flag: 'antigravity-cli', label: 'antigravity-cli', dir: getAgentsDir },
  { flag: 'deepagents', label: 'deep-agents', dir: getAgentsDir },
  { flag: 'dexto', label: 'dexto', dir: getAgentsDir },
  { flag: 'loaf', label: 'loaf', dir: getAgentsDir },
  { flag: 'replit', label: 'replit', dir: getAgentsDir },
  { flag: 'zed', label: 'zed', dir: getAgentsDir },
  { flag: 'promptscript', label: 'promptscript', dir: getEveDir },
  { flag: 'astrbot', label: 'astrbot', dir: getAstrbotDir },
  { flag: 'qoder-cn', label: 'qoder-cn', dir: getQoderCnDir },
  { flag: 'trae-cn', label: 'trae-cn', dir: getTraeCnDir },
  { flag: 'zenflow', label: 'zenflow', dir: getZenflowDir },
  { flag: 'neovate', label: 'neovate', dir: getNeovateDir },
  { flag: 'pochi', label: 'pochi', dir: getPochiDir },
  { flag: 'adal', label: 'adal', dir: getAdalDir },
  { flag: 'droid', label: 'droid', dir: getDroidDir },
  { flag: 'chatgpt', label: 'chatgpt', dir: getChatgptDir },
  { flag: 'codearts-agent', label: 'codearts-agent', dir: getCodeartsAgentDir },
  { flag: 'universal', label: 'universal', dir: getUniversalDir },
]

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
  return new Promise(resolve => {
    rl.question(query, answer => {
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
      const answer = await askQuestion('Enter numbers (space-separated) to select, "all" for all, or press Enter to confirm selection: ')

      if (answer === '' || answer === null || answer === undefined) {
        console.log('  No skills selected. Nothing to install.')
        return null
      }

      if (answer === 'all') {
        console.log(`  Selected all ${skills.length} skills.`)
        return skills
      }

      const parts = answer.split(/\s+/).map(p => parseInt(p, 10))
      const selected = []
      for (const p of parts) {
        if (!isNaN(p) && p >= 1 && p <= skills.length) {
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
    console.log('   windsurf, devin, codex, copilot, aider, cline, gemini-cli, cody,')
    console.log('   continue, warp, codeium, fabric, goose, tabnine, supermaven, pr-pilot,')
    console.log('   loom, roo, trae, hermes, kiro, augment, kilo, openhands, junie, factory, command-code, cortex, mistral-vibe, qwen-code, openclaw, codebuddy, mux, pi, autohand-code, rovo-dev, firebender, ibm-bob, aider-desk, code-arts-doer, code-maker, code-studio,')
    console.log('   crush, eve, forge, inference-sh, jazz, iflow, kilo-code, kode, lingma, mcp-jam, moxby, ona, qoder, reasonix, terra-mind, tiny-cloud, zencoder,')
    console.log('   amp, antigravity, antigravity-cli, deepagents, dexto, loaf, replit, zed, promptscript, astrbot, qoder-cn, trae-cn, zenflow, neovate, pochi, adal, droid, chatgpt, codearts-agent, universal) first.')
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
    console.log(`   Project (./.agents/skills/):  ${projectSkillCount} skill(s)`)
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
        console.log('Setup cancelled.')
        return
      }
      selectedSkills = result
    }

    const targets = agents.map(a => a.flag)
    targets.push('project')

    if (options.dryRun) {
      console.log(`\n📋 [dry-run] Would install ${selectedSkills.length} skill(s):\n`)
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
          console.log(`\n   Skill includes ${mcpServers.length} MCP server(s). Installing...`)
          const supported = getSupportedMcpAgents()
          const mcpTargets = agents.filter(a => supported.includes(a.flag)).map(a => a.flag)
          for (const server of mcpServers) {
            const resolvedMcp = resolveMcpSource(server.source)
            let installedCount = 0
            for (const agent of mcpTargets) {
              const ok = await addMcpServer(agent, server.name, resolvedMcp)
              if (ok) installedCount++
            }
            console.log(`     ${installedCount}/${mcpTargets.length} agents: MCP server "${server.name}" installed`)
          }
        }
      }
    }
  } else {
    console.log('To install a skill to all detected agents:')
    console.log('  rolecraft setup <source>\n')
    console.log('Examples:')
    console.log('  rolecraft setup ./my-skill')
    console.log('  rolecraft setup sametcelikbicak/task-decomposer')
    console.log('\nOptions:')
    console.log('  --list        List available skills from a source without installing')
    console.log('  --skill <n>   Install specific skills by name (comma-separated)')
    console.log('  --yes, -y     Install all skills without prompt')
    console.log('  --dry-run     Preview without installing')
  }
}

function countSkills(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .length
  } catch {
    return 0
  }
}
