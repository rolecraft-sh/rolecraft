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
  'agents-xml',
  'doctor',
  'upgrade',
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
]

function bashScript() {
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
    install|bundle|use|setup|upgrade)
      COMPREPLY=($(compgen -W "$scope_flags $option_flags" -- "$cur"))
      ;;
    mcp)
      if [[ $COMP_CWORD -eq 2 ]]; then
        COMPREPLY=($(compgen -W "${MCP_SUBCOMMANDS}" -- "$cur"))
      else
        COMPREPLY=($(compgen -W "--name --dry-run --yes -y --all" -- "$cur"))
      fi
      ;;
    search)
      COMPREPLY=($(compgen -W "--interactive" -- "$cur"))
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

function zshScript() {
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
    'upgrade:Upgrade rolecraft to latest version'
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
        install|bundle|use|setup|upgrade)
          _arguments \\
            '--global[Install to ~/.agents/skills/]' \\
            '--project[Install to ./.agents/skills/]' \\
            '--claude[Also install to ~/.claude/skills/]' \\
            '--cursor[Also install to ~/.cursor/skills/]' \\
            '--windsurf[Also install to ~/.windsurf/skills/]' \\
            '--devin[Also install to ~/.devin/skills/]' \\
            '--codex[Also install to ~/.codex/skills/]' \\
            '--copilot[Also install to ~/.copilot/skills/]' \\
            '--aider[Also install to ~/.aider/skills/]' \\
            '--cline[Also install to ~/.cline/skills/]' \\
            '--gemini[Also install to ~/.gemini/skills/]' \\
            '--cody[Also install to ~/.cody/skills/]' \\
            '--continue[Also install to ~/.continue/skills/]' \\
            '--warp[Also install to ~/.warp/skills/]' \\
            '--codeium[Also install to ~/.codeium/skills/]' \\
            '--fabric[Also install to ~/.fabric/skills/]' \\
            '--goose[Also install to ~/.goose/skills/]' \\
            '--tabnine[Also install to ~/.tabnine/skills/]' \\
            '--supermaven[Also install to ~/.supermaven/skills/]' \\
            '--pr-pilot[Also install to ~/.pr-pilot/skills/]' \\
            '--loom[Also install to ~/.loom/skills/]' \\
            '--roo[Also install to ~/.roo/skills/]' \\
            '--trae[Also install to ~/.trae/skills/]' \\
            '--hermes[Also install to ~/.hermes/skills/]' \\
            '--kiro[Also install to ~/.kiro/skills/]' \\
            '--augment[Also install to ~/.augment/skills/]' \\
            '--kilo[Also install to ~/.kilo/skills/]' \\
            '--openhands[Also install to ~/.openhands/skills/]' \\
            '--junie[Also install to ~/.junie/skills/]' \\
             '--factory[Also install to ~/.factory/skills/]' \\
             '--command-code[Also install to ~/.commandcode/skills/]' \\
             '--cortex[Also install to ~/.snowflake/cortex/skills/]' \\
             '--mistral-vibe[Also install to ~/.vibe/skills/]' \\
             '--qwen-code[Also install to ~/.qwen/skills/]' \\
             '--openclaw[Also install to ~/.openclaw/skills/]' \\
             '--codebuddy[Also install to ~/.codebuddy/skills/]' \\
             '--mux[Also install to ~/.mux/skills/]' \\
             '--pi[Also install to ~/.pi/agent/skills/]' \\
             '--autohand-code[Also install to ~/.autohand/skills/]' \\
             '--rovo[Also install to ~/.rovodev/skills/]' \\
             '--firebender[Also install to ~/.firebender/skills/]' \\
             '--bob[Also install to ~/.bob/skills/]' \\
            '--aider-desk[Also install to ~/.aider-desk/skills/]' \\
            '--zap[Also install to ~/.zap/skills/]' \\
            '--codeep[Also install to ~/.codeep/skills/]' \\
            '--kimi-code[Also install to ~/.kimi-code/skills/]' \\
             '--zcode[Also install to ~/.zcode/skills/]' \\
             '--droid[Also install to ~/.factory/skills/]' \\
             '--chatgpt[Also install to ~/.chatgpt/skills/]' \\
             '--codearts-agent[Also install to ~/.codeartsdoer/skills/]' \\
             '--universal[Also install to ~/.config/agents/skills/]' \\
             '--all[Install to all locations]' \\
            '--dry-run[Preview without copying]' \\
            '--frozen-lockfile[Fail if already installed]' \\
            '--symlink[Install as symlink]' \\
            '--copy[Install as copy]'
          ;;
        search)
          _arguments '--interactive[Choose and install from results]'
          ;;
        completions)
          _arguments '::shell:(bash zsh fish)'
          ;;
        remove|update|mcp)
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

function fishScript() {
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
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a upgrade    -d 'Upgrade to latest version'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a help      -d 'Show help'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a version   -d 'Show version'

# scope flags for install/bundle/use/setup
for cmd in install bundle use setup upgrade
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l global         -d 'Install to ~/.agents/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l project        -d 'Install to ./.agents/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l claude         -d 'Install to ~/.claude/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l cursor         -d 'Install to ~/.cursor/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l windsurf       -d 'Install to ~/.windsurf/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l devin          -d 'Install to ~/.devin/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l codex          -d 'Install to ~/.codex/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l copilot        -d 'Install to ~/.copilot/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l aider          -d 'Install to ~/.aider/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l cline          -d 'Install to ~/.cline/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l gemini         -d 'Install to ~/.gemini/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l cody           -d 'Install to ~/.cody/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l continue       -d 'Install to ~/.continue/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l warp           -d 'Install to ~/.warp/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l codeium        -d 'Install to ~/.codeium/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l fabric         -d 'Install to ~/.fabric/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l goose          -d 'Install to ~/.goose/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l tabnine        -d 'Install to ~/.tabnine/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l supermaven     -d 'Install to ~/.supermaven/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l pr-pilot       -d 'Install to ~/.pr-pilot/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l loom           -d 'Install to ~/.loom/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l roo            -d 'Install to ~/.roo/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l trae           -d 'Install to ~/.trae/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l hermes         -d 'Install to ~/.hermes/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l kiro           -d 'Install to ~/.kiro/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l augment        -d 'Install to ~/.augment/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l kilo           -d 'Install to ~/.kilo/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l openhands      -d 'Install to ~/.openhands/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l junie          -d 'Install to ~/.junie/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l factory        -d 'Install to ~/.factory/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l command-code    -d 'Install to ~/.commandcode/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l cortex          -d 'Install to ~/.snowflake/cortex/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l mistral-vibe    -d 'Install to ~/.vibe/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l qwen-code       -d 'Install to ~/.qwen/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l openclaw        -d 'Install to ~/.openclaw/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l codebuddy       -d 'Install to ~/.codebuddy/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l mux             -d 'Install to ~/.mux/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l pi              -d 'Install to ~/.pi/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l autohand-code   -d 'Install to ~/.autohand/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l rovo            -d 'Install to ~/.rovodev/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l firebender      -d 'Install to ~/.firebender/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l bob             -d 'Install to ~/.bob/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l aider-desk      -d 'Install to ~/.aider-desk/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l zap             -d 'Install to ~/.zap/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l codeep          -d 'Install to ~/.codeep/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l kimi-code       -d 'Install to ~/.kimi-code/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l zcode           -d 'Install to ~/.zcode/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l droid           -d 'Install to ~/.factory/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l chatgpt         -d 'Install to ~/.chatgpt/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l codearts-agent  -d 'Install to ~/.codeartsdoer/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l universal       -d 'Install to ~/.config/agents/skills/'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l all            -d 'Install to all locations'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l dry-run        -d 'Preview without copying'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l frozen-lockfile -d 'Fail if already installed'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l symlink        -d 'Install as symlink'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l copy           -d 'Install as copy'
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
