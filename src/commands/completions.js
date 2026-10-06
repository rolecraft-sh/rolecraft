import { COMMANDS, aliases, flagSpecs } from './spec.js'

/**
 * All three scripts are generated from src/commands/spec.js, so a flag added
 * there appears in help, validation and completions at once. Nothing here
 * lists a flag by hand.
 */

const commandNames = () => [...COMMANDS.map((c) => c.name), ...aliases.keys()]

/** Flags every command accepts, completed everywhere. */
const GLOBAL = [
  { flag: 'verbose', desc: 'Show error details' },
  { flag: 'help', desc: 'Show help', short: 'h' },
]

/** Flags to complete for a command, including the per-agent flags. */
function flagsOf(command) {
  return [...GLOBAL, ...flagSpecs(command)].map((f) => `--${f.flag}`)
}

/** Shell-quote a list for a double-quoted bash string. */
const q = (s) => `"${s}"`

export function bashScript() {
  const names = commandNames()
  const cases = COMMANDS.map((c) => {
    const flags = flagsOf(c)
    const words = [
      ...(c.subcommands || []).map((s) => s.name),
      ...flags,
      ...(c.aliases || []),
    ].join(' ')
    if (!words) return `    ${c.name}) COMPREPLY=() ;;`
    return `    ${c.name}) COMPREPLY=($(compgen -W ${q(words)} -- "$cur")) ;;`
  }).join('\n')

  return `# rolecraft bash completion
# Source: rolecraft completions bash
# Install: source <(rolecraft completions bash)

_rolecraft() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"

  if [[ $COMP_CWORD -eq 1 ]]; then
    COMPREPLY=($(compgen -W ${q(names.join(' '))} -- "$cur"))
    return 0
  fi

  case "\${COMP_WORDS[1]}" in
${cases}
    *) COMPREPLY=() ;;
  esac
} &&
complete -F _rolecraft rolecraft
`
}

export function zshScript() {
  const descriptions = [
    ...COMMANDS.map((c) => `    '${c.name}:${c.desc}'`),
    ...[...aliases].map(
      ([a, canonical]) => `    '${a}:Alias for ${canonical}'`,
    ),
  ].join('\n')

  const cases = COMMANDS.filter((c) => c.flags.length || c.subcommands)
    .map((c) => {
      const flags = [...GLOBAL, ...flagSpecs(c)]
      const specs = [
        ...(c.subcommands?.length
          ? [`'1:subcommand:(${c.subcommands.map((s) => s.name).join(' ')})'`]
          : []),
        ...flags.map((f) => {
          const short = f.short ? ` '${f.short}[${f.desc}]'` : ''
          const value = f.arg ? `:${f.arg}:` : ''
          return `'--${f.flag}[${f.desc}]'${short}${value}`
        }),
      ]
      const head =
        specs.length === 1
          ? `_arguments ${specs[0]}`
          : `_arguments \\\n${specs.map((s) => `      ${s}`).join(' \\\n')}`
      return `        ${c.name})\n          ${head}\n          ;;`
    })
    .join('\n')

  return `#compdef rolecraft
# Source: rolecraft completions zsh
# Install: source <(rolecraft completions zsh)

_rolecraft() {
  local -a commands
  commands=(
${descriptions}
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
${cases}
      esac
      ;;
  esac
}

_rolecraft "$@"
`
}

export function fishScript() {
  const commandLines = COMMANDS.map(
    (c) =>
      `complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a ${c.name} -d '${c.desc}'`,
  ).join('\n')

  const aliasLines = [...aliases.keys()]
    .map(
      (a) =>
        `complete -f -c rolecraft -n '__fish_rolecraft_needs_command' -a ${a} -d 'Alias for ${aliases.get(a)}'`,
    )
    .join('\n')

  const flagLines = COMMANDS.flatMap((c) => {
    const flags = [...GLOBAL, ...flagSpecs(c)].map((f) => {
      const short = f.short ? ` -s ${f.short}` : ''
      return `complete -f -c rolecraft -n "__fish_rolecraft_using_command ${c.name}" -l ${f.flag}${short} -d '${f.desc}'`
    })
    const subcommands = (c.subcommands || []).map(
      (s) =>
        `complete -f -c rolecraft -n "__fish_rolecraft_using_command ${c.name}" -a ${s.name} -d '${s.desc}'`,
    )
    return [...flags, ...subcommands]
  }).join('\n')

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
${commandLines}
${aliasLines}

# flags
${flagLines}
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

  const generators = { bash: bashScript, zsh: zshScript, fish: fishScript }
  const generate = generators[shell]
  if (!generate) {
    throw new Error(
      `Unknown shell: ${shell}. Usage: rolecraft completions bash|zsh|fish`,
    )
  }
  console.log(generate())
}
