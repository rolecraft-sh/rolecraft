import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { UserError, showError } from './errors.js'

describe('UserError', () => {
  it('extends Error', () => {
    const err = new UserError('Something went wrong')
    assert.ok(err instanceof Error)
    assert.ok(err instanceof UserError)
  })

  it('sets message property', () => {
    const err = new UserError('Something went wrong')
    assert.equal(err.message, 'Something went wrong')
  })

  it('sets optional suggestion', () => {
    const err = new UserError('Failed', {
      suggestion: 'Try again.',
    })
    assert.equal(err.suggestion, 'Try again.')
  })

  it('sets optional detail', () => {
    const err = new UserError('Failed', {
      detail: 'HTTP 500',
    })
    assert.equal(err.detail, 'HTTP 500')
  })

  it('sets optional error code', () => {
    const err = new UserError('Failed', {
      code: 'TEST_ERROR',
    })
    assert.equal(err.userCode, 'TEST_ERROR')
  })

  it('defaults optional fields to empty string', () => {
    const err = new UserError('Failed')
    assert.equal(err.suggestion, '')
    assert.equal(err.detail, '')
    assert.equal(err.userCode, '')
  })
})

describe('showError', () => {
  let outputLines = []
  let origConsole

  before(() => {
    origConsole = console.error
    console.error = (...args) => {
      outputLines.push(args.join(' '))
    }
  })

  after(() => {
    console.error = origConsole
  })

  beforeEach(() => {
    outputLines = []
  })

  it('shows ❌ prefix for plain Error', () => {
    showError(new Error('Something broke'))
    assert.ok(outputLines.some((l) => l.includes('❌')))
    assert.ok(outputLines.some((l) => l.includes('Something broke')))
  })

  it('shows message and suggestion for UserError', () => {
    showError(
      new UserError('Failed to fetch', {
        suggestion: 'Check your connection.',
      }),
    )
    assert.ok(
      outputLines.some(
        (l) => l.includes('❌') && l.includes('Failed to fetch'),
      ),
    )
    assert.ok(
      outputLines.some(
        (l) => l.includes('💡') && l.includes('Check your connection'),
      ),
    )
  })

  it('shows detail in verbose mode', () => {
    const origArgv = process.argv
    process.argv = [...origArgv, '--verbose']
    try {
      showError(
        new UserError('Failed', {
          detail: 'HTTP 500',
        }),
      )
      assert.ok(
        outputLines.some((l) => l.includes('🔍') && l.includes('HTTP 500')),
      )
    } finally {
      process.argv = origArgv
    }
  })

  it('shows code in verbose mode', () => {
    const origArgv = process.argv
    process.argv = [...origArgv, '--verbose']
    try {
      showError(
        new UserError('Failed', {
          code: 'NPM_FAIL',
        }),
      )
      assert.ok(outputLines.some((l) => l.includes('NPM_FAIL')))
    } finally {
      process.argv = origArgv
    }
  })

  it('does not show detail without verbose', () => {
    showError(
      new UserError('Failed', {
        detail: 'Secret info',
      }),
    )
    assert.ok(!outputLines.some((l) => l.includes('Secret info')))
  })

  it('handles network errors (ENOTFOUND)', () => {
    const netErr = new Error('getaddrinfo ENOTFOUND registry.npmjs.org')
    netErr.code = 'ENOTFOUND'
    showError(netErr)
    assert.ok(outputLines.some((l) => l.includes('Network error')))
  })

  it('handles network errors (ECONNREFUSED)', () => {
    const netErr = new Error('connect ECONNREFUSED')
    netErr.code = 'ECONNREFUSED'
    showError(netErr)
    assert.ok(outputLines.some((l) => l.includes('Network error')))
  })

  it('handles errors with cause chain', () => {
    const inner = new Error('inner failure')
    const outer = new Error('outer wrapper', { cause: inner })
    showError(outer)
    assert.ok(outputLines.some((l) => l.includes('inner failure')))
  })

  it('formats full UserError (message + suggestion + detail + code) from registry-client', () => {
    showError(
      new UserError('"my-skill" blocked by security scan (score: 45/100).', {
        suggestion: 'Review the flagged issues, fix them, or use --yes.',
        detail: 'Flagged issues:\n  🔴 [critical] eval usage (src/index.js)',
        code: 'SECURITY_DANGER',
      }),
    )
    assert.ok(
      outputLines.some(
        (l) => l.includes('❌') && l.includes('blocked by security scan'),
      ),
    )
    assert.ok(
      outputLines.some(
        (l) => l.includes('💡') && l.includes('Review the flagged issues'),
      ),
    )
  })

  it('suppresses detail and code in non-verbose mode', () => {
    const origArgv = process.argv
    process.argv = origArgv.filter((a) => a !== '--verbose')
    try {
      showError(
        new UserError('Something failed', {
          suggestion: 'Try again.',
          detail: 'Secret detail',
          code: 'TEST_ERR',
        }),
      )
      assert.ok(!outputLines.some((l) => l.includes('Secret detail')))
      assert.ok(!outputLines.some((l) => l.includes('TEST_ERR')))
    } finally {
      process.argv = origArgv
    }
  })
})
