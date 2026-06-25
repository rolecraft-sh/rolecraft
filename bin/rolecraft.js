#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { installCommand } from '../src/commands/install.js'
import { listCommand } from '../src/commands/list.js'
import { removeCommand } from '../src/commands/remove.js'
import { updateCommand } from '../src/commands/update.js'
import { useCommand } from '../src/commands/use.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))

function usage() {
  console.log(`
rolecraft — Install AI agent skills like roles & behaviors

Zero dependencies, no marketplace required.
Works with opencode, claude-code, cursor, windsurf, codex, copilot, aider, cline, and all spec-compliant agents.

Usage:
  rolecraft install <source>     Install a skill (local path or owner/repo)
  rolecraft use <source>         Preview a skill without installing
  rolecraft list                 List installed skills
  rolecraft remove <slug>        Remove a skill
  rolecraft update <slug>        Re-install a skill (update to latest)
  rolecraft help                 Show this help

Options for install:
  --global     Install to ~/.agents/skills/ (default)
  --claude     Also install to ~/.claude/skills/
  --cursor     Also install to ~/.cursor/skills/
  --windsurf   Also install to ~/.windsurf/skills/
  --codex      Also install to ~/.codex/skills/
  --copilot    Also install to ~/.copilot/skills/
  --aider      Also install to ~/.aider/skills/
  --cline      Also install to ~/.cline/skills/
  --project    Install to ./.agents/skills/
  --all        Install to all locations

Examples:
  rolecraft install ./my-skill
  rolecraft install sametcelikbicak/task-decomposer
  rolecraft install ./skills/my-skill --claude --cursor
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
      const knownFlags = ['--global', '--project', '--claude', '--cursor', '--windsurf', '--codex', '--copilot', '--aider', '--cline', '--all']
      const hasAnyFlag = flags.some(f => knownFlags.includes(f))
      const options = hasAnyFlag ? {
        global: flags.includes('--global') || flags.includes('--all'),
        claude: flags.includes('--claude') || flags.includes('--all'),
        cursor: flags.includes('--cursor') || flags.includes('--all'),
        windsurf: flags.includes('--windsurf') || flags.includes('--all'),
        codex: flags.includes('--codex') || flags.includes('--all'),
        copilot: flags.includes('--copilot') || flags.includes('--all'),
        aider: flags.includes('--aider') || flags.includes('--all'),
        cline: flags.includes('--cline') || flags.includes('--all'),
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

    case 'update': {
      const slug = args[0]
      if (!slug) {
        console.error('Usage: rolecraft update <slug>')
        process.exit(1)
      }
      await updateCommand(slug)
      break
    }

    case 'use': {
      const source = args[0]
      if (!source) {
        console.error('Usage: rolecraft use <source>')
        console.error('Source can be a local path (./, /, ~) or a GitHub ref (owner/repo)')
        process.exit(1)
      }
      await useCommand(source)
      break
    }

    case 'version':
    case '--version':
    case '-v':
      console.log(pkg.version)
      break

    case 'help':
    case '--help':
    case '-h':
    default:
      usage()
      break
  }
}

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
