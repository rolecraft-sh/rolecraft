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

import { rollbackCommand } from '../src/commands/rollback.js'
import agents from '../src/agents.js'
import { showError, UserError } from '../src/utils/errors.js'
import { theme } from '../src/utils/tui.js'
import { COMMANDS, aliases, byName, flagNames } from '../src/commands/spec.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
)

// ── Shared CLI helpers ──────────────────────────────────────────────

/** Check if args request help display */
function isHelp(args) {
  return args.includes('--help') || args.includes('-h')
}

/**
 * Return only flag-style args (starting with -). `--verbose` is global (see
 * showError) so it is stripped here rather than whitelisted by every command.
 */
function parseFlags(args) {
  return args.filter((a) => a.startsWith('-') && a !== '--verbose')
}

/** Return only positional (non-flag) args */
function parsePositionals(args) {
  return args.filter((a) => !a.startsWith('-'))
}

/**
 * Validate flags against the spec. Exits 2 so a typo is distinguishable from a
 * failed operation (1). Handlers read flags by exact match, so `--flag=value`
 * is rejected with the supported spelling rather than silently ignored.
 */
function validateFlags(flags, commandName) {
  const spec = byName.get(commandName)
  const allowed = flagNames(spec)
  let bad = false
  for (const f of flags) {
    const eq = f.startsWith('--') ? f.indexOf('=') : -1
    if (eq > 2 && allowed.includes(f.slice(0, eq))) {
      console.error(
        `✗  ${commandName}: "${f}" is not supported — use "${f.slice(0, eq)} ${f.slice(eq + 1)}"`,
      )
      bad = true
      continue
    }
    if (allowed.includes(f)) continue
    console.error(`✗  ${commandName}: unknown flag "${f}"`)
    console.error(
      `   Run "rolecraft ${commandName} --help" to see the accepted flags.`,
    )
    bad = true
  }
  if (bad) process.exitCode = 2
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
 * Parse --skill names into an array of skill names.
 * Supports: --skill a,b  OR  --skill a --skill b  OR  --skill a,b --skill c
 * Returns undefined when the flag is absent.
 */
function parseSkillOption(args) {
  const skills = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--skill' && args[i + 1] && !args[i + 1].startsWith('-')) {
      const vals = args[i + 1].split(',').map((s) => s.trim())
      skills.push(...vals)
      i++
    }
  }
  return skills.length > 0 ? skills : undefined
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

/** One `rolecraft <cmd> <args>` line per spec entry. */
function commandLines() {
  const width = Math.max(
    ...COMMANDS.map((c) => `rolecraft ${c.name} ${c.args}`.trim().length),
  )
  return COMMANDS.filter((c) => c.name !== 'help')
    .map((c) => {
      const label = theme.green(`rolecraft ${c.name} ${c.args}`.trim())
      return `  ${label.padEnd(width + 10)}  ${c.desc}`
    })
    .join('\n')
}

/** `  --flag <arg>   description`, aligned. */
function flagLines(flags) {
  if (!flags.length) return '  (none)'
  const labels = flags.map(
    (f) =>
      `--${f.flag}${f.short ? `, -${f.short}` : ''}${f.arg ? ` <${f.arg}>` : ''}`,
  )
  const width = Math.max(...labels.map((l) => l.length))
  return labels
    .map((label, i) => `  ${label.padEnd(width + 2)}  ${flags[i].desc}`)
    .join('\n')
}

/** Focused help for one command; the root help is usage(). */
function commandUsage(name) {
  const spec = byName.get(name)
  if (!spec) return usage()

  const out = [
    `
${theme.green(`rolecraft ${spec.name} ${spec.args}`.trim())}  —  ${spec.desc}
`,
  ]
  out.push(`Options:\n${flagLines(spec.flags)}`)
  if (spec.subcommands?.length) {
    const labels = spec.subcommands.map((s) => `${s.name}  ${s.desc}`)
    out.push(`\nSubcommands:\n${labels.map((l) => `  ${l}`).join('\n')}`)
  }
  out.push(`
${theme.yellow(`Global flags:`)}
  --verbose       Show error details
  --help, -h      Show this help
  --version, -v   Show rolecraft version
${
  spec.agentFlags
    ? `\nAlso accepts one flag per agent (--claude, --cursor, --codex, ...).\nRun "rolecraft agents" for all ${agents.length}.\n`
    : ''
}
Run "rolecraft help" for the full command list.`)
  console.log(out.join('\n'))
}

function usage() {
  console.log(`
RoleCraft —  The Security-First Skill Manager for AI Agents
${theme.green(`v${pkg.version}`)}

Zero dependencies, no marketplace required.
Works with ${agents.length} agents: ${agents.map((a) => a.name).join(', ')}, and all spec-compliant agents.

${theme.green(`Usage: `)}
${commandLines()}

${theme.yellow(`Global flags (accepted by every command):`)}
  --verbose       Show error details (HTTP status, code, cause)
  --help, -h      Show help for any command
  --version, -v   Show rolecraft version

${theme.yellow(`Environment:`)}
  NO_COLOR        Disable colored output
  FORCE_COLOR     Force colored output even when piped

${theme.yellow(`Exit codes:`)}
  0  success
  1  the command failed (network error, skill not found, nothing installed)
  2  usage error (unknown command, subcommand or flag)

${theme.yellow(`Examples:`)}
  rolecraft install ./my-skill
  rolecraft install sametcelikbicak/coverage-guard
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

const HANDLERS = {
  install(args) {
    if (isHelp(args)) {
      commandUsage('install')
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
      commandUsage('list')
      return
    }
    const agentIndex = args.findIndex(
      (arg) => arg === '--agent' || arg === '-a',
    )
    const agent = agentIndex === -1 ? undefined : args[agentIndex + 1]
    if (agentIndex !== -1 && (!agent || agent.startsWith('-'))) {
      throw new UserError('Missing value for --agent.', {
        suggestion: 'rolecraft list --agent claude',
        code: 'USAGE',
      })
    }
    return listCommand(process.cwd(), {
      json: args.includes('--json'),
      agent,
    })
  },

  async remove(args) {
    if (isHelp(args)) {
      commandUsage('remove')
      return
    }
    const pos = parsePositionals(args)
    const slug = pos[0]
    if (!slug) {
      console.error('Usage: rolecraft remove <slug>')
      throw new UserError('Missing slug argument.', {
        suggestion: 'Run "rolecraft list" to see installed skills.',
        code: 'USAGE',
      })
    }
    return removeCommand(slug, { dryRun: args.includes('--dry-run') })
  },

  async update(args) {
    if (isHelp(args)) {
      commandUsage('update')
      return
    }
    const pos = parsePositionals(args)
    const slug = pos[0]
    if (!slug) {
      console.error('Usage: rolecraft update <slug>')
      throw new UserError('Missing slug argument.', {
        suggestion: 'Run "rolecraft list" to see installed skills.',
        code: 'USAGE',
      })
    }
    return updateCommand(slug, {
      dryRun: args.includes('--dry-run'),
      yes: args.includes('--yes') || args.includes('-y'),
    })
  },

  async use(args) {
    if (isHelp(args)) {
      commandUsage('use')
      return
    }
    const pos = parsePositionals(args)
    const source = pos[0]
    if (!source) {
      console.error('Usage: rolecraft use <source>')
      console.error(
        'Source can be a local path (./, /, ~), GitHub ref (owner/repo), or npm package (npm:package)',
      )
      throw new UserError('Missing source argument.', {
        suggestion: 'rolecraft <cmd> ./my-skill, owner/repo, or npm:package',
        code: 'USAGE',
      })
    }
    return useCommand(source, {
      list: args.includes('--list'),
      skill: parseSkillOption(args),
    })
  },

  async init(args) {
    if (isHelp(args)) {
      commandUsage('init')
      return
    }
    const pos = parsePositionals(args)
    return initCommand(pos[0], {
      list: args.includes('--list'),
      template: parseFlagValue(args, '--template'),
      description: parseFlagValue(args, '--description'),
      agents: parseFlagValue(args, '--agents'),
    })
  },

  async search(args) {
    if (isHelp(args)) {
      commandUsage('search')
      return
    }
    const pos = parsePositionals(args)
    const query = pos[0]
    if (!query) {
      console.error('Usage: rolecraft search <query> [--interactive]')
      throw new UserError('Missing query argument.', {
        suggestion: 'rolecraft search <query>',
        code: 'USAGE',
      })
    }
    return searchCommand(query, {
      interactive: args.includes('--interactive'),
      skillsSh: args.includes('--skills-sh'),
      yes: args.includes('--yes') || args.includes('-y'),
    })
  },

  async completions(args) {
    if (isHelp(args)) {
      commandUsage('completions')
      return
    }
    const pos = parsePositionals(args)
    return completionsCommand(pos[0])
  },

  async verify(args) {
    if (isHelp(args)) {
      commandUsage('verify')
      return
    }
    return verifyCommand(true)
  },

  async check(args) {
    if (isHelp(args)) {
      commandUsage('check')
      return
    }
    return checkCommand()
  },

  async ci(args) {
    if (isHelp(args)) {
      commandUsage('ci')
      return
    }
    // ci has no options. Reject unknown flags rather than installing anyway —
    // `ci --dry-run` used to write to disk while claiming to preview.
    return ciCommand()
  },

  async setup(args) {
    if (isHelp(args)) {
      commandUsage('setup')
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
      commandUsage('upgrade')
      return
    }
    return upgradeCommand({ dryRun: args.includes('--dry-run') })
  },

  async doctor(args) {
    if (isHelp(args)) {
      commandUsage('doctor')
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
      commandUsage('watch')
      return
    }
    const pos = parsePositionals(args)
    const slug = pos[0]
    const { watchers, close } = await watchCommand(slug, process.cwd(), {
      dryRun: args.includes('--dry-run'),
    })
    if (watchers.length === 0) return
    process.on('SIGINT', () => {
      console.log('\nStopping watch...')
      close() // cancels pending debounce
      process.exit(0)
    })
    await new Promise(() => {})
  },

  async agents(args) {
    if (isHelp(args)) {
      commandUsage('agents')
      return
    }
    return agentsCommand({ json: args.includes('--json') })
  },

  async 'agents-xml'(args) {
    if (isHelp(args)) {
      commandUsage('agents-xml')
      return
    }
    return agentsXmlCommand(args.includes('--write'))
  },

  async convert(args) {
    if (isHelp(args)) {
      commandUsage('convert')
      return
    }
    const pos = parsePositionals(args)
    const source = pos[0]
    if (!source) {
      console.error('Usage: rolecraft convert <source>')
      throw new UserError('Missing source argument.', {
        suggestion: 'rolecraft <cmd> ./my-skill, owner/repo, or npm:package',
        code: 'USAGE',
      })
    }
    return convertCommand(source, {
      dryRun: args.includes('--dry-run'),
      output: parseFlagValue(args, '--output'),
    })
  },

  async diff(args) {
    if (isHelp(args)) {
      commandUsage('diff')
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
      commandUsage('compose')
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
      commandUsage('test')
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
      commandUsage('bundle')
      return
    }
    if (args.length === 0) {
      console.error('Usage: rolecraft bundle <source> [...]')
      console.error('       rolecraft bundle <file>')
      console.error('       rolecraft bundle create [<name>]')
      throw new UserError('Missing arguments.', {
        suggestion:
          'rolecraft bundle <file> or rolecraft bundle create [<name>]',
        code: 'USAGE',
      })
    }
    if (args[0] === 'create') {
      const createArgs = args.slice(1)
      if (isHelp(createArgs)) {
        commandUsage('bundle')
        return
      }
      return bundleCreateCommand(parsePositionals(createArgs)[0])
    }
    const sources = parsePositionals(args)
    const opts = {
      dryRun: args.includes('--dry-run'),
      noMcp: args.includes('--no-mcp'),
      yes: args.includes('--yes') || args.includes('-y'),
    }
    if (sources.length === 1) {
      return bundleCommand(sources[0], opts)
    }
    return bundleCommand(sources, opts)
  },

  async profile(args) {
    if (isHelp(args)) {
      commandUsage('profile')
      return
    }
    // profile command has its own subcommands, skip flag validation
    return profileCommand(args)
  },

  async mcp(args) {
    if (isHelp(args)) {
      commandUsage('mcp')
      return
    }
    // mcp command has subcommands (install, list, search, check, update, remove)
    // We can't easily validate without knowing subcommand, so skip
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
HANDLERS.test = HANDLERS.testCommand
// Alias: check-updates → check
HANDLERS['check-updates'] = HANDLERS.check

// Only non-command names that show usage
const ALWAYS_SHOW_USAGE = new Set(['help', '--help', '-h', undefined, null])

export async function main() {
  const [, , cmd, ...commandArgs] = process.argv

  if (cmd === '--version' || cmd === '-v') {
    HANDLERS.version()
    return
  }

  if (ALWAYS_SHOW_USAGE.has(cmd)) {
    usage()
    return
  }

  const handler = HANDLERS[cmd]
  if (handler) {
    // Unknown flags are a usage error, so they exit 2 — distinguishable from
    // a failed operation. Skip for commands that parse their own options.
    const spec = byName.get(aliases.get(cmd) || cmd)
    if (spec && !spec.passthrough) validateFlags(parseFlags(commandArgs), cmd)
    await handler(commandArgs)
    return
  }

  console.error(`✗  Unknown command: "${cmd}"`)
  const known = COMMANDS.filter((c) => HANDLERS[c.name]).map((c) => c.name)
  console.error(`   Known commands: ${known.join(', ')}`)
  console.error('   Run "rolecraft help" for details.')
  process.exitCode = 2
}

/** A usage error: bad command, bad flag, missing required argument. */
const USAGE_CODES = new Set(['USAGE', 'MISSING_SOURCE'])

export async function run() {
  try {
    await main()
  } catch (err) {
    showError(err)
    // Keep an already-reported usage error (exitCode 2) rather than
    // downgrading it to 1 when a later step throws.
    const usage = USAGE_CODES.has(err.userCode) || process.exitCode === 2
    process.exit(usage ? 2 : 1)
  }
}

const isEntryPoint =
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))

if (isEntryPoint) {
  run()
}
