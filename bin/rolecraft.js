#!/usr/bin/env node

import { readFileSync, realpathSync } from 'node:fs'
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
import { checkCommand } from '../src/commands/check.js'
import { ciCommand } from '../src/commands/ci.js'
import { bundleCommand, bundleCreateCommand } from '../src/commands/bundle.js'
import { completionsCommand } from '../src/commands/completions.js'
import { upgradeCommand } from '../src/commands/upgrade.js'
import { doctorCommand } from '../src/commands/doctor.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))

function usage() {
  console.log(`
rolecraft — Install AI agent skills like roles & behaviors

Zero dependencies, no marketplace required.
Works with 65+ agents: opencode, claude-code, cursor, windsurf, devin, codex, copilot, aider, cline, gemini-cli, cody, continue, warp, codeium, fabric, goose, tabnine, supermaven, pr-pilot, loom, roo, trae, hermes, kiro, augment, kilo, openhands, junie, factory, command-code, cortex, mistral-vibe, qwen-code, openclaw, codebuddy, mux, pi, autohand-code, rovo, firebender, bob, aider-desk, code-arts-doer, code-maker, code-studio, crush, eve, forge, inference-sh, jazz, iflow, kilo-code, kode, lingma, mcp-jam, moxby, ona, qoder, reasonix, terra-mind, tiny-cloud, zencoder, and all spec-compliant agents.

Usage:
  rolecraft install <source>     Install a skill (local path, owner/repo, or npm:package)
  rolecraft bundle <source> [...] Install skills from a file or inline sources
  rolecraft bundle create [<name>]  Create a new bundle file
  rolecraft use <source>         Preview a skill without installing
  rolecraft list                 List installed skills
  rolecraft remove <slug>        Remove a skill
  rolecraft update <slug>        Re-install a skill (update to latest)
  rolecraft setup [<source>]     Detect agents and optionally install a skill
  rolecraft init [<name>]        Scaffold a new SKILL.md
  rolecraft search <query>       Search for skills on GitHub
  rolecraft check                Check for available skill updates
  rolecraft verify               Verify installed skill integrity
  rolecraft ci                   Install all skills from lockfile
  rolecraft completions <shell>  Generate shell completions (bash|zsh|fish)
  rolecraft doctor               Run system health check
  rolecraft upgrade              Upgrade rolecraft to the latest version
  rolecraft help                 Show this help

Options:
  --yes, -y     Non-interactive: accept all defaults (install, setup)
  --dry-run      Preview installation without copying files (install, setup, bundle, upgrade)

Options for upgrade:
  --dry-run      Check for updates without actually upgrading

Options for install:
  --global       Install to ~/.agents/skills/
  --project      Install to ./.agents/skills/ (default)
  --claude       Also install to ~/.claude/skills/
  --cursor       Also install to ~/.cursor/skills/
  --windsurf     Also install to ~/.windsurf/skills/ (deprecated: use --devin)
  --devin        Also install to ~/.devin/skills/
  --codex        Also install to ~/.codex/skills/
  --copilot      Also install to ./.github/copilot/skills/
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
  --command-code  Also install to ~/.commandcode/skills/
  --cortex        Also install to ~/.snowflake/cortex/skills/
  --mistral-vibe  Also install to ~/.vibe/skills/
  --qwen-code     Also install to ~/.qwen/skills/
  --openclaw      Also install to ~/.openclaw/skills/
  --codebuddy     Also install to ~/.codebuddy/skills/
  --mux           Also install to ~/.mux/skills/
  --pi            Also install to ~/.pi/agent/skills/
  --autohand-code Also install to ~/.autohand/skills/
  --rovo          Also install to ~/.rovodev/skills/
  --firebender    Also install to ~/.firebender/skills/
  --bob           Also install to ~/.bob/skills/
  --aider-desk    Also install to ~/.aider-desk/skills/
  --all          Install to all locations
  --frozen-lockfile  Fail if skill already installed
  --symlink      Install as symlink instead of copy
  --copy         Install as copy (default)
  --dry-run      Preview installation without copying files
  --interactive  Choose and install a skill from search results

Examples:
  rolecraft install ./my-skill
  rolecraft install sametcelikbicak/task-decomposer
  rolecraft install npm:lodash
  rolecraft install npm:@scope/package@1.0.0
  rolecraft install ./skills/my-skill --claude --cursor
  rolecraft bundle ./team-skills.json
  rolecraft bundle owner/skill1 owner/skill2 ./local-skill
  rolecraft bundle owner/skill1 owner/skill2 --dry-run
  rolecraft bundle create my-collection
  rolecraft list
  rolecraft remove task-decomposer
`)
}

export async function main() {
  const [,, cmd, ...args] = process.argv
  switch (cmd) {
    case 'install': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const source = args[0]
      if (!source) {
        console.error('Usage: rolecraft install <source>')
        console.error('Source can be a local path (./, /, ~), GitHub ref (owner/repo), or npm package (npm:package)')
        process.exit(1)
      }

      const flags = args.slice(1)
      const scopeFlags = ['--global', '--project', '--claude', '--cursor', '--windsurf', '--devin', '--codex', '--copilot', '--aider', '--cline', '--gemini', '--cody', '--continue', '--warp', '--codeium', '--fabric', '--goose', '--tabnine', '--supermaven', '--pr-pilot', '--loom', '--roo', '--trae', '--hermes', '--kiro', '--augment', '--kilo', '--openhands', '--junie', '--factory', '--command-code', '--cortex', '--mistral-vibe', '--qwen-code', '--openclaw', '--codebuddy',
  '--mux', '--pi', '--autohand-code', '--rovo', '--firebender', '--bob', '--aider-desk',
  '--code-arts-doer', '--code-maker', '--code-studio', '--crush', '--eve', '--forge', '--inference-sh', '--jazz', '--iflow', '--kilo-code', '--kode', '--lingma', '--mcp-jam', '--moxby', '--ona', '--qoder', '--reasonix', '--terra-mind', '--tiny-cloud', '--zencoder',
  '--all']
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
        'command-code': flags.includes('--command-code') || flags.includes('--all'),
        cortex: flags.includes('--cortex') || flags.includes('--all'),
        'mistral-vibe': flags.includes('--mistral-vibe') || flags.includes('--all'),
        'qwen-code': flags.includes('--qwen-code') || flags.includes('--all'),
        openclaw: flags.includes('--openclaw') || flags.includes('--all'),
        codebuddy: flags.includes('--codebuddy') || flags.includes('--all'),
        mux: flags.includes('--mux') || flags.includes('--all'),
        pi: flags.includes('--pi') || flags.includes('--all'),
        'autohand-code': flags.includes('--autohand-code') || flags.includes('--all'),
        rovo: flags.includes('--rovo') || flags.includes('--all'),
        firebender: flags.includes('--firebender') || flags.includes('--all'),
        bob: flags.includes('--bob') || flags.includes('--all'),
        'aider-desk': flags.includes('--aider-desk') || flags.includes('--all'),
        'code-arts-doer': flags.includes('--code-arts-doer') || flags.includes('--all'),
        'code-maker': flags.includes('--code-maker') || flags.includes('--all'),
        'code-studio': flags.includes('--code-studio') || flags.includes('--all'),
        crush: flags.includes('--crush') || flags.includes('--all'),
        eve: flags.includes('--eve') || flags.includes('--all'),
        forge: flags.includes('--forge') || flags.includes('--all'),
        'inference-sh': flags.includes('--inference-sh') || flags.includes('--all'),
        jazz: flags.includes('--jazz') || flags.includes('--all'),
        iflow: flags.includes('--iflow') || flags.includes('--all'),
        'kilo-code': flags.includes('--kilo-code') || flags.includes('--all'),
        kode: flags.includes('--kode') || flags.includes('--all'),
        lingma: flags.includes('--lingma') || flags.includes('--all'),
        'mcp-jam': flags.includes('--mcp-jam') || flags.includes('--all'),
        moxby: flags.includes('--moxby') || flags.includes('--all'),
        ona: flags.includes('--ona') || flags.includes('--all'),
        qoder: flags.includes('--qoder') || flags.includes('--all'),
        reasonix: flags.includes('--reasonix') || flags.includes('--all'),
        'terra-mind': flags.includes('--terra-mind') || flags.includes('--all'),
        'tiny-cloud': flags.includes('--tiny-cloud') || flags.includes('--all'),
        zencoder: flags.includes('--zencoder') || flags.includes('--all'),
        project: flags.includes('--project') || flags.includes('--all'),
      } : {}
      options.frozenLockfile = flags.includes('--frozen-lockfile')
      options.symlink = flags.includes('--symlink')
      options.dryRun = flags.includes('--dry-run')
      options.yes = flags.includes('--yes') || flags.includes('-y')

      await installCommand(source, options)
      break
    }

    case 'list':
      await listCommand(process.cwd())
      break

    case 'remove': {
      if (args.includes('--help') || args.includes('-h')) { usage(); return }
      const slug = args[0]
      if (!slug) {
        console.error('Usage: rolecraft remove <slug>')
        process.exit(1)
      }
      await removeCommand(slug)
      break
    }

    case 'update': {
      if (args.includes('--help') || args.includes('-h')) { usage(); return }
      const slug = args[0]
      if (!slug) {
        console.error('Usage: rolecraft update <slug>')
        process.exit(1)
      }
      await updateCommand(slug)
      break
    }

    case 'use': {
      if (args.includes('--help') || args.includes('-h')) { usage(); return }
      const source = args[0]
      if (!source) {
        console.error('Usage: rolecraft use <source>')
        console.error('Source can be a local path (./, /, ~), GitHub ref (owner/repo), or npm package (npm:package)')
        process.exit(1)
      }
      await useCommand(source)
      break
    }

    case 'init': {
      if (args.includes('--help') || args.includes('-h')) { usage(); return }
      const name = args[0]
      await initCommand(name)
      break
    }

    case 'search': {
      if (args.includes('--help') || args.includes('-h')) { usage(); return }
      const query = args[0]
      const flags = args.slice(1)
      if (!query) {
        console.error('Usage: rolecraft search <query> [--interactive]')
        process.exit(1)
      }
      await searchCommand(query, { interactive: flags.includes('--interactive') })
      break
    }

    case 'completions': {
      if (args.includes('--help') || args.includes('-h')) { usage(); return }
      const shell = args[0]
      await completionsCommand(shell)
      break
    }

    case 'verify': {
      if (args.includes('--help') || args.includes('-h')) { usage(); return }
      await verifyCommand(true)
      break
    }

    case 'check':
    case 'check-updates': {
      if (args.includes('--help') || args.includes('-h')) { usage(); return }
      await checkCommand()
      break
    }

    case 'ci': {
      if (args.includes('--help') || args.includes('-h')) { usage(); return }
      await ciCommand()
      break
    }

    case 'setup': {
      if (args.includes('--help') || args.includes('-h')) { usage(); return }
      const source = args[0]
      const flags = args.slice(1)
      await setupCommand(source, { dryRun: flags.includes('--dry-run'), yes: flags.includes('--yes') || flags.includes('-y') })
      break
    }

    case 'upgrade': {
      if (args.includes('--help') || args.includes('-h')) { usage(); return }
      const flags = args
      await upgradeCommand({ dryRun: flags.includes('--dry-run') })
      break
    }

    case 'doctor':
      if (args.includes('--help') || args.includes('-h')) { usage(); return }
      await doctorCommand()
      break

    case 'version':
    case '--version':
    case '-v':
      console.log(pkg.version)
      break

    case 'bundle': {
      if (args.includes('--help') || args.includes('-h')) { usage(); return }
      if (args.length === 0) {
        console.error('Usage: rolecraft bundle <source> [...]')
        console.error('       rolecraft bundle <file>')
        console.error('       rolecraft bundle create [<name>]')
        process.exit(1)
      }
      if (args[0] === 'create') {
        if (args.includes('--help') || args.includes('-h')) { usage(); return }
        await bundleCreateCommand(args[1])
        break
      }
      const flags = args.filter(a => a.startsWith('--'))
      const sources = args.filter(a => !a.startsWith('--'))
      const opts = { dryRun: flags.includes('--dry-run') }
      if (sources.length === 1) {
        await bundleCommand(sources[0], opts)
      } else {
        await bundleCommand(sources, opts)
      }
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

export async function run() {
  try {
    await main()
  } catch (err) {
    console.error(err.stack || err.message)
    process.exit(1)
  }
}

const isEntryPoint = process.argv[1]
  && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))

if (isEntryPoint) {
  run().catch((err) => {
    console.error(err.stack || err.message)
    process.exit(1)
  })
}
