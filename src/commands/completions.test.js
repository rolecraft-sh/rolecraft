import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import AGENTS_DATA from '../agents.js'

let completionsModule
let completionsApi

const addedCommands = [
  'agents',
  'rollback',
  'check',
  'watch',
  'convert',
  'diff',
  'compose',
  'test',
  'profile',
]

const addedLongFlags = [
  'yes',
  'no-mcp',
  'list',
  'skill',
  'json',
  'skills-sh',
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
]

before(async () => {
  completionsModule = await import('./completions.js')
  completionsApi = await import('../api/completions.js')
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

function assertIncludesAgentScopes(output, shell) {
  for (const { flag, label } of AGENTS_DATA) {
    const option = shell === 'fish' ? `-l ${flag}` : `--${flag}`
    assert.ok(
      output.includes(option),
      `${shell} completions should include ${option}`,
    )
    if (shell === 'bash') continue
    assert.ok(
      output.includes(label),
      `${shell} completions should include ${flag} label ${label}`,
    )
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
    assertIncludesAgentScopes(output, 'bash')
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
    assertIncludesAgentScopes(output, 'zsh')
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
    assertIncludesAgentScopes(output, 'fish')
  })

  it('errors on unknown shell', async () => {
    const { restore } = capture('error')
    await assert.rejects(
      () => completionsModule.completionsCommand('tcsh'),
      /Unknown shell: tcsh/,
    )
    restore()
  })

  it('uses the command generators for the public API', () => {
    assert.equal(
      completionsApi.completionApi('bash'),
      completionsModule.bashScript(),
    )
    assert.equal(
      completionsApi.completionApi('zsh'),
      completionsModule.zshScript(),
    )
    assert.equal(
      completionsApi.completionApi('fish'),
      completionsModule.fishScript(),
    )
  })
})
