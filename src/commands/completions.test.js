import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'

let completionsModule

const addedCommands = [
  'check',
  'watch',
  'convert',
  'diff',
  'compose',
  'test',
  'publish',
  'profile',
]

const addedLongFlags = [
  'yes',
  'no-mcp',
  'list',
  'skill',
  'json',
  'skills-sh',
  'registry',
  'network',
  'deep',
  'write',
  'brief',
  'context',
  'chain',
  'force',
  'output',
  'verbose',
  'no-emoji',
  'min-score',
  'only',
  'repo',
  'slug',
]

before(async () => {
  completionsModule = await import('./completions.js')
})

function capture(name) {
  const orig = console[name]
  const logs = []
  console[name] = (...args) => {
    if (args.length) logs.push(String(args[0]))
  }
  return {
    logs,
    restore: () => {
      console[name] = orig
    },
  }
}

describe('completions command', () => {
  it('shows usage when no shell provided', async () => {
    const { logs, restore } = capture('log')
    await completionsModule.completionsCommand()
    restore()

    assert.ok(
      logs.some((l) =>
        l.includes('Usage: rolecraft completions bash|zsh|fish'),
      ),
    )
  })

  it('generates bash completions', async () => {
    const { logs, restore } = capture('log')
    await completionsModule.completionsCommand('bash')
    restore()

    const output = logs.join('\n')
    assert.ok(output.includes('_rolecraft'))
    assert.ok(output.includes('compgen'))
    assert.ok(output.includes('complete -F _rolecraft rolecraft'))
    assert.ok(output.includes('mcp'))
    ;['install', 'list', 'search', 'check', 'update', 'remove'].forEach(
      (cmd) => {
        assert.ok(
          output.includes(cmd),
          `bash completions should include ${cmd}`,
        )
      },
    )
    for (const value of [
      ...addedCommands,
      ...addedLongFlags.map((flag) => `--${flag}`),
    ]) {
      assert.ok(
        output.includes(value),
        `bash completions should include ${value}`,
      )
    }
  })

  it('generates zsh completions', async () => {
    const { logs, restore } = capture('log')
    await completionsModule.completionsCommand('zsh')
    restore()

    const output = logs.join('\n')
    assert.ok(output.includes('#compdef rolecraft'))
    assert.ok(output.includes('_arguments'))
    assert.ok(output.includes('(install list search check update remove)'))
    for (const value of [
      ...addedCommands,
      ...addedLongFlags.map((flag) => `--${flag}`),
    ]) {
      assert.ok(
        output.includes(value),
        `zsh completions should include ${value}`,
      )
    }
  })

  it('generates fish completions', async () => {
    const { logs, restore } = capture('log')
    await completionsModule.completionsCommand('fish')
    restore()

    const output = logs.join('\n')
    assert.ok(output.includes('complete -f -c rolecraft'))
    assert.ok(output.includes('__fish_rolecraft_needs_command'))
    assert.ok(output.includes('Install an MCP server'))
    assert.ok(output.includes('Search for MCP servers'))
    assert.ok(output.includes('Check for MCP updates'))
    for (const command of addedCommands) {
      assert.ok(
        output.includes(`-a ${command}`),
        `fish completions should include ${command}`,
      )
    }
    for (const flag of addedLongFlags) {
      assert.ok(
        output.includes(flag),
        `fish completions should include --${flag}`,
      )
    }
  })

  it('errors on unknown shell', async () => {
    const { restore } = capture('error')
    await assert.rejects(
      () => completionsModule.completionsCommand('tcsh'),
      /Unknown shell: tcsh/,
    )
    restore()
  })
})
