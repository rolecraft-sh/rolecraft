import { completionApi } from '../api/completions.js'

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

  const supported = ['bash', 'zsh', 'fish']
  if (!supported.includes(shell)) {
    throw new Error(
      `Unknown shell: ${shell}. Usage: rolecraft completions bash|zsh|fish`,
    )
  }
  console.log(completionApi(shell))
}
