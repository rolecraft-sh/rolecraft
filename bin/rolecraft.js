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
import { agentsCommand } from '../src/commands/agents.js'
import { agentsXmlCommand } from '../src/commands/agents-xml.js'
import { mcpCommand } from '../src/commands/mcp.js'
import { watchCommand } from '../src/commands/watch.js'
import { convertCommand } from '../src/commands/convert.js'
import { profileCommand } from '../src/commands/profile.js'
import { testCommand } from '../src/commands/test.js'
import { diffCommand } from '../src/commands/diff.js'
import { composeCommand } from '../src/commands/compose.js'
import { publishCommand } from '../src/commands/publish.js'
import { rollbackCommand } from '../src/commands/rollback.js'
import agents from '../src/agents.js'
import { showError, UserError } from '../src/utils/errors.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
)

// ── Shared CLI helpers ──────────────────────────────────────────────

/** Check if args request help display */
function isHelp(args) {
  return args.includes('--help') || args.includes('-h')
}

/** Return only flag-style args (starting with -) */
function parseFlags(args) {
  return args.filter((a) => a.startsWith('-'))
}

/** Return only positional (non-flag) args */
function parsePositionals(args) {
  return args.filter((a) => !a.startsWith('-'))
}

/**
 * Extract the value after a named flag (e.g. --skill react-rules).
 * Returns undefined when the flag is absent or has no subsequent value.
 */
function parseFlagValue(args, flag) {
  const idx = args.indexOf(flag)
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('-')) {
    return args[idx + 1]
  }
  return undefined
}

/**
 * Parse --skill react-rules,other-skill into an array of skill names.
 * Returns undefined when the flag is absent.
 */
function parseSkillOption(args) {
  const val = parseFlagValue(args, '--skill')
  return val ? val.split(',').map((s) => s.trim()) : undefined
}

/**
 * Build scope options for install-like commands from a flags array:
 * - yes/dryRun/noMcp/frozenLockfile/symlink/list are booleans
 * - global/project/all + per-agent flags
 */
function buildInstallScope(flags, agents) {
  const scope = {
    global: flags.includes('--global') || flags.includes('--all'),
    project: flags.includes('--project') || flags.includes('--all'),
    ...Object.fromEntries(
      agents.map((a) => [
        a.flag,
        flags.includes(`--${a.flag}`) || flags.includes('--all'),
      ]),
    ),
  }
  // If no scope flags set, return empty — caller will prompt
  const scopeFlags = [
    '--global',
    '--project',
    '--all',
    ...agents.map((a) => `--${a.flag}`),
  ]
  return scopeFlags.some((f) => flags.includes(f)) ? scope : {}
}

// ── Command registry ──────────────────────────────────────────────

function usage() {
  const agentFlags = agents.map(
    (a) => `  --${a.flag.padEnd(15)} Also install to ${a.label}`,
  )

  console.log(`
rolecraft — Install AI agent skills like roles & behaviors

Zero dependencies, no marketplace required.
Works with ${agents.length} agents: ${agents.map((a) => a.name).join(', ')}, and all spec-compliant agents.

Usage:
  rolecraft install <source>        Install a skill (local path, owner/repo, npm:package, or registry slug)
  rolecraft publish <source>        Publish a skill to the rolecraft Registry
  rolecraft bundle <source> [...]   Install skills from a file or inline sources
  rolecraft bundle create [<name>]  Create a new bundle file
  rolecraft use <source>            Preview a skill without installing
  rolecraft list                    List installed skills (--json)
  rolecraft remove <slug>           Remove a skill
  rolecraft update <slug>           Re-install a skill (update to latest)
  rolecraft rollback <slug>         Restore a skill to previous version
  rolecraft setup [<source>]        Detect agents and optionally install a skill
  rolecraft init [<name>]           Scaffold a new SKILL.md (--template, --list)
  rolecraft search <query>          Search for skills on GitHub
  rolecraft search <query> --skills-sh  Search skills.sh (experimental)
  rolecraft search <query> --registry  Search the rolecraft Registry
  rolecraft check                   Check for available skill updates
  rolecraft verify                  Verify installed skill integrity
  rolecraft ci                      Install all skills from lockfile
  rolecraft completions <shell>     Generate shell completions (bash|zsh|fish)
  rolecraft doctor                  Run system health check (--json, --network, --deep)
  rolecraft watch [<slug>]          Watch skills for changes and auto-sync
  rolecraft profile                 Manage agent configuration profiles
  rolecraft mcp install <source>    Install an MCP server (npm:, gh:, or local path)
  rolecraft mcp list                List configured MCP servers
  rolecraft mcp search <query>      Search for MCP servers (--npm, --interactive)
  rolecraft mcp check               Check for MCP server updates
  rolecraft mcp update <name>       Update an MCP server
  rolecraft mcp remove <name>       Remove an MCP server
  rolecraft agents                  Show agent capability manifest
  rolecraft agents --json            Output manifest as JSON
  rolecraft agents-xml              Generate skills XML for AGENTS.md
  rolecraft agents-xml --write      Write skills XML to AGENTS.md
  rolecraft upgrade                 Upgrade rolecraft to the latest version
  rolecraft convert <source>        Convert a skill between SKILL.md and .mdc formats
  rolecraft diff <skill-a> <skill-b>  Compare two skills section-by-section
  rolecraft compose <a> <b> [...]     Compose multiple skills
  rolecraft test <skill-path>       Test a skill quality
  rolecraft help                    Show this help

Options:
  --yes, -y      Non-interactive: accept all defaults (install, setup, mcp, profile)
  --dry-run      Preview without making changes (install, setup, bundle, upgrade, profile, mcp, update, remove, watch)
  --no-mcp       Skip MCP server installation from skills (install, bundle)
  --version, -v  Show rolecraft version

Options for diff:
  --json         Output structured JSON
  --brief        Show only summary of changes
  --context <n>  Show N lines of context around each change
  --no-color     Disable colored output

Options for compose:
  --chain        Override mode (last skill wins), default: merge
  --output, -o   Write to file instead of stdout
  --name <name>  Set output skill name
  --dry-run      Preview merge result without writing
  --force        Overwrite existing output file
  --json         Output structured JSON
  --no-color     Disable colored output

Options for test:
  --all          Test all installed skills
  --json         Output structured JSON
  --verbose      Show detailed results
  --no-color     Disable colored output
  --no-emoji     Use ASCII fallback for emojis
  --min-score <n> Fail if score is below threshold
  --only <names> Run specific checks (comma-separated)

Options for use:
  --list         List available skills from a source without previewing
  --skill <names> Preview specific skills by name (comma-separated)

Options for search:
  --interactive  Interactive TUI picker
  --skills-sh    Search skills.sh instead of GitHub
  --registry     Search the rolecraft Registry

Options for init:
  --list              List available templates
  --template <name>   Scaffold from a named template (basic, standard, mcp, rules, empty)

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

Options for publish:
  --dry-run      Preview what would be published without creating a PR
  --yes, -y      Skip confirmation prompt
  --repo <ref>   GitHub repository (owner/repo) to associate with the skill
  --slug <slug>  Override the skill slug from SKILL.md frontmatter
  --name <name>  Override the skill name from SKILL.md frontmatter

Examples:
  rolecraft publish ./my-skill
  rolecraft publish ./my-skill --dry-run
  rolecraft publish ./my-skill --repo owner/repo
  rolecraft install ./my-skill
  rolecraft install rolecraft-sh/skills
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

// ── Command handlers (one per top-level command) ──────────────────

const COMMANDS = {
  install(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const pos = parsePositionals(args)
    const source = pos[0]
    if (!source) {
      console.error('Usage: rolecraft install <source>')
      console.error(
        'Source can be a local path (./, /, ~), GitHub ref (owner/repo), or npm package (npm:package)',
      )
      throw new UserError('Missing source argument.', {
        suggestion:
          'rolecraft install ./my-skill, rolecraft install owner/repo, or rolecraft install npm:package',
        code: 'MISSING_SOURCE',
      })
    }
    const flags = parseFlags(args)
    const scope = buildInstallScope(flags, agents)
    const opts = {
      ...scope,
      frozenLockfile: flags.includes('--frozen-lockfile'),
      symlink: flags.includes('--symlink'),
      dryRun: flags.includes('--dry-run'),
      yes: flags.includes('--yes') || flags.includes('-y'),
      noMcp: flags.includes('--no-mcp'),
      list: flags.includes('--list'),
      skill: parseSkillOption(args),
    }
    return installCommand(source, opts)
  },

  async list(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    return listCommand(process.cwd(), { json: args.includes('--json') })
  },

  async remove(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const pos = parsePositionals(args)
    const slug = pos[0]
    if (!slug) {
      console.error('Usage: rolecraft remove <slug>')
      throw new Error('Missing slug argument.')
    }
    return removeCommand(slug, { dryRun: args.includes('--dry-run') })
  },

  async update(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const pos = parsePositionals(args)
    const slug = pos[0]
    if (!slug) {
      console.error('Usage: rolecraft update <slug>')
      throw new Error('Missing slug argument.')
    }
    return updateCommand(slug, { dryRun: args.includes('--dry-run') })
  },

  async use(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const pos = parsePositionals(args)
    const source = pos[0]
    if (!source) {
      console.error('Usage: rolecraft use <source>')
      console.error(
        'Source can be a local path (./, /, ~), GitHub ref (owner/repo), or npm package (npm:package)',
      )
      throw new Error('Missing source argument.')
    }
    return useCommand(source, {
      list: args.includes('--list'),
      skill: parseSkillOption(args),
    })
  },

  async init(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const pos = parsePositionals(args)
    const flags = parseFlags(args)
    return initCommand(pos[0], {
      list: flags.includes('--list'),
      template: parseFlagValue(args, '--template'),
      description: parseFlagValue(args, '--description'),
      agents: parseFlagValue(args, '--agents'),
    })
  },

  async search(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const pos = parsePositionals(args)
    const query = pos[0]
    if (!query) {
      console.error(
        'Usage: rolecraft search <query> [--interactive] [--registry]',
      )
      throw new Error('Missing query argument.')
    }
    return searchCommand(query, {
      interactive: args.includes('--interactive'),
      skillsSh: args.includes('--skills-sh'),
      registry: args.includes('--registry'),
    })
  },

  async completions(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const pos = parsePositionals(args)
    return completionsCommand(pos[0])
  },

  async verify(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    return verifyCommand(true)
  },

  async check(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    return checkCommand()
  },

  async ci(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    return ciCommand()
  },

  async setup(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const pos = parsePositionals(args)
    const source = pos[0]
    return setupCommand(source, {
      dryRun: args.includes('--dry-run'),
      yes: args.includes('--yes') || args.includes('-y'),
      list: args.includes('--list'),
      skill: parseSkillOption(args),
    })
  },

  async upgrade(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    return upgradeCommand({ dryRun: args.includes('--dry-run') })
  },

  async doctor(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    return doctorCommand({
      json: args.includes('--json'),
      network: args.includes('--network'),
      deep: args.includes('--deep'),
    })
  },

  async watch(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const pos = parsePositionals(args)
    const slug = pos[0]
    const { watchers } = await watchCommand(slug, process.cwd(), {
      dryRun: args.includes('--dry-run'),
    })
    if (watchers.length === 0) return
    process.on('SIGINT', () => {
      console.log('\nStopping watch...')
      for (const w of watchers) w.close()
      process.exit(0)
    })
    await new Promise(() => {})
  },

  async agents(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    return agentsCommand({ json: args.includes('--json') })
  },

  async 'agents-xml'(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    return agentsXmlCommand(args.includes('--write'))
  },

  async convert(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const pos = parsePositionals(args)
    const source = pos[0]
    if (!source) {
      console.error('Usage: rolecraft convert <source>')
      throw new Error('Missing source argument.')
    }
    return convertCommand(source, {
      dryRun: args.includes('--dry-run'),
      output: parseFlagValue(args, '--output'),
    })
  },

  async diff(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const pos = parsePositionals(args)
    return diffCommand(pos[0], pos[1], {
      json: args.includes('--json'),
      brief: args.includes('--brief'),
      noColor: args.includes('--no-color'),
      context: parseFlagValue(args, '--context'),
    })
  },

  async compose(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const pos = parsePositionals(args)
    return composeCommand(pos, {
      mode: args.includes('--chain') ? 'chain' : 'merge',
      dryRun: args.includes('--dry-run'),
      force: args.includes('--force'),
      json: args.includes('--json'),
      noColor: args.includes('--no-color'),
      name: parseFlagValue(args, '--name'),
      output: parseFlagValue(args, '--output') || parseFlagValue(args, '-o'),
    })
  },

  async testCommand(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const pos = parsePositionals(args)
    const skillPath = pos[0]
    const minScore = parseFlagValue(args, '--min-score')
    return testCommand(skillPath, {
      json: args.includes('--json'),
      verbose: args.includes('--verbose') || args.includes('-v'),
      noColor: args.includes('--no-color'),
      noEmoji: args.includes('--no-emoji'),
      all: args.includes('--all'),
      minScore: minScore ? parseInt(minScore, 10) : undefined,
      only: parseSkillOption(args),
    })
  },

  async bundle(args) {
    if (isHelp(args)) {
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
      const createArgs = args.slice(1)
      if (isHelp(createArgs)) {
        usage()
        return
      }
      return bundleCreateCommand(parsePositionals(createArgs)[0])
    }
    const flags = parseFlags(args)
    const sources = parsePositionals(args)
    const opts = {
      dryRun: flags.includes('--dry-run'),
      noMcp: flags.includes('--no-mcp'),
    }
    if (sources.length === 1) {
      return bundleCommand(sources[0], opts)
    }
    return bundleCommand(sources, opts)
  },

  async publish(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    const opts = { dryRun: false, yes: false, repo: '', slug: '', name: '' }
    const pos = []
    for (let i = 0; i < args.length; i++) {
      const a = args[i]
      if (a === '--dry-run') opts.dryRun = true
      else if (a === '--yes' || a === '-y') opts.yes = true
      else if (a === '--repo') opts.repo = args[++i] || ''
      else if (a === '--slug') opts.slug = args[++i] || ''
      else if (a === '--name') opts.name = args[++i] || ''
      else if (!a.startsWith('-')) pos.push(a)
    }
    const source = pos[0]
    if (!source) {
      console.error(
        'Usage: rolecraft publish <source> [--repo owner/repo] [--dry-run]',
      )
      throw new Error('Missing source argument.')
    }
    return publishCommand(source, opts)
  },

  async profile(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    return profileCommand(args)
  },

  async mcp(args) {
    if (isHelp(args)) {
      usage()
      return
    }
    return mcpCommand(args)
  },

  async rollback(args) {
    // rollback handles --help itself with focused help text
    return rollbackCommand(args)
  },

  async version() {
    console.log(pkg.version)
  },
}

// Alias: test → testCommand (avoid name collision with node:test)
COMMANDS.test = COMMANDS.testCommand
// Alias: check-updates → check
COMMANDS['check-updates'] = COMMANDS.check

// Only non-command names that show usage
const ALWAYS_SHOW_USAGE = new Set(['help', undefined, null])

export async function main() {
  const [, , cmd, ...commandArgs] = process.argv

  if (cmd === '--version' || cmd === '-v') {
    COMMANDS.version()
    return
  }

  if (ALWAYS_SHOW_USAGE.has(cmd)) {
    usage()
    return
  }

  const handler = COMMANDS[cmd]
  if (handler) {
    await handler(commandArgs)
  } else {
    usage()
  }
}

export async function run() {
  try {
    await main()
  } catch (err) {
    showError(err)
    process.exit(1)
  }
}

const isEntryPoint =
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))

if (isEntryPoint) {
  run()
}
