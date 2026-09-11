import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('public API (index.js)', () => {
  it('exports core install/list/remove/update', async () => {
    const api = await import('./index.js')
    assert.equal(typeof api.install, 'function')
    assert.equal(typeof api.list, 'function')
    assert.equal(typeof api.remove, 'function')
    assert.equal(typeof api.update, 'function')
  })

  it('exports diff/compose/test', async () => {
    const api = await import('./index.js')
    assert.equal(typeof api.diff, 'function')
    assert.equal(typeof api.compose, 'function')
    assert.equal(typeof api.test, 'function')
  })

  it('exports mcp/profile functions', async () => {
    const api = await import('./index.js')
    assert.equal(typeof api.mcpInstall, 'function')
    assert.equal(typeof api.mcpList, 'function')
    assert.equal(typeof api.mcpUpdate, 'function')
    assert.equal(typeof api.profileSave, 'function')
    assert.equal(typeof api.profileApply, 'function')
  })
})
