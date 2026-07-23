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
import { agentsXmlCommand } from '../src/commands/agents-xml.js'
import { mcpCommand } from '../src/commands/mcp.js'
import { watchCommand } from '../src/commands/watch.js'
import { convertCommand } from '../src/commands/convert.js'
import { profileCommand } from '../src/commands/profile.js'
import { testCommand } from '../src/commands/test.js'
import { diffCommand } from '../src/commands/diff.js'
import { composeCommand } from '../src/commands/compose.js'
import agents from '../src/agents.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
)

function usage() {
  const agentFlags = agents.map(
    (a) => `  --${a.flag.padEnd(15)} Also install to ${a.label}`,
  )

  console.log(`
rolecraft — Install AI agent skills like roles & behaviors

Zero dependencies, no marketplace required.
Works with ${agents.length} agents: ${agents.map((a) => a.name).join(', ')}, and all spec-compliant agents.

Usage:
  rolecraft install <source>        Install a skill (local path, owner/repo, or npm:package)
  rolecraft bundle <source> [...]   Install skills from a file or inline sources
  rolecraft bundle create [<name>]  Create a new bundle file
  rolecraft use <source>            Preview a skill without installing
  rolecraft list                    List installed skills
  rolecraft remove <slug>           Remove a skill
  rolecraft update <slug>           Re-install a skill (update to latest)
  rolecraft setup [<source>]        Detect agents and optionally install a skill
  rolecraft init [<name>]           Scaffold a new SKILL.md
  rolecraft search <query>          Search for skills on GitHub --skills-sh  Search skills.sh (experimental)
  rolecraft check                   Check for available skill updates
  rolecraft verify                  Verify installed skill integrity
  rolecraft ci                      Install all skills from lockfile
  rolecraft completions <shell>     Generate shell completions (bash|zsh|fish)
  rolecraft doctor                  Run system health check (--json, --network)
  rolecraft watch [<slug>]          Watch skills for changes and auto-sync
  rolecraft profile                 Manage agent configuration profiles
   rolecraft mcp install <source>    Install an MCP server (npm:, gh:, or local path, e.g. npm:pkg@1.0.0 or gh:owner/repo@branch)
   rolecraft mcp list                List configured MCP servers
   rolecraft mcp search <query>      Search for MCP servers (--npm for npm search)
   rolecraft mcp check               Check for MCP server updates
   rolecraft mcp remove <name>       Remove an MCP server
  rolecraft agents-xml              Generate skills XML for AGENTS.md
  rolecraft agents-xml --write      Write skills XML to AGENTS.md
  rolecraft upgrade                 Upgrade rolecraft to the latest version
  rolecraft convert <source>        Convert a skill between SKILL.md and .mdc formats
  rolecraft diff <skill-a> <skill-b>  Compare two skills section-by-section (--json, --brief, --no-color)
  rolecraft compose <a> <b> [...]     Compose multiple skills (--chain, --output, --name, --dry-run, --force)
  rolecraft test <skill-path>       Test a skill quality (--all, --json, --verbose)
  rolecraft help                    Show this help

Options:
  --yes, -y      Non-interactive: accept all defaults (install, setup, mcp, profile)
  --dry-run      Preview without making changes (install, setup, bundle, upgrade, profile, mcp, update, remove, watch)
  --no-mcp       Skip MCP server installation from skills (install, bundle)

Options for use:
  --list         List available skills from a source without previewing
  --skill <names> Preview specific skills by name (comma-separated)

Options for setup:
  --list         List available skills from a source without installing
  --skill <names> Install specific skills by name (comma-separated)

Options for install:
  --yes, -y      Non-interactive: accept all defaults and skip prompts
  --global       Install to ~/.agents/skills/
  --project      Install to ./.agents/skills/ (default)
  --windsurf     Also install to ~/.windsurf/skills/
  --devin        Also install to ~/.devin/skills/
${agentFlags.join('\n')}
  --all              Install to all locations
  --no-mcp           Skip MCP server installation from skill
  --frozen-lockfile  Fail if skill already installed
  --symlink          Install as symlink instead of copy
  --copy             Install as copy (default)
  --list             List available skills from a source without installing
  --skill <names>    Install specific skills by name (comma-separated, e.g. "skill1,skill2")

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
  const [, , cmd, ...args] = process.argv
  switch (cmd) {
    case 'install': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const installFlags = args.filter((a) => a.startsWith('-'))
      const installPos = args.filter((a) => !a.startsWith('-'))
      const source = installPos[0]
      if (!source) {
        console.error('Usage: rolecraft install <source>')
        console.error(
          'Source can be a local path (./, /, ~), GitHub ref (owner/repo), or npm package (npm:package)',
        )
        throw new Error('Missing source argument.')
      }

      const flags = installFlags
      const scopeFlags = [
        '--global',
        '--project',
        '--all',
        ...agents.map((a) => `--${a.flag}`),
      ]
      const hasScopeFlag = flags.some((f) => scopeFlags.includes(f))
      const options = hasScopeFlag
        ? {
            global: flags.includes('--global') || flags.includes('--all'),
            project: flags.includes('--project') || flags.includes('--all'),
            ...Object.fromEntries(
              agents.map((a) => [
                a.flag,
                flags.includes(`--${a.flag}`) || flags.includes('--all'),
              ]),
            ),
          }
        : {}
      options.frozenLockfile = flags.includes('--frozen-lockfile')
      options.symlink = flags.includes('--symlink')
      options.dryRun = flags.includes('--dry-run')
      options.yes = flags.includes('--yes') || flags.includes('-y')
      options.noMcp = flags.includes('--no-mcp')
      options.list = flags.includes('--list')

      const skillIndex = flags.indexOf('--skill')
      if (
        skillIndex !== -1 &&
        flags[skillIndex + 1] &&
        !flags[skillIndex + 1].startsWith('-')
      ) {
        options.skill = flags[skillIndex + 1].split(',').map((s) => s.trim())
      }

      await installCommand(source, options)
      break
    }

    case 'list': {
      const options = {
        json: args.includes('--json'),
      }

      await listCommand(process.cwd(), options)
      break
    }

    case 'remove': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const slug = args[0]
      if (!slug) {
        console.error('Usage: rolecraft remove <slug>')
        throw new Error('Missing slug argument.')
      }
      const removeFlags = args.filter((a) => a.startsWith('-'))
      await removeCommand(slug, { dryRun: removeFlags.includes('--dry-run') })
      break
    }

    case 'update': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const slug = args[0]
      if (!slug) {
        console.error('Usage: rolecraft update <slug>')
        throw new Error('Missing slug argument.')
      }
      const updateFlags = args.filter((a) => a.startsWith('-'))
      await updateCommand(slug, { dryRun: updateFlags.includes('--dry-run') })
      break
    }

    case 'use': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const source = args[0]
      if (!source) {
        console.error('Usage: rolecraft use <source>')
        console.error(
          'Source can be a local path (./, /, ~), GitHub ref (owner/repo), or npm package (npm:package)',
        )
        throw new Error('Missing source argument.')
      }
      const useFlags = args.filter((a) => a.startsWith('-'))
      const useOptions = {
        list: useFlags.includes('--list'),
      }
      const skillIndex = useFlags.indexOf('--skill')
      if (
        skillIndex !== -1 &&
        useFlags[skillIndex + 1] &&
        !useFlags[skillIndex + 1].startsWith('-')
      ) {
        useOptions.skill = useFlags[skillIndex + 1]
          .split(',')
          .map((s) => s.trim())
      }
      await useCommand(source, useOptions)
      break
    }

    case 'init': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const name = args[0]
      await initCommand(name)
      break
    }

    case 'search': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const query = args[0]
      const flags = args.slice(1)
      if (!query) {
        console.error('Usage: rolecraft search <query> [--interactive]')
        throw new Error('Missing query argument.')
      }
      await searchCommand(query, {
        interactive: flags.includes('--interactive'),
        skillsSh: flags.includes('--skills-sh'),
      })
      break
    }

    case 'completions': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const shell = args[0]
      await completionsCommand(shell)
      break
    }

    case 'verify': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      await verifyCommand(true)
      break
    }

    case 'check':
    case 'check-updates': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      await checkCommand()
      break
    }

    case 'ci': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      await ciCommand()
      break
    }

    case 'setup': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const setupFlags = args.filter((a) => a.startsWith('-'))
      const setupPos = args.filter((a) => !a.startsWith('-'))
      const source = setupPos[0]
      const setupOptions = {
        dryRun: setupFlags.includes('--dry-run'),
        yes: setupFlags.includes('--yes') || setupFlags.includes('-y'),
        list: setupFlags.includes('--list'),
      }
      const skillIndex = setupFlags.indexOf('--skill')
      if (
        skillIndex !== -1 &&
        setupFlags[skillIndex + 1] &&
        !setupFlags[skillIndex + 1].startsWith('-')
      ) {
        setupOptions.skill = setupFlags[skillIndex + 1]
          .split(',')
          .map((s) => s.trim())
      }
      await setupCommand(source, setupOptions)
      break
    }

    case 'upgrade': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const flags = args
      await upgradeCommand({ dryRun: flags.includes('--dry-run') })
      break
    }

    case 'doctor': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const doctorFlags = args.filter((a) => a.startsWith('-'))
      await doctorCommand({
        json: doctorFlags.includes('--json'),
        network: doctorFlags.includes('--network'),
      })
      break
    }

    case 'watch': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const slug = args[0]
      const watchFlags = args.filter((a) => a.startsWith('-'))
      const { watchers } = await watchCommand(slug, process.cwd(), {
        dryRun: watchFlags.includes('--dry-run'),
      })
      if (watchers.length === 0) {
        return
      }
      process.on('SIGINT', () => {
        console.log('\nStopping watch...')
        for (const w of watchers) w.close()
        process.exit(0)
      })
      await new Promise(() => {})
      break
    }

    case 'agents-xml':
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      await agentsXmlCommand(args.includes('--write'))
      break

    case 'version':
    case '--version':
    case '-v':
      console.log(pkg.version)
      break

    case 'convert': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const source = args[0]
      if (!source) {
        console.error('Usage: rolecraft convert <source>')
        throw new Error('Missing source argument.')
      }
      const convertFlags = args.filter((a) => a.startsWith('-'))
      await convertCommand(source, {
        dryRun: convertFlags.includes('--dry-run'),
      })
      break
    }

    case 'diff': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const diffFlags = args.filter((a) => a.startsWith('-'))
      const diffPos = args.filter((a) => !a.startsWith('-'))
      const diffOptions = {
        json: diffFlags.includes('--json'),
        brief: diffFlags.includes('--brief'),
        noColor: diffFlags.includes('--no-color'),
      }
      const contextIndex = diffFlags.indexOf('--context')
      if (
        contextIndex !== -1 &&
        diffFlags[contextIndex + 1] &&
        !diffFlags[contextIndex + 1].startsWith('-')
      ) {
        diffOptions.context = parseInt(diffFlags[contextIndex + 1], 10)
      }
      await diffCommand(diffPos[0], diffPos[1], diffOptions)
      break
    }

    case 'compose': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const composeFlags = args.filter((a) => a.startsWith('-'))
      const composePos = args.filter((a) => !a.startsWith('-'))
      const composeOptions = {
        mode: composeFlags.includes('--chain') ? 'chain' : 'merge',
        dryRun: composeFlags.includes('--dry-run'),
        force: composeFlags.includes('--force'),
        json: composeFlags.includes('--json'),
        noColor: composeFlags.includes('--no-color'),
      }
      const nameIndex = composeFlags.indexOf('--name')
      if (
        nameIndex !== -1 &&
        composeFlags[nameIndex + 1] &&
        !composeFlags[nameIndex + 1].startsWith('-')
      ) {
        composeOptions.name = composeFlags[nameIndex + 1]
      }
      const outputIndex =
        composeFlags.indexOf('--output') !== -1
          ? composeFlags.indexOf('--output')
          : composeFlags.indexOf('-o')
      if (
        outputIndex !== -1 &&
        composeFlags[outputIndex + 1] &&
        !composeFlags[outputIndex + 1].startsWith('-')
      ) {
        composeOptions.output = composeFlags[outputIndex + 1]
      }
      await composeCommand(composePos, composeOptions)
      break
    }

    case 'test': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      const testFlags = args.filter((a) => a.startsWith('-'))
      const testPos = args.filter((a) => !a.startsWith('-'))
      const skillPath = testPos[0]
      const testOptions = {
        json: testFlags.includes('--json'),
        verbose: testFlags.includes('--verbose') || testFlags.includes('-v'),
        noColor: testFlags.includes('--no-color'),
        noEmoji: testFlags.includes('--no-emoji'),
        all: testFlags.includes('--all'),
      }
      const minScoreIndex = testFlags.indexOf('--min-score')
      if (
        minScoreIndex !== -1 &&
        testFlags[minScoreIndex + 1] &&
        !testFlags[minScoreIndex + 1].startsWith('-')
      ) {
        testOptions.minScore = parseInt(testFlags[minScoreIndex + 1], 10)
      }
      const onlyIndex = testFlags.indexOf('--only')
      if (
        onlyIndex !== -1 &&
        testFlags[onlyIndex + 1] &&
        !testFlags[onlyIndex + 1].startsWith('-')
      ) {
        testOptions.only = testFlags[onlyIndex + 1]
          .split(',')
          .map((s) => s.trim())
      }
      await testCommand(skillPath, testOptions)
      break
    }

    case 'bundle': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      if (args.length === 0) {
        console.error('Usage: rolecraft bundle <source> [...]')
        console.error('       rolecraft bundle <file>')
        console.error('       rolecraft bundle create [<name>]')
        throw new Error('Missing arguments.')
      }
      if (args[0] === 'create') {
        if (args.includes('--help') || args.includes('-h')) {
          usage()
          return
        }
        await bundleCreateCommand(args[1])
        break
      }
      const flags = args.filter((a) => a.startsWith('--'))
      const sources = args.filter((a) => !a.startsWith('--'))
      const opts = {
        dryRun: flags.includes('--dry-run'),
        noMcp: flags.includes('--no-mcp'),
      }
      if (sources.length === 1) {
        await bundleCommand(sources[0], opts)
      } else {
        await bundleCommand(sources, opts)
      }
      break
    }

    case 'profile': {
      await profileCommand(args)
      break
    }

    case 'mcp': {
      if (args.includes('--help') || args.includes('-h')) {
        usage()
        return
      }
      await mcpCommand(args)
      break
    }
    default:
      usage()
      break
  }
}

export async function run() {
  try {
    await main()
  } catch (err) {
    console.error(
      '\n❌ %s',
      String(err?.message || err)
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r'),
    )
    process.exit(1)
  }
}

const isEntryPoint =
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))

if (isEntryPoint) {
  run()
}
