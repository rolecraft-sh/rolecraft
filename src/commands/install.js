import { createInterface as defaultCreateInterface } from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'

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
  const hasScopeFlags = options.global || options.project || options.claude || options.cursor || options.windsurf || options.devin || options.codex || options.copilot || options.aider || options.cline || options.gemini || options.cody || options.continue || options.warp || options.codeium || options.fabric || options.goose || options.tabnine || options.supermaven || options['pr-pilot'] || options.loom || options.roo || options.trae || options.hermes || options.kiro || options.augment || options.kilo || options.openhands || options.junie || options.factory || options['command-code'] || options.cortex || options['mistral-vibe'] || options['qwen-code'] || options.openclaw || options.codebuddy || options.mux || options.pi || options['autohand-code'] || options.rovo || options.firebender || options.bob || options['aider-desk'] || options['code-arts-doer'] || options['code-maker'] || options['code-studio'] || options.crush || options.eve || options.forge || options['inference-sh'] || options.jazz || options.iflow || options['kilo-code'] || options.kode || options.lingma || options['mcp-jam'] || options.moxby || options.ona || options.qoder || options.reasonix || options['terra-mind'] || options['tiny-cloud'] || options.zencoder || options.zap || options.codeep || options['kimi-code'] || options.zcode
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
      console.error(`Skill "${slug}" already installed. Use \`rolecraft update ${slug}\` to update or omit --frozen-lockfile to overwrite.`)
      process.exit(1)
    }
  }

  console.log(`\n🔍 Resolving skill from: ${source}`)
  const resolved = await resolveSource(source)

  console.log(`\n📦 Found skill: ${resolved.name}`)
  console.log(`   Slug:     ${resolved.slug}`)
  console.log(`   Owner:    ${resolved.owner}`)
  console.log(`   Files:    ${resolved.files.join(', ')}`)
  console.log()

  const targets = []
  if (scope.global) targets.push('agents')
  if (scope.claude) targets.push('claude')
  if (scope.cursor) targets.push('cursor')
  if (scope.windsurf) targets.push('windsurf')
  if (scope.devin) targets.push('devin')
  if (scope.codex) targets.push('codex')
  if (scope.copilot) targets.push('copilot')
  if (scope.aider) targets.push('aider')
  if (scope.cline) targets.push('cline')
  if (scope.gemini) targets.push('gemini')
  if (scope.cody) targets.push('cody')
  if (scope.continue) targets.push('continue')
  if (scope.warp) targets.push('warp')
  if (scope.codeium) targets.push('codeium')
  if (scope.fabric) targets.push('fabric')
  if (scope.goose) targets.push('goose')
  if (scope.tabnine) targets.push('tabnine')
  if (scope.supermaven) targets.push('supermaven')
  if (scope['pr-pilot']) targets.push('pr-pilot')
  if (scope.loom) targets.push('loom')
  if (scope.roo) targets.push('roo')
  if (scope.trae) targets.push('trae')
  if (scope.hermes) targets.push('hermes')
  if (scope.kiro) targets.push('kiro')
  if (scope.augment) targets.push('augment')
  if (scope.kilo) targets.push('kilo')
  if (scope.openhands) targets.push('openhands')
  if (scope.junie) targets.push('junie')
  if (scope.factory) targets.push('factory')
  if (scope['command-code']) targets.push('command-code')
  if (scope.cortex) targets.push('cortex')
  if (scope['mistral-vibe']) targets.push('mistral-vibe')
  if (scope['qwen-code']) targets.push('qwen-code')
  if (scope.openclaw) targets.push('openclaw')
  if (scope.codebuddy) targets.push('codebuddy')
  if (scope.mux) targets.push('mux')
  if (scope.pi) targets.push('pi')
  if (scope['autohand-code']) targets.push('autohand-code')
  if (scope.rovo) targets.push('rovo')
  if (scope.firebender) targets.push('firebender')
  if (scope.bob) targets.push('bob')
  if (scope['aider-desk']) targets.push('aider-desk')
  if (scope['code-arts-doer']) targets.push('code-arts-doer')
  if (scope['code-maker']) targets.push('code-maker')
  if (scope['code-studio']) targets.push('code-studio')
  if (scope.crush) targets.push('crush')
  if (scope.eve) targets.push('eve')
  if (scope.forge) targets.push('forge')
  if (scope['inference-sh']) targets.push('inference-sh')
  if (scope.jazz) targets.push('jazz')
  if (scope.iflow) targets.push('iflow')
  if (scope['kilo-code']) targets.push('kilo-code')
  if (scope.kode) targets.push('kode')
  if (scope.lingma) targets.push('lingma')
  if (scope['mcp-jam']) targets.push('mcp-jam')
  if (scope.moxby) targets.push('moxby')
  if (scope.ona) targets.push('ona')
  if (scope.qoder) targets.push('qoder')
  if (scope.reasonix) targets.push('reasonix')
  if (scope['terra-mind']) targets.push('terra-mind')
  if (scope['tiny-cloud']) targets.push('tiny-cloud')
  if (scope.zencoder) targets.push('zencoder')
  if (scope.zap) targets.push('zap')
  if (scope.codeep) targets.push('codeep')
  if (scope['kimi-code']) targets.push('kimi-code')
  if (scope.zcode) targets.push('zcode')
  if (scope.project) targets.push('project')

  if (options.dryRun) {
    const mode = options.symlink ? 'symlink' : 'copy'
    console.log('📋 Dry-run — no files will be copied:\n')
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
}
