#!/usr/bin/env node

import { installCommand } from '../src/commands/install.js'
import { listCommand } from '../src/commands/list.js'
import { removeCommand } from '../src/commands/remove.js'

function usage() {
  console.log(`
rolecraft — Install AI agent skills like roles & behaviors

Zero dependencies, no marketplace required.
Works with opencode, claude-code, cursor, and all spec-compliant agents.

Usage:
  rolecraft install <source>     Install a skill (local path or owner/repo)
  rolecraft list                 List installed skills
  rolecraft remove <slug>        Remove a skill
  rolecraft help                 Show this help

Options for install:
  --global     Install to ~/.agents/skills/ (default)
  --claude     Also install to ~/.claude/skills/
  --project    Install to ./.agents/skills/
  --all        Install to all locations

Examples:
  rolecraft install ./my-skill
  rolecraft install sametcelikbicak/task-decomposer
  rolecraft install ./skills/my-skill --claude
  rolecraft list
  rolecraft remove task-decomposer
`)
}

export async function main() {
  const [,, cmd, ...args] = process.argv
  switch (cmd) {
    case 'install': {
      const source = args[0]
      if (!source) {
        console.error('Usage: rolecraft install <source>')
        console.error('Source can be a local path (./, /, ~) or a GitHub ref (owner/repo)')
        process.exit(1)
      }

      const flags = args.slice(1)
      const hasAnyFlag = flags.some(f => ['--global', '--project', '--claude', '--all'].includes(f))
      const options = hasAnyFlag ? {
        global: flags.includes('--global') || flags.includes('--all'),
        claude: flags.includes('--claude') || flags.includes('--all'),
        project: flags.includes('--project') || flags.includes('--all'),
      } : {}

      await installCommand(source, options)
      break
    }

    case 'list':
      await listCommand(process.cwd())
      break

    case 'remove': {
      const slug = args[0]
      if (!slug) {
        console.error('Usage: rolecraft remove <slug>')
        process.exit(1)
      }
      await removeCommand(slug)
      break
    }

    case 'help':
    case '--help':
    case '-h':
    default:
      usage()
      break
  }
}

import { fileURLToPath } from 'node:url'
import { realpathSync } from 'node:fs'

export async function run() {
  try {
    await main()
  } catch (err) {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  }
}

const isEntryPoint = process.argv[1]
  && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))

if (isEntryPoint) {
  run()
}
