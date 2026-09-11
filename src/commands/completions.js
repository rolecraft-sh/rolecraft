import AGENTS_DATA from '../agents.js'

const COMMANDS = [
  'install',
  'bundle',
  'use',
  'list',
  'remove',
  'update',
  'setup',
  'init',
  'search',
  'verify',
  'ci',
  'completions',
  'agents',
  'agents-xml',
  'doctor',
  'upgrade',
  'rollback',
  'check',
  'watch',
  'convert',
  'diff',
  'compose',
  'test',
  'profile',
  'help',
  'version',
  'mcp',
]

const MCP_SUBCOMMANDS = 'install list search check update remove'

const SCOPE_OPTIONS = [
  {
    flag: 'global',
    zshDescription: 'Install to ~/.agents/skills/',
    fishDescription: 'Install to ~/.agents/skills/',
  },
  {
    flag: 'project',
    zshDescription: 'Install to ./.agents/skills/',
    fishDescription: 'Install to ./.agents/skills/',
  },
  ...AGENTS_DATA.map(({ flag, label }) => ({
    flag,
    zshDescription: `Also install to ${label}`,
    fishDescription: `Install to ${label}`,
  })),
  {
    flag: 'all',
    zshDescription: 'Install to all locations',
    fishDescription: 'Install to all locations',
  },
]

const SCOPE_FLAGS = SCOPE_OPTIONS.map(({ flag }) => `--${flag}`)

const OPTION_FLAGS = [
  '--dry-run',
  '--frozen-lockfile',
  '--symlink',
  '--copy',
  '--interactive',
  '--yes',
  '-y',
  '--no-mcp',
  '--list',
  '--skill',
  '--json',
  '--skills-sh',
  '--network',
  '--deep',
  '--write',
  '--brief',
  '--no-color',
  '--context',
  '--chain',
  '--force',
  '--name',
  '--output',
  '-o',
  '--verbose',
  '--no-emoji',
  '--min-score',
  '--only',
  '--repo',
  '--slug',
]

function zshScopeArguments() {
  return SCOPE_OPTIONS.map(
    ({ flag, zshDescription }) =>
      `            '--${flag}[${zshDescription}]' \\`,
  ).join('\n')
}

function fishScopeArguments() {
  return SCOPE_OPTIONS.map(
    ({ flag, fishDescription }) =>
      `  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l ${flag} -d '${fishDescription}'`,
  ).join('\n')
}

export function bashScript() {
  const C = COMMANDS.join(' ')
  const S = SCOPE_FLAGS.join(' ')
  const O = OPTION_FLAGS.join(' ')
  return `# rolecraft bash completion
# Source: rolecraft completions bash
# Install: source <(rolecraft completions bash)

_rolecraft() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local prev="\${COMP_WORDS[COMP_CWORD-1]}"

  local commands="${C}"
  local scope_flags="${S}"
  local option_flags="${O}"

  if [[ $COMP_CWORD -eq 1 ]]; then
    COMPREPLY=($(compgen -W "$commands" -- "$cur"))
    return 0
  fi

  case "\${COMP_WORDS[1]}" in
    install|bundle|use|setup|upgrade|check)
      COMPREPLY=($(compgen -W "$scope_flags $option_flags" -- "$cur"))
      ;;
    list) COMPREPLY=($(compgen -W "--json" -- "$cur")) ;;
    remove|update|watch|convert) COMPREPLY=($(compgen -W "--dry-run" -- "$cur")) ;;
    rollback) COMPREPLY=($(compgen -W "--list --dry-run" -- "$cur")) ;;
    init|verify|ci|help|version) COMPREPLY=() ;;
    agents) COMPREPLY=($(compgen -W "--json" -- "$cur")) ;;
    agents-xml) COMPREPLY=($(compgen -W "--write" -- "$cur")) ;;
    doctor) COMPREPLY=($(compgen -W "--json --network --deep" -- "$cur")) ;;
    diff) COMPREPLY=($(compgen -W "--json --brief --context --no-color" -- "$cur")) ;;
    compose) COMPREPLY=($(compgen -W "--chain --output -o --name --dry-run --force --json --no-color" -- "$cur")) ;;
    test) COMPREPLY=($(compgen -W "--all --json --verbose --no-color --no-emoji --min-score --only" -- "$cur")) ;;
    profile) COMPREPLY=($(compgen -W "--yes -y --dry-run" -- "$cur")) ;;
    mcp)
      if [[ $COMP_CWORD -eq 2 ]]; then
        COMPREPLY=($(compgen -W "${MCP_SUBCOMMANDS}" -- "$cur"))
      else
        COMPREPLY=($(compgen -W "--name --dry-run --yes -y --all" -- "$cur"))
      fi
      ;;
    search)
      COMPREPLY=($(compgen -W "--interactive --skills-sh" -- "$cur"))
      ;;
    completions)
      COMPREPLY=($(compgen -W "bash zsh fish" -- "$cur"))
      ;;
    *)
      COMPREPLY=($(compgen -W "$option_flags" -- "$cur"))
      ;;
  esac
} &&
complete -F _rolecraft rolecraft
`
}

export function zshScript() {
  return `#compdef rolecraft
# Source: rolecraft completions zsh
# Install: source <(rolecraft completions zsh)

_rolecraft() {
  local -a commands
  commands=(
    'install:Install a skill from a local path or GitHub repo'
    'bundle:Install multiple skills from file or inline sources'
    'use:Preview a skill without installing'
    'list:List installed skills'
    'remove:Remove a skill'
    'update:Re-install a skill to latest'
    'setup:Detect agents and optionally install'
    'init:Scaffold a new SKILL.md'
    'search:Search for skills on GitHub'
    'verify:Verify installed skill integrity'
    'ci:Install all skills from lockfile'
    'completions:Generate shell completion scripts'
    'agents:Show agent capability manifest'
    'upgrade:Upgrade rolecraft to latest version'
    'rollback:Restore a skill to previous version'
    'check:Check for available skill updates'
    'watch:Watch skills and auto-sync changes'
    'convert:Convert another skill format to SKILL.md'
    'diff:Compare two skills'
    'compose:Compose multiple skills'
    'test:Test skill quality'
    'profile:Manage installation profiles'
    'agents-xml:Generate skills XML for AGENTS.md'
    'doctor:Run system health checks'
    'mcp:Manage MCP servers'
    'help:Show help'
    'version:Show version'
  )

  _arguments \\
    '1:command:->commands' \\
    '*::args:->args'

  case $state in
    commands)
      _describe 'command' commands
      ;;
    args)
      case $words[1] in
        mcp)
          _arguments '1:subcommand:(install list search check update remove)'
          ;;
        install|bundle|use|setup|upgrade|check)
          _arguments \\
${zshScopeArguments()}
            '--dry-run[Preview without copying]' \\
            '--frozen-lockfile[Fail if already installed]' \\
            '--symlink[Install as symlink]' \\
            '--copy[Install as copy]' \\
            '--yes[Skip confirmation]' \\
            '-y[Skip confirmation]' \\
            '--no-mcp[Skip MCP installation]' \\
            '--list[List available skills]' \\
            '--skill[Select skills by name]:names:'
          ;;
        list) _arguments '--json[Output structured JSON]' ;;
        remove|update|watch|convert) _arguments '--dry-run[Preview without changes]' ;;
        agents-xml) _arguments '--write[Write skills XML to AGENTS.md]' ;;
        doctor) _arguments '--json[Output structured JSON]' '--network[Run network checks]' '--deep[Run deep checks]' ;;
        diff) _arguments '--json[Output structured JSON]' '--brief[Show only a summary]' '--context[Context lines]:lines:' '--no-color[Disable colors]' ;;
        compose) _arguments '--chain[Use override mode]' '--output[Write to file]:file:_files' '-o[Write to file]:file:_files' '--name[Set output skill name]:name:' '--dry-run[Preview result]' '--force[Overwrite output]' '--json[Output structured JSON]' '--no-color[Disable colors]' ;;
        test) _arguments '--all[Test all installed skills]' '--json[Output structured JSON]' '--verbose[Show details]' '--no-color[Disable colors]' '--no-emoji[Use ASCII fallbacks]' '--min-score[Minimum score]:score:' '--only[Checks to run]:checks:' ;;
        profile) _arguments '--yes[Skip confirmation]' '-y[Skip confirmation]' '--dry-run[Preview without changes]' ;;
        search)
          _arguments '--interactive[Choose and install from results]' '--skills-sh[Search skills.sh]'
          ;;
        completions)
          _arguments '::shell:(bash zsh fish)'
          ;;
        mcp)
          _arguments '*:slug:'
          ;;
        bundle)
          if [[ $words[2] == "create" ]]; then
            _arguments '*:name:'
          else
            _arguments '--dry-run[Preview without copying]'
          fi
          ;;
      esac
      ;;
  esac
}

_rolecraft "$@"
`
}

export function fishScript() {
  return `# rolecraft fish completion
# Source: rolecraft completions fish
# Install: rolecraft completions fish | source

function __fish_rolecraft_needs_command
  set cmd (commandline -opc)
  if test (count $cmd) -eq 1
    return 0
  end
  return 1
end

function __fish_rolecraft_using_command
  set cmd (commandline -opc)
  if test (count $cmd) -gt 1
    if test $argv[1] = $cmd[2]
      return 0
    end
  end
  return 1
end

# commands
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a install    -d 'Install a skill'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a bundle    -d 'Install multiple skills'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a use       -d 'Preview a skill'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a list      -d 'List installed skills'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a remove    -d 'Remove a skill'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a update    -d 'Update a skill'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a setup     -d 'Detect agents and install'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a init      -d 'Scaffold SKILL.md'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a search    -d 'Search for skills'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a verify    -d 'Verify skill integrity'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a ci        -d 'CI mode install'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a completions -d 'Generate completions'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a agents   -d 'Show agent capability manifest'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a upgrade    -d 'Upgrade to latest version'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a rollback -d 'Restore a skill to previous version'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a check      -d 'Check for skill updates'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a watch      -d 'Watch skills and auto-sync'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a convert    -d 'Convert a skill format'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a diff       -d 'Compare two skills'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a compose    -d 'Compose multiple skills'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a test       -d 'Test skill quality'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a profile    -d 'Manage profiles'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a agents-xml -d 'Generate skills XML'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a doctor     -d 'Run health checks'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a mcp        -d 'Manage MCP servers'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a help      -d 'Show help'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a version   -d 'Show version'

# scope flags for install/bundle/use/setup
for cmd in install bundle use setup upgrade check
${fishScopeArguments()}
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l dry-run        -d 'Preview without copying'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l frozen-lockfile -d 'Fail if already installed'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l symlink        -d 'Install as symlink'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l copy           -d 'Install as copy'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l yes -s y       -d 'Skip confirmation'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l no-mcp         -d 'Skip MCP installation'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l list           -d 'List available skills'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l skill -r        -d 'Select skills by name'
end

# search flags
# mcp subcommands
complete -f -c rolecraft -n '__fish_rolecraft_using_command mcp' -a install -d 'Install an MCP server'
complete -f -c rolecraft -n '__fish_rolecraft_using_command mcp' -a list    -d 'List MCP servers'
complete -f -c rolecraft -n '__fish_rolecraft_using_command mcp' -a search  -d 'Search for MCP servers'
complete -f -c rolecraft -n '__fish_rolecraft_using_command mcp' -a check   -d 'Check for MCP updates'
complete -f -c rolecraft -n '__fish_rolecraft_using_command mcp' -a update  -d 'Update an MCP server'
complete -f -c rolecraft -n '__fish_rolecraft_using_command mcp' -a remove  -d 'Remove an MCP server'

# mcp flags
for cmd in install list search check update remove
  complete -f -c rolecraft -n "__fish_rolecraft_using_command mcp; and __fish_rolecraft_using_command $cmd" -l name -d 'Server name'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command mcp; and __fish_rolecraft_using_command $cmd" -l dry-run -d 'Preview without changes'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command mcp; and __fish_rolecraft_using_command $cmd" -l yes -d 'Skip confirmation'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command mcp; and __fish_rolecraft_using_command $cmd" -l all -d 'All agents'
end

complete -f -c rolecraft -n '__fish_rolecraft_using_command search' -l interactive -d 'Choose and install from results'
complete -f -c rolecraft -n '__fish_rolecraft_using_command search' -l skills-sh -d 'Search skills.sh'

# command-specific flags
complete -f -c rolecraft -n '__fish_rolecraft_using_command list' -l json -d 'Output structured JSON'
for cmd in remove update watch convert
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l dry-run -d 'Preview without changes'
end
complete -f -c rolecraft -n '__fish_rolecraft_using_command agents-xml' -l write -d 'Write to AGENTS.md'
complete -f -c rolecraft -n '__fish_rolecraft_using_command doctor' -l json     -d 'Output structured JSON'
complete -f -c rolecraft -n '__fish_rolecraft_using_command doctor' -l network  -d 'Run network checks'
complete -f -c rolecraft -n '__fish_rolecraft_using_command doctor' -l deep     -d 'Run deep checks'
complete -f -c rolecraft -n '__fish_rolecraft_using_command diff' -l json     -d 'Output structured JSON'
complete -f -c rolecraft -n '__fish_rolecraft_using_command diff' -l brief    -d 'Show only a summary'
complete -f -c rolecraft -n '__fish_rolecraft_using_command diff' -l context  -d 'Context lines'
complete -f -c rolecraft -n '__fish_rolecraft_using_command diff' -l no-color -d 'Disable colors'
complete -f -c rolecraft -n '__fish_rolecraft_using_command compose' -l chain    -d 'Use override mode'
complete -f -c rolecraft -n '__fish_rolecraft_using_command compose' -l output   -d 'Write to file'
complete -f -c rolecraft -n '__fish_rolecraft_using_command compose' -s o        -d 'Write to file'
complete -f -c rolecraft -n '__fish_rolecraft_using_command compose' -l name     -d 'Set output skill name'
complete -f -c rolecraft -n '__fish_rolecraft_using_command compose' -l dry-run  -d 'Preview result'
complete -f -c rolecraft -n '__fish_rolecraft_using_command compose' -l force    -d 'Overwrite output'
complete -f -c rolecraft -n '__fish_rolecraft_using_command compose' -l json     -d 'Output structured JSON'
complete -f -c rolecraft -n '__fish_rolecraft_using_command compose' -l no-color -d 'Disable colors'
complete -f -c rolecraft -n '__fish_rolecraft_using_command test' -l all      -d 'Test all installed skills'
complete -f -c rolecraft -n '__fish_rolecraft_using_command test' -l json     -d 'Output structured JSON'
complete -f -c rolecraft -n '__fish_rolecraft_using_command test' -l verbose  -d 'Show details'
complete -f -c rolecraft -n '__fish_rolecraft_using_command test' -l no-color -d 'Disable colors'
complete -f -c rolecraft -n '__fish_rolecraft_using_command test' -l no-emoji -d 'Use ASCII fallbacks'
complete -f -c rolecraft -n '__fish_rolecraft_using_command test' -l min-score -d 'Minimum score'
complete -f -c rolecraft -n '__fish_rolecraft_using_command test' -l only     -d 'Checks to run'
complete -f -c rolecraft -n '__fish_rolecraft_using_command profile' -l yes -s y -d 'Skip confirmation'
complete -f -c rolecraft -n '__fish_rolecraft_using_command profile' -l dry-run -d 'Preview without changes'

# completions subcommands
complete -f -c rolecraft -n '__fish_rolecraft_using_command completions' -a bash -d 'Bash completions'
complete -f -c rolecraft -n '__fish_rolecraft_using_command completions' -a zsh -d 'Zsh completions'
complete -f -c rolecraft -n '__fish_rolecraft_using_command completions' -a fish -d 'Fish completions'
`
}

export async function completionsCommand(shell) {
  if (!shell) {
    console.log('Usage: rolecraft completions bash|zsh|fish')
    console.log()
    console.log('Generate shell completion scripts for rolecraft.')
    console.log()
    console.log('Examples:')
    console.log('  rolecraft completions bash  # print bash completion script')
    console.log('  rolecraft completions zsh   # print zsh completion script')
    console.log('  rolecraft completions fish  # print fish completion script')
    console.log()
    console.log('To install completions, add to your shell rc file:')
    console.log('  Bash: source <(rolecraft completions bash)')
    console.log('  Zsh:  source <(rolecraft completions zsh)')
    console.log('  Fish: rolecraft completions fish | source')
    return
  }

  switch (shell) {
    case 'bash':
      console.log(bashScript())
      break
    case 'zsh':
      console.log(zshScript())
      break
    case 'fish':
      console.log(fishScript())
      break
    default:
      throw new Error(
        `Unknown shell: ${shell}. Usage: rolecraft completions bash|zsh|fish`,
      )
  }
}
