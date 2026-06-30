import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'

let completionsModule

before(async () => {
  completionsModule = await import('./completions.js')
})

function capture(name) {
  const orig = console[name]
  const logs = []
  console[name] = (...args) => {
    if (args.length) logs.push(String(args[0]))
  }
  return { logs, restore: () => { console[name] = orig } }
}

describe('completions command', () => {
  it('shows usage when no shell provided', async () => {
    const { logs, restore } = capture('log')
    await completionsModule.completionsCommand()
    restore()

    assert.ok(logs.some(l => l.includes('Usage: rolecraft completions bash|zsh|fish')))
  })

  it('generates bash completions', async () => {
    const { logs, restore } = capture('log')
    await completionsModule.completionsCommand('bash')
    restore()

    const output = logs.join('\n')
    assert.ok(output.includes('_rolecraft'))
    assert.ok(output.includes('compgen'))
    assert.ok(output.includes('complete -F _rolecraft rolecraft'))
  })

  it('generates zsh completions', async () => {
    const { logs, restore } = capture('log')
    await completionsModule.completionsCommand('zsh')
    restore()

    const output = logs.join('\n')
    assert.ok(output.includes('#compdef rolecraft'))
    assert.ok(output.includes('_arguments'))
  })

  it('generates fish completions', async () => {
    const { logs, restore } = capture('log')
    await completionsModule.completionsCommand('fish')
    restore()

    const output = logs.join('\n')
    assert.ok(output.includes('complete -f -c rolecraft'))
    assert.ok(output.includes('__fish_rolecraft_needs_command'))
  })

  it('errors on unknown shell', async () => {
    const { logs, restore } = capture('error')
    await assert.rejects(
      () => completionsModule.completionsCommand('tcsh'),
      /Unknown shell: tcsh/,
    )
    restore()
  })
})
