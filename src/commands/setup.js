import { accessSync, readdirSync, constants } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { getAgentsDir, getClaudeDir, getCursorDir, getWindsurfDir, getCodexDir, getCopilotDir, getAiderDir, getClineDir, getDevinDir, getGeminiDir, getCodyDir, getContinueDir, getWarpDir, getCodeiumDir, getFabricDir, getGooseDir, getTabnineDir, getSupermavenDir, getPrPilotDir, getLoomDir, getRooDir, getTraeDir, getHermesDir, getKiroDir, getAugmentDir, getKiloDir, getOpenHandsDir, getJunieDir, getFactoryDir } from '../utils/lockfile.js'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'

const KNOWN_AGENTS = [
  { flag: 'agents', label: 'opencode', dir: getAgentsDir },
  { flag: 'claude', label: 'claude-code', dir: getClaudeDir },
  { flag: 'cursor', label: 'cursor', dir: getCursorDir },
  { flag: 'windsurf', label: 'windsurf', dir: getWindsurfDir },
  { flag: 'codex', label: 'codex', dir: getCodexDir },
  { flag: 'copilot', label: 'copilot', dir: getCopilotDir },
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

export async function setupCommand(source) {
  const agents = detectAgents()
  const projectDir = join(process.cwd(), '.agents', 'skills')

  console.log('\n🔍 Detecting agents...\n')

  if (agents.length === 0) {
    console.log('   No supported agents detected.\n')
    console.log('   rolecraft installs skills into agent skill directories.')
    console.log('   Install an AI coding agent (opencode, claude-code, cursor,')
    console.log('   windsurf, devin, codex, copilot, aider, cline, gemini-cli, cody,')
    console.log('   continue, warp, codeium, fabric, goose, tabnine, supermaven, pr-pilot,')
    console.log('   loom, roo, trae, hermes, kiro, augment, kilo, openhands, junie, factory) first.')
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
    console.log(`📦 Installing skill from: ${source}`)
    const resolved = await resolveSource(source)

    console.log(`   Found: ${resolved.name} (${resolved.slug})\n`)

    const targets = agents.map(a => a.flag)
    targets.push('project')

    const results = await installSkill(resolved, targets)

    console.log('✅ Installed to all detected agents:\n')
    for (const r of results) {
      console.log(`   ${r.label} → ${r.path}`)
    }
  } else {
    console.log('To install a skill to all detected agents:')
    console.log('  rolecraft setup <source>\n')
    console.log('Examples:')
    console.log('  rolecraft setup ./my-skill')
    console.log('  rolecraft setup sametcelikbicak/task-decomposer')
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
