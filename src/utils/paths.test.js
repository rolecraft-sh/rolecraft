import assert from 'node:assert/strict'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { expandTilde } from './paths.js'

describe('expandTilde', () => {
  it('expands a tilde-prefixed path from the home directory', () => {
    assert.equal(
      expandTilde('~/skills/example'),
      join(homedir(), 'skills/example'),
    )
  })

  it('expands a bare tilde to the home directory', () => {
    assert.equal(expandTilde('~'), homedir())
  })

  it('supports an explicit home directory', () => {
    assert.equal(
      expandTilde('~/fixture.json', '/tmp'),
      join('/tmp', 'fixture.json'),
    )
  })

  it('leaves non-tilde paths unchanged', () => {
    assert.equal(expandTilde('/tmp/example'), '/tmp/example')
    assert.equal(expandTilde('./example'), './example')
  })
})
