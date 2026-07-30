import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'

let commandModule

before(async () => {
  commandModule = await import('./rollback.js')
})

describe('rollback command', () => {
  it('shows help with --help flag', async () => {
    const logs = []
    const origLog = console.log
    console.log = (...args) => {
      if (args.length) logs.push(String(args[0]))
    }

    await commandModule.rollbackCommand(['--help'])

    assert.ok(logs.some((l) => l.includes('Usage:')))
    assert.ok(logs.some((l) => l.includes('rollback')))
    console.log = origLog
  })

  it('shows help with -h flag', async () => {
    const logs = []
    const origLog = console.log
    console.log = (...args) => {
      if (args.length) logs.push(String(args[0]))
    }

    await commandModule.rollbackCommand(['-h'])

    assert.ok(logs.some((l) => l.includes('Usage:')))
    console.log = origLog
  })

  it('throws UserError when slug is missing', async () => {
    await assert.rejects(
      () => commandModule.rollbackCommand([]),
      /Missing slug argument/,
    )
  })

  it('throws UserError when skill not found via API', async () => {
    await assert.rejects(
      () => commandModule.rollbackCommand(['nonexistent-slug']),
      /not installed/,
    )
  })
})
