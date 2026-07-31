import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'

let agentsModule

before(async () => {
  agentsModule = await import('./agents.js')
})

describe('agents command', () => {
  it('outputs JSON with --json flag', async () => {
    const logs = []
    const origLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      await agentsModule.agentsCommand({ json: true })
      const output = JSON.parse(logs[0])
      assert.ok(output.version)
      assert.ok(output.agentCount > 0)
      assert.ok(Array.isArray(output.agents))
      for (const agent of output.agents) {
        assert.ok(agent.flag)
        assert.ok(agent.name)
      }
    } finally {
      console.log = origLog
    }
  })

  it('outputs formatted table by default', async () => {
    const logs = []
    const origLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      await agentsModule.agentsCommand({})
      const allText = logs.join('\n')
      assert.ok(allText.includes('Agent Capability Manifest'))
      assert.ok(allText.includes('VERIFIED'))
      assert.ok(allText.includes('EXPERIMENTAL'))
    } finally {
      console.log = origLog
    }
  })
})
