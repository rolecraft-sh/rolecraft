import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { completionApi } from './completions.js'
import { bashScript, zshScript, fishScript } from '../commands/completions.js'

describe('completionApi', () => {
  it('returns the bash completion script', () => {
    const result = completionApi('bash')
    assert.equal(result, bashScript())
    assert.match(result, /rolecraft/)
  })

  it('returns the zsh completion script', () => {
    const result = completionApi('zsh')
    assert.equal(result, zshScript())
    assert.match(result, /rolecraft/)
  })

  it('returns the fish completion script', () => {
    const result = completionApi('fish')
    assert.equal(result, fishScript())
    assert.match(result, /rolecraft/)
  })

  it('throws for an unknown shell', () => {
    assert.throws(
      () => completionApi('powershell'),
      /Unknown shell: powershell/,
    )
  })

  it('throws when no shell is given', () => {
    assert.throws(() => completionApi(), /Unknown shell: undefined/)
  })
})
