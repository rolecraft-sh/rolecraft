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
  const hasScopeFlags = options.global || options.project || options.claude || options.cursor || options.windsurf || options.devin || options.codex || options.copilot || options.aider || options.cline || options.gemini || options.cody || options.continue || options.warp || options.codeium || options.fabric || options.goose || options.tabnine || options.supermaven || options['pr-pilot'] || options.loom
  const scope = hasScopeFlags ? options : await askScope()

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
  if (scope.project) targets.push('project')

  const results = await installSkill(resolved, targets, options.symlink ? 'symlink' : 'copy')

  console.log('✅ Installed successfully:\n')
  for (const r of results) {
    console.log(`   ${r.label} → ${r.path}`)
  }
}
