/**
 * The one description of the CLI surface: every command, its flags, their
 * descriptions, and its aliases. `bin/rolecraft.js` derives flag validation and
 * the usage text from it; `src/commands/completions.js` derives all three
 * shell scripts. Adding a flag in one place updates help, validation and
 * completions together, so the shell cannot offer a flag the CLI rejects.
 *
 * flag:  long form, no leading dashes
 * arg:   placeholder for the value, omitted for booleans
 */
import agents from '../agents.js'

export const GLOBAL_FLAGS = {
  verbose: {
    flag: 'verbose',
    desc: 'Show error details (HTTP status, code, cause)',
  },
  help: { flag: 'help', desc: 'Show this help', short: 'h' },
}

const SCOPE = [
  { flag: 'global', desc: 'Install to ~/.agents/skills/' },
  { flag: 'project', desc: 'Install to ./.agents/skills/' },
  ...agents.map((a) => ({ flag: a.flag, desc: `Also install to ${a.label}` })),
  { flag: 'all', desc: 'Install to all locations' },
]

/** Accepted and completed, but not listed in `install --help` — 87 lines of it. */
export const AGENT_FLAG_SPECS = agents.map((a) => ({
  flag: a.flag,
  desc: `Also install to ${a.label}`,
}))

/** The flags of a command, including the per-agent ones. */
export function flagSpecs(command) {
  return command.agentFlags
    ? [...command.flags, ...AGENT_FLAG_SPECS]
    : command.flags
}

const YES = { flag: 'yes', desc: 'Skip confirmation', short: 'y' }
const DRY_RUN = { flag: 'dry-run', desc: 'Preview without making changes' }

export const COMMANDS = [
  {
    name: 'install',
    args: '<source>',
    desc: 'Install a skill (local path, owner/repo, npm:package)',
    // The 87 per-agent flags are accepted and completed, but listing them in
    // --help would bury the other options. `rolecraft agents` is the reference.
    agentFlags: true,
    flags: [
      { ...YES, desc: 'Non-interactive: accept all defaults' },
      ...SCOPE.filter((f) => !agents.some((a) => a.flag === f.flag)),
      { flag: 'no-mcp', desc: 'Skip MCP server installation' },
      { flag: 'frozen-lockfile', desc: 'Fail if skill already installed' },
      { flag: 'symlink', desc: 'Install as symlink instead of copy' },
      { flag: 'copy', desc: 'Install as copy (default)' },
      { flag: 'list', desc: 'List available skills without installing' },
      { flag: 'skill', desc: 'Select skills by name', arg: 'names' },
      DRY_RUN,
    ],
  },
  {
    name: 'bundle',
    args: '<source> [...]',
    desc: 'Install skills from a file or inline sources',
    subcommands: [{ name: 'create', desc: 'Create a new bundle file' }],
    flags: [
      YES,
      DRY_RUN,
      { flag: 'no-mcp', desc: 'Skip MCP server installation' },
    ],
  },
  {
    name: 'use',
    args: '<source>',
    desc: 'Preview a skill without installing',
    flags: [
      { flag: 'list', desc: 'List available skills without previewing' },
      { flag: 'skill', desc: 'Preview skills by name', arg: 'names' },
    ],
  },
  {
    name: 'list',
    args: '',
    desc: 'List installed skills',
    flags: [
      { flag: 'json', desc: 'Output structured JSON' },
      {
        flag: 'agent',
        desc: 'Filter by installed agent',
        arg: 'name',
        short: 'a',
      },
    ],
  },
  {
    name: 'remove',
    args: '<slug>',
    desc: 'Remove a skill',
    flags: [DRY_RUN],
  },
  {
    name: 'update',
    args: '<slug>',
    desc: 'Re-install a skill to the latest version',
    flags: [YES, DRY_RUN],
  },
  {
    name: 'rollback',
    args: '<slug>',
    desc: 'Restore a skill to a previous version',
    flags: [
      { flag: 'list', desc: 'Show available rollback versions' },
      DRY_RUN,
    ],
  },
  {
    name: 'setup',
    args: '[<source>]',
    desc: 'Detect agents and optionally install a skill',
    flags: [
      YES,
      DRY_RUN,
      { flag: 'list', desc: 'List available skills without installing' },
      { flag: 'skill', desc: 'Install skills by name', arg: 'names' },
    ],
  },
  {
    name: 'init',
    args: '[<name>]',
    desc: 'Scaffold a new SKILL.md',
    flags: [
      { flag: 'list', desc: 'List available templates' },
      { flag: 'template', desc: 'Scaffold from a named template', arg: 'name' },
      { flag: 'description', desc: 'Set the skill description', arg: 'text' },
      { flag: 'agents', desc: 'Declare target agents', arg: 'list' },
    ],
  },
  {
    name: 'search',
    args: '<query>',
    desc: 'Search for skills on GitHub',
    flags: [
      { flag: 'interactive', desc: 'Choose and install from results' },
      { flag: 'skills-sh', desc: 'Search skills.sh instead of GitHub' },
      YES,
    ],
  },
  {
    name: 'verify',
    args: '',
    desc: 'Verify installed skill integrity',
    flags: [],
  },
  {
    name: 'check',
    args: '',
    desc: 'Check for available skill updates',
    aliases: ['check-updates'],
    flags: [],
  },
  {
    name: 'ci',
    args: '',
    desc: 'Install all skills from lockfile (no flags)',
    flags: [],
  },
  {
    name: 'completions',
    args: '<shell>',
    desc: 'Generate shell completions (bash|zsh|fish)',
    positional: ['bash', 'zsh', 'fish'],
    flags: [],
  },
  {
    name: 'doctor',
    args: '',
    desc: 'Run system health check',
    flags: [
      { flag: 'json', desc: 'Output structured JSON' },
      { flag: 'network', desc: 'Run network checks' },
      { flag: 'deep', desc: 'Run deep checks' },
    ],
  },
  {
    name: 'watch',
    args: '[<slug>]',
    desc: 'Watch skills for changes and auto-sync',
    flags: [DRY_RUN],
  },
  {
    name: 'profile',
    args: '<subcommand>',
    desc: 'Manage agent configuration profiles',
    subcommands: [
      { name: 'save', desc: 'Save the current agent configuration' },
      { name: 'apply', desc: 'Apply a saved profile' },
      { name: 'diff', desc: 'Show differences with a saved profile' },
      { name: 'edit', desc: 'Edit a profile in $EDITOR' },
      { name: 'export', desc: 'Export a profile to JSON' },
      { name: 'import', desc: 'Import a profile from JSON' },
      { name: 'link', desc: 'Link a project to a profile' },
      { name: 'list', desc: 'List saved profiles' },
      { name: 'show', desc: 'Show a profile' },
      { name: 'delete', desc: 'Delete a profile' },
    ],
    // profile parses its own options per subcommand and prints its own help.
    passthrough: true,
    flags: [YES, DRY_RUN],
  },
  {
    name: 'mcp',
    args: '<subcommand>',
    desc: 'Manage MCP servers',
    subcommands: [
      { name: 'install', desc: 'Install an MCP server' },
      { name: 'list', desc: 'List MCP servers' },
      { name: 'search', desc: 'Search for MCP servers' },
      { name: 'check', desc: 'Check for MCP updates' },
      { name: 'update', desc: 'Update an MCP server' },
      { name: 'remove', desc: 'Remove an MCP server' },
    ],
    // mcp parses its own options per subcommand and prints its own help.
    passthrough: true,
    flags: [
      { flag: 'name', desc: 'Override server name', arg: 'name' },
      YES,
      DRY_RUN,
      { flag: 'all', desc: 'Install to all supported agents' },
      { flag: 'npm', desc: 'Search npm instead of GitHub' },
      { flag: 'interactive', desc: 'Choose and install from results' },
    ],
  },
  {
    name: 'agents',
    args: '',
    desc: 'Show agent capability manifest',
    flags: [{ flag: 'json', desc: 'Output structured JSON' }],
  },
  {
    name: 'agents-xml',
    args: '',
    desc: 'Generate skills XML for AGENTS.md',
    flags: [{ flag: 'write', desc: 'Write skills XML to AGENTS.md' }],
  },
  {
    name: 'upgrade',
    args: '',
    desc: 'Upgrade rolecraft to the latest version',
    flags: [DRY_RUN],
  },
  {
    name: 'convert',
    args: '<source>',
    desc: 'Convert a skill between SKILL.md and .mdc formats',
    flags: [
      DRY_RUN,
      { flag: 'output', desc: 'Write result to file', arg: 'file' },
    ],
  },
  {
    name: 'diff',
    args: '<skill-a> <skill-b>',
    desc: 'Compare two skills section-by-section',
    flags: [
      { flag: 'json', desc: 'Output structured JSON' },
      { flag: 'brief', desc: 'Show only a summary' },
      {
        flag: 'context',
        desc: 'Lines of context around each change',
        arg: 'n',
      },
      { flag: 'no-color', desc: 'Disable colored output' },
    ],
  },
  {
    name: 'compose',
    args: '<a> <b> [...]',
    desc: 'Compose multiple skills',
    flags: [
      { flag: 'chain', desc: 'Override mode (last skill wins)' },
      DRY_RUN,
      { flag: 'force', desc: 'Overwrite existing output file' },
      { flag: 'json', desc: 'Output structured JSON' },
      { flag: 'no-color', desc: 'Disable colored output' },
      { flag: 'name', desc: 'Set output skill name', arg: 'name' },
      {
        flag: 'output',
        desc: 'Write to file instead of stdout',
        arg: 'file',
        short: 'o',
      },
    ],
  },
  {
    name: 'test',
    args: '<skill-path>',
    desc: 'Test skill quality',
    flags: [
      { flag: 'all', desc: 'Test all installed skills' },
      { flag: 'json', desc: 'Output structured JSON' },
      { flag: 'no-color', desc: 'Disable colored output' },
      { flag: 'no-emoji', desc: 'Use ASCII fallback for emojis' },
      { flag: 'min-score', desc: 'Fail if score is below threshold', arg: 'n' },
      { flag: 'only', desc: 'Run specific checks', arg: 'names' },
    ],
  },
  {
    name: 'help',
    args: '',
    desc: 'Show help',
    flags: [],
  },
  {
    name: 'version',
    args: '',
    desc: 'Show version',
    flags: [],
  },
]

export const byName = new Map(COMMANDS.map((c) => [c.name, c]))

/** Every long and short flag spelling a command accepts, globals included. */
export function flagNames(command) {
  const names = ['--verbose', '--help', '-h']
  if (!command) return names
  for (const f of command.flags) {
    names.push(`--${f.flag}`)
    if (f.short) names.push(`-${f.short}`)
  }
  if (command.agentFlags)
    for (const a of AGENT_FLAG_SPECS) names.push(`--${a.flag}`)
  return names
}

/** Alias -> canonical name, for dispatch and for completions. */
export const aliases = new Map(
  COMMANDS.flatMap((c) => (c.aliases || []).map((a) => [a, c.name])),
)

/**
 * The "Common flags" table in docs/reference.md. Rendered here so the docs
 * cannot list a flag the CLI rejects, or omit one it accepts.
 */
export function renderCommonFlags() {
  const uses = new Map()
  for (const command of COMMANDS) {
    if (['help', 'version'].includes(command.name)) continue
    // The 87 per-agent flags get one line, not 87.
    for (const f of command.flags) {
      const key = `${f.flag}\x00${f.desc}`
      if (!uses.has(key)) uses.set(key, [])
      uses.get(key).push(command.name)
    }
  }
  const rows = [...uses.entries()]
    .map(([key, names]) => {
      const [flag, desc] = key.split('\x00')
      return { flag, desc, names }
    })
    .sort((a, b) => a.flag.localeCompare(b.flag))
    .map(
      ({ flag, desc, names }) =>
        `| \`--${flag}\` | ${names.join(', ')} | ${desc} |`,
    )
  rows.push(
    '| `--<agent>` | install | One flag per agent, e.g. `--claude`. See [Agent-specific flags](#agent-specific-flags) |',
  )
  return rows.join('\n')
}
