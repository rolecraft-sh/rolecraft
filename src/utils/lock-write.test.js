import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { UserError } from './errors.js'
import { __testing } from './lock-write.js'

const from = '/tmp/skill-lock.json.2508.50.tmp'
const to = '/tmp/skill-lock.json'

function codedError(code) {
  return Object.assign(new Error(`rename failed: ${from} -> ${to}`), { code })
}

describe('renameWithRetry', () => {
  it('reports the destination after transient contention is exhausted', async () => {
    const error = codedError('EPERM')
    let calls = 0

    await assert.rejects(
      () =>
        __testing.renameWithRetry(from, to, 2, async () => {
          calls++
          throw error
        }),
      (caught) => {
        assert.ok(caught instanceof UserError)
        assert.equal(caught.userCode, 'LOCK_WRITE_FAILED')
        assert.equal(caught.message, `Could not replace lock file "${to}".`)
        assert.match(caught.suggestion, /holding the lock file/)
        assert.equal(caught.detail, error.message)
        assert.doesNotMatch(caught.message, /\.tmp/)
        return true
      },
    )
    assert.equal(calls, 2)
  })

  it('retries contention and returns when a later rename succeeds', async () => {
    const error = codedError('EBUSY')
    let calls = 0

    const result = await __testing.renameWithRetry(from, to, 2, async () => {
      calls++
      if (calls === 1) throw error
      return 'renamed'
    })

    assert.equal(result, 'renamed')
    assert.equal(calls, 2)
  })

  it('preserves non-transient errors without retrying', async () => {
    const error = codedError('ENOENT')
    let calls = 0

    await assert.rejects(
      () =>
        __testing.renameWithRetry(from, to, 2, async () => {
          calls++
          throw error
        }),
      (caught) => caught === error,
    )
    assert.equal(calls, 1)
  })

  it('does not report EACCES as lock contention', async () => {
    const error = codedError('EACCES')
    let calls = 0

    await assert.rejects(
      () =>
        __testing.renameWithRetry(from, to, 2, async () => {
          calls++
          throw error
        }),
      (caught) => caught === error,
    )
    assert.equal(calls, 2)
  })
})
