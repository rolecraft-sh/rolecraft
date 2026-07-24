import { execSync as defaultExecSync } from 'node:child_process'
import { resolveSource } from '../utils/resolver.js'
import { createPublishPR } from '../utils/registry-client.js'

let askQuestion = defaultAskQuestion
let runExecSync = defaultExecSync

async function defaultAskQuestion(query) {
  const { createInterface } = await import('node:readline')
  const { stdin, stdout } = await import('node:process')
  const rl = createInterface({ input: stdin, output: stdout })
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

export function setAskQuestion(fn) {
  askQuestion = fn || defaultAskQuestion
}

export function setExecSync(fn) {
  runExecSync = fn || defaultExecSync
}

function detectGitRemote(skillDir) {
  try {
    const output = runExecSync(`git -C "${skillDir}" remote get-url origin`, {
      encoding: 'utf-8',
      timeout: 5000,
    })
    const url = (output || '').trim()
    if (!url) return null

    const match = url.match(
      /(?:github\.com[:/])([\w.-]+)\/([\w.-]+?)(?:\.git)?$/,
    )
    if (match) return `${match[1]}/${match[2]}`
    return null
  } catch {
    return null
  }
}

export async function publishCommand(source, options = {}) {
  let skill
  try {
    skill = await resolveSource(source)
  } catch (err) {
    console.error(`\n❌ Failed to resolve skill: ${err.message}`)
    return
  }

  const slug = options.slug || skill.slug
  const name = options.name || skill.name
  const description = options.description || skill.description || ''

  let repo = options.repo || ''
  if (!repo) {
    repo = detectGitRemote(skill.skillDir || skill.sourcePath || source)
  }

  if (!repo && !options.dryRun && !options.yes) {
    const answer = await askQuestion(
      `\n  GitHub repo not detected. Enter repo (owner/repo): `,
    )
    if (!answer) {
      console.log('  Publish cancelled.')
      return
    }
    repo = answer.trim()
  }

  if (!repo && !options.dryRun) {
    console.error('\n❌ No repo specified. Use --repo owner/repo')
    return
  }

  if (repo && !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    console.error(
      `\n❌ Invalid repo format. Expected "owner/repo", got: "${repo}"`,
    )
    return
  }

  console.log()
  console.log(`  Skill:      ${name}`)
  console.log(`  Slug:       ${slug}`)
  console.log(`  Repo:       ${repo}`)
  if (description) console.log(`  Description: ${description}`)
  console.log()

  if (options.dryRun) {
    console.log('[dry-run] Would publish:')
    console.log(`   rolecraft publish ${source}`)
    console.log(`   → PR to rolecraft-sh/registry adding ${slug}\n`)
    return
  }

  const confirm = options.yes
    ? 'y'
    : await askQuestion('  Publish this skill to the registry? [y/N] ')

  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('  Publish cancelled.')
    return
  }

  console.log('  Publishing...')

  try {
    const result = await createPublishPR({
      slug,
      name,
      repo,
      description,
    })
    console.log(`\n✅ Published! PR #${result.number} created:`)
    console.log(`   ${result.url}`)
    console.log('   Auto-merge will handle the rest once checks pass.')
  } catch (err) {
    console.error(`\n❌ Failed to publish: ${err.message}`)
  }
}
