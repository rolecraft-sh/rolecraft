import { createInterface } from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
import { resolveSource } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'

function askQuestion(query) {
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
  console.log('  1) Global (~/.agents/skills/) [default]')
  console.log('  2) Project (./.agents/skills/)')
  console.log('  3) Both\n')

  const answer = await askQuestion('Choice [1/2/3] (default: 1): ')

  switch (answer) {
    case '2': return { global: false, project: true, claude: false }
    case '3': return { global: true, project: true, claude: false }
    default:  return { global: true, project: false, claude: false }
  }
}

export async function installCommand(source, options) {
  const hasScopeFlags = options.global || options.project || options.claude
  const scope = hasScopeFlags ? options : await askScope()

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
  if (scope.project) targets.push('project')

  const results = await installSkill(resolved, targets)

  console.log('✅ Installed successfully:\n')
  for (const r of results) {
    console.log(`   ${r.label} → ${r.path}`)
  }
}
