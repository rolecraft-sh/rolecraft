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
  'publish',
  'profile',
  'help',
  'version',
  'mcp',
]

const MCP_SUBCOMMANDS = 'install list search check update remove'

const SCOPE_FLAGS = [
  '--global',
  '--project',
  '--claude',
  '--cursor',
  '--windsurf',
  '--devin',
  '--codex',
  '--copilot',
  '--aider',
  '--cline',
  '--gemini',
  '--cody',
  '--continue',
  '--warp',
  '--codeium',
  '--fabric',
  '--goose',
  '--tabnine',
  '--supermaven',
  '--pr-pilot',
  '--loom',
  '--roo',
  '--trae',
  '--hermes',
  '--kiro',
  '--augment',
  '--kilo',
  '--openhands',
  '--junie',
  '--factory',
  '--command-code',
  '--cortex',
  '--mistral-vibe',
  '--qwen-code',
  '--openclaw',
  '--codebuddy',
  '--mux',
  '--pi',
  '--autohand-code',
  '--rovo',
  '--firebender',
  '--bob',
  '--aider-desk',
  '--zap',
  '--codeep',
  '--kimi-code',
  '--zcode',
  '--amp',
  '--antigravity',
  '--antigravity-cli',
  '--deepagents',
  '--dexto',
  '--loaf',
  '--replit',
  '--zed',
  '--promptscript',
  '--astrbot',
  '--qoder-cn',
  '--trae-cn',
  '--zenflow',
  '--neovate',
  '--pochi',
  '--adal',
  '--droid',
  '--chatgpt',
  '--codearts-agent',
  '--universal',
  '--all',
]

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
  '--registry',
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

function bashScript() {
  const C = COMMANDS.join(' ')
  const S = SCOPE_FLAGS.join(' ')
  const O = OPTION_FLAGS.join(' ')
  return `# rolecraft bash completion
_source <(rolecraft completions bash)

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
    publish) COMPREPLY=($(compgen -W "--dry-run --yes -y --repo --slug --name" -- "$cur")) ;;
    profile) COMPREPLY=($(compgen -W "--yes -y --dry-run" -- "$cur")) ;;
    mcp)
      if [[ $COMP_CWORD -eq 2 ]]; then
        COMPREPLY=($(compgen -W "${MCP_SUBCOMMANDS}" -- "$cur"))
      else
        COMPREPLY=($(compgen -W "--name --dry-run --yes -y --all" -- "$cur"))
      fi
      ;;
    search) COMPREPLY=($(compgen -W "--interactive --skills-sh --registry" -- "$cur")) ;;
    completions) COMPREPLY=($(compgen -W "bash zsh fish" -- "$cur")) ;;
    *) COMPREPLY=($(compgen -W "$option_flags" -- "$cur")) ;;
  esac
} &&
complete -F _rolecraft rolecraft
`
}

function zshScript() {
  return `#compdef rolecraft

_rolecraft() {
  local -a commands
  commands=(
    'install:Install a skill'
    'bundle:Install multiple skills'
    'use:Preview a skill'
    'list:List installed skills'
    'remove:Remove a skill'
    'update:Re-install a skill'
    'setup:Detect agents and install'
    'init:Scaffold SKILL.md'
    'search:Search for skills'
    'verify:Verify skill integrity'
    'ci:CI mode install'
    'completions:Generate completions'
    'agents:Show agent capability manifest'
    'upgrade:Upgrade rolecraft'
    'rollback:Restore a skill to previous version'
    'check:Check for updates'
    'watch:Watch skills'
    'convert:Convert skill format'
    'diff:Compare skills'
    'compose:Compose skills'
    'test:Test skill quality'
    'publish:Publish a skill'
    'profile:Manage profiles'
    'agents-xml:Generate XML'
    'doctor:Run health checks'
    'mcp:Manage MCP servers'
    'help:Show help'
    'version:Show version'
  )

  _arguments \\
    '1:command:->commands' \\
    '*::args:->args'

  case $state in
    commands) _describe 'command' commands ;;
    args)
      case $words[1] in
        mcp) _arguments '1:subcommand:(install list search check update remove)' ;;
        *) _arguments '*: :' ;;
      esac
      ;;
  esac
}

_rolecraft "$@"
`
}

function fishScript() {
  return `# rolecraft fish completion

function __fish_rolecraft_needs_command
  set cmd (commandline -opc)
  test (count $cmd) -eq 1
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

for cmd in install bundle use setup upgrade check
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l dry-run -d 'Preview without copying'
end
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a install -d 'Install a skill'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a list -d 'List installed skills'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a agents -d 'Show agent capability manifest'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a rollback -d 'Restore a skill to previous version'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a help -d 'Show help'
`
}

export function completionApi(shell) {
  switch (shell) {
    case 'bash':
      return bashScript()
    case 'zsh':
      return zshScript()
    case 'fish':
      return fishScript()
    default:
      throw new Error(`Unknown shell: ${shell}`)
  }
}
