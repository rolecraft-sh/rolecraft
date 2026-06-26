#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { installCommand } from '../src/commands/install.js'
import { listCommand } from '../src/commands/list.js'
import { removeCommand } from '../src/commands/remove.js'
import { updateCommand } from '../src/commands/update.js'
import { useCommand } from '../src/commands/use.js'
import { setupCommand } from '../src/commands/setup.js'
import { initCommand } from '../src/commands/init.js'
import { searchCommand } from '../src/commands/search.js'
import { verifyCommand } from '../src/commands/verify.js'
import { ciCommand } from '../src/commands/ci.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))

function usage() {
  console.log(`
rolecraft — Install AI agent skills like roles & behaviors

Zero dependencies, no marketplace required.
Works with opencode, claude-code, cursor, windsurf, devin, codex, copilot, aider, cline, gemini-cli, cody, continue, warp, codeium, fabric, goose, tabnine, supermaven, pr-pilot, loom, roo, trae, hermes, kiro, augment, kilo, openhands, junie, factory, and all spec-compliant agents.

Usage:
  rolecraft install <source>     Install a skill (local path or owner/repo)
  rolecraft use <source>         Preview a skill without installing
  rolecraft list                 List installed skills
  rolecraft remove <slug>        Remove a skill
  rolecraft update <slug>        Re-install a skill (update to latest)
  rolecraft setup [<source>]     Detect agents and optionally install a skill
  rolecraft init [<name>]        Scaffold a new SKILL.md
  rolecraft search <query>       Search for skills on GitHub
  rolecraft verify               Verify installed skill integrity
  rolecraft ci                   Install all skills from lockfile
  rolecraft help                 Show this help

Options for install:
  --global       Install to ~/.agents/skills/
  --project      Install to ./.agents/skills/ (default)
  --claude       Also install to ~/.claude/skills/
  --cursor       Also install to ~/.cursor/skills/
  --windsurf     Also install to ~/.windsurf/skills/ (deprecated: use --devin)
  --devin        Also install to ~/.devin/skills/
  --codex        Also install to ~/.codex/skills/
  --copilot      Also install to ~/.copilot/skills/
  --aider        Also install to ~/.aider/skills/
  --cline        Also install to ~/.cline/skills/
  --gemini       Also install to ~/.gemini/skills/
  --cody         Also install to ~/.cody/skills/
  --continue     Also install to ~/.continue/skills/
  --warp         Also install to ~/.warp/skills/
  --codeium      Also install to ~/.codeium/skills/
  --fabric       Also install to ~/.fabric/skills/
  --goose        Also install to ~/.goose/skills/
  --tabnine      Also install to ~/.tabnine/skills/
  --supermaven   Also install to ~/.supermaven/skills/
  --pr-pilot     Also install to ~/.pr-pilot/skills/
  --loom         Also install to ~/.loom/skills/
  --roo          Also install to ~/.roo/skills/
  --trae         Also install to ~/.trae/skills/
  --hermes       Also install to ~/.hermes/skills/
  --kiro         Also install to ~/.kiro/skills/
  --augment      Also install to ~/.augment/skills/
  --kilo         Also install to ~/.kilo/skills/
  --openhands    Also install to ~/.openhands/skills/
  --junie        Also install to ~/.junie/skills/
  --factory      Also install to ~/.factory/skills/
  --all          Install to all locations
  --frozen-lockfile  Fail if skill already installed
  --symlink      Install as symlink instead of copy
  --copy         Install as copy (default)

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
      const scopeFlags = ['--global', '--project', '--claude', '--cursor', '--windsurf', '--devin', '--codex', '--copilot', '--aider', '--cline', '--gemini', '--cody', '--continue', '--warp', '--codeium', '--fabric', '--goose', '--tabnine', '--supermaven', '--pr-pilot', '--loom', '--roo', '--trae', '--hermes', '--kiro', '--augment', '--kilo', '--openhands', '--junie', '--factory', '--all']
      const hasScopeFlag = flags.some(f => scopeFlags.includes(f))
      const options = hasScopeFlag ? {
        global: flags.includes('--global') || flags.includes('--all'),
        claude: flags.includes('--claude') || flags.includes('--all'),
        cursor: flags.includes('--cursor') || flags.includes('--all'),
        windsurf: flags.includes('--windsurf') || flags.includes('--all'),
        devin: flags.includes('--devin') || flags.includes('--all'),
        codex: flags.includes('--codex') || flags.includes('--all'),
        copilot: flags.includes('--copilot') || flags.includes('--all'),
        aider: flags.includes('--aider') || flags.includes('--all'),
        cline: flags.includes('--cline') || flags.includes('--all'),
        gemini: flags.includes('--gemini') || flags.includes('--all'),
        cody: flags.includes('--cody') || flags.includes('--all'),
        continue: flags.includes('--continue') || flags.includes('--all'),
        warp: flags.includes('--warp') || flags.includes('--all'),
        codeium: flags.includes('--codeium') || flags.includes('--all'),
        fabric: flags.includes('--fabric') || flags.includes('--all'),
        goose: flags.includes('--goose') || flags.includes('--all'),
        tabnine: flags.includes('--tabnine') || flags.includes('--all'),
        supermaven: flags.includes('--supermaven') || flags.includes('--all'),
        'pr-pilot': flags.includes('--pr-pilot') || flags.includes('--all'),
        loom: flags.includes('--loom') || flags.includes('--all'),
        roo: flags.includes('--roo') || flags.includes('--all'),
        trae: flags.includes('--trae') || flags.includes('--all'),
        hermes: flags.includes('--hermes') || flags.includes('--all'),
        kiro: flags.includes('--kiro') || flags.includes('--all'),
        augment: flags.includes('--augment') || flags.includes('--all'),
        kilo: flags.includes('--kilo') || flags.includes('--all'),
        openhands: flags.includes('--openhands') || flags.includes('--all'),
        junie: flags.includes('--junie') || flags.includes('--all'),
        factory: flags.includes('--factory') || flags.includes('--all'),
        project: flags.includes('--project') || flags.includes('--all'),
      } : {}
      options.frozenLockfile = flags.includes('--frozen-lockfile')
      options.symlink = flags.includes('--symlink')

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

    case 'init': {
      const name = args[0]
      await initCommand(name)
      break
    }

    case 'search': {
      const query = args[0]
      if (!query) {
        console.error('Usage: rolecraft search <query>')
        process.exit(1)
      }
      await searchCommand(query)
      break
    }

    case 'verify': {
      await verifyCommand(true)
      break
    }

    case 'ci': {
      await ciCommand()
      break
    }

    case 'setup': {
      const source = args[0]
      await setupCommand(source)
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
