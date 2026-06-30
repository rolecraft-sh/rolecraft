import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'))

const COMMANDS = [
  'install', 'bundle', 'use', 'list', 'remove', 'update',
  'setup', 'init', 'search', 'verify', 'ci', 'completions',
  'help', 'version',
]

const SCOPE_FLAGS = [
  '--global', '--project', '--claude', '--cursor', '--windsurf',
  '--devin', '--codex', '--copilot', '--aider', '--cline',
  '--gemini', '--cody', '--continue', '--warp', '--codeium',
  '--fabric', '--goose', '--tabnine', '--supermaven', '--pr-pilot',
  '--loom', '--roo', '--trae', '--hermes', '--kiro', '--augment',
  '--kilo', '--openhands', '--junie', '--factory', '--all',
]

const OPTION_FLAGS = [
  '--dry-run', '--frozen-lockfile', '--symlink', '--copy',
  '--interactive',
]

function bashScript() {
  return `# rolecraft bash completion
# Source: rolecraft completions bash
# Install: source <(rolecraft completions bash)

_rolecraft() {
  local cur prev words cword
  _init_completion || return

  local commands="${COMMANDS.join(' ')}"
  local scope_flags="${SCOPE_FLAGS.join(' ')}"
  local option_flags="${OPTION_FLAGS.join(' ')}"

  if [[ $cword -eq 1 ]]; then
    COMPREPLY=($(compgen -W "$commands" -- "$cur"))
    return 0
  fi

  case "$\{words[1]}" in
    install|bundle|use|setup)
      COMPREPLY=($(compgen -W "$scope_flags $option_flags" -- "$cur"))
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
        install|bundle|use|setup)
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
        remove|update)
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
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a help      -d 'Show help'
complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a version   -d 'Show version'

# scope flags for install/bundle/use/setup
for cmd in install bundle use setup
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
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l all            -d 'Install to all locations'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l dry-run        -d 'Preview without copying'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l frozen-lockfile -d 'Fail if already installed'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l symlink        -d 'Install as symlink'
  complete -f -c rolecraft -n "__fish_rolecraft_using_command $cmd" -l copy           -d 'Install as copy'
end

# search flags
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
      throw new Error(`Unknown shell: ${shell}. Usage: rolecraft completions bash|zsh|fish`)
  }
}
