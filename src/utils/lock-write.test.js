import { describe, it, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { __testing, writeJsonAtomic } from './lock-write.js'
import { UserError } from './errors.js'

const { renameWithRetry, isTransientRenameError, contentionError } = __testing

const dirs = []

async function scratch() {
  const dir = await mkdtemp(join(tmpdir(), 'lockwrite-'))
  dirs.push(dir)
  return dir
}

after(async () => {
  for (const dir of dirs) await rm(dir, { recursive: true, force: true })
})

/**
 * Hold a destination open the way another process would.
 *
 * Windows refuses to replace a file while any handle is open on it, which is
 * what produces EPERM. POSIX does not, so on Linux this cannot reproduce the
 * failure and the tests that need it say so rather than passing vacuously.
 */
const isWindows = process.platform === 'win32'

describe('renameWithRetry', () => {
  it('renames when nothing is contending', async () => {
    const dir = await scratch()
    const from = join(dir, 'a.tmp')
    const to = join(dir, 'b.json')
    await writeFile(from, 'hello')

    await renameWithRetry(from, to)

    assert.equal((await rename.length) === 2, true)
    const { readFile } = await import('node:fs/promises')
    assert.equal(await readFile(to, 'utf-8'), 'hello')
  })

  it('does not retry a failure that is not contention', async () => {
    const dir = await scratch()
    const missing = join(dir, 'never-existed.tmp')
    const to = join(dir, 'target.json')

    // ENOENT is not transient, so it must surface immediately with its own
    // code rather than being dressed up as a lock another process is holding.
    await assert.rejects(
      () => renameWithRetry(missing, to),
      (error) => {
        assert.equal(error.code, 'ENOENT')
        assert.equal(error instanceof UserError, false)
        return true
      },
    )
  })

  it('does not retry a permanent failure even when attempts remain', async () => {
    const dir = await scratch()
    const missing = join(dir, 'also-never-existed.tmp')
    const to = join(dir, 'target.json')

    // A permanent failure has to fail on the first attempt. attempts=9 leaves
    // plenty of room to retry, so if the loop treated this as transient the
    // elapsed time would show it.
    const started = Date.now()
    await assert.rejects(
      () => renameWithRetry(missing, to, 9),
      (error) => {
        assert.equal(error.code, 'ENOENT')
        return true
      },
    )
    const elapsed = Date.now() - started

    // The full 5*attempt schedule for 9 attempts is 180ms of sleeping. Well
    // under that means nothing was retried at all.
    assert.ok(elapsed < 100, `failed immediately, took ${elapsed}ms`)
  })

  it('keeps the permanent-failure distinction through the whole window', async () => {
    // The mutant that survived swapped `!transient` for a condition that only
    // throws on a non-final attempt, so a permanent failure would be retried
    // and then reported as contention. This asserts the code survives that.
    for (const code of ['ENOENT', 'ENOSPC', 'EXDEV']) {
      assert.equal(isTransientRenameError({ code }), false, code)
    }

    // And that the two paths produce genuinely different errors rather than
    // the same object shape.
    const permanent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    const surfaced = contentionError('lock.json', permanent)
    assert.notEqual(surfaced.userCode, 'ENOENT')
    assert.ok(
      !(surfaced instanceof UserError) === false,
      'contention is a UserError',
    )
  })

  it('surfaces contention as a UserError once the window is exhausted', async (t) => {
    if (!isWindows) {
      t.skip('a held handle does not block rename on POSIX')
      return
    }

    const dir = await scratch()
    const from = join(dir, 'source.tmp')
    const to = join(dir, 'skill-lock.json')
    await writeFile(from, 'payload')

    const { open } = await import('node:fs/promises')
    const held = await open(to, 'w')
    try {
      await assert.rejects(
        () => renameWithRetry(from, to, 2),
        (error) => {
          assert.ok(error instanceof UserError, 'should be a UserError')
          assert.equal(error.userCode, 'LOCK_WRITE_CONTENDED')
          // The point of the change: the destination, not the temp file.
          assert.ok(
            error.message.includes(to),
            'names the destination lock file',
          )
          assert.equal(error.message.includes(from), false)
          assert.ok(error.suggestion.length > 0, 'carries a suggestion')
          // The errno is kept for --verbose rather than lost.
          assert.ok(error.detail.includes('EPERM'))
          return true
        },
      )
    } finally {
      await held.close()
    }
  })

  it('gives up after the configured number of attempts', async (t) => {
    if (!isWindows) {
      t.skip('a held handle does not block rename on POSIX')
      return
    }

    const dir = await scratch()
    const from = join(dir, 'source.tmp')
    const to = join(dir, 'lock.json')
    await writeFile(from, 'payload')

    const { open } = await import('node:fs/promises')
    const held = await open(to, 'w')

    // attempts=1 means no retry at all, so this returns as fast as the rename
    // does. If the loop ever lost its bound it would hang instead of throwing.
    const started = Date.now()
    await assert.rejects(() => renameWithRetry(from, to, 1))
    const elapsed = Date.now() - started

    await held.close()
    assert.ok(elapsed < 2000, `gave up promptly, took ${elapsed}ms`)
  })

  it('succeeds when the handle is released inside the window', async (t) => {
    if (!isWindows) {
      t.skip('a held handle does not block rename on POSIX')
      return
    }

    const dir = await scratch()
    const from = join(dir, 'source.tmp')
    const to = join(dir, 'lock.json')
    await writeFile(from, 'payload')

    const { open } = await import('node:fs/promises')
    const held = await open(to, 'w')
    setTimeout(() => held.close(), 40)

    // This is the retry earning its keep: the same call that would otherwise
    // fail now completes because the contention clears before the window does.
    await renameWithRetry(from, to)

    const { readFile } = await import('node:fs/promises')
    assert.equal(await readFile(to, 'utf-8'), 'payload')
  })
})

describe('isTransientRenameError', () => {
  it('treats the Windows contention codes as transient', () => {
    for (const code of ['EPERM', 'EBUSY', 'EACCES']) {
      assert.equal(isTransientRenameError({ code }), true, code)
    }
  })

  it('treats every other failure as permanent', () => {
    for (const code of ['ENOENT', 'ENOSPC', 'EXDEV', 'EISDIR', 'ENOTEMPTY']) {
      assert.equal(isTransientRenameError({ code }), false, code)
    }
  })

  it('treats a failure with no code as permanent', () => {
    assert.equal(isTransientRenameError({}), false)
    assert.equal(isTransientRenameError(new Error('boom')), false)
  })
})

describe('contentionError', () => {
  it('names the destination and keeps the errno as detail', () => {
    const cause = Object.assign(new Error('EPERM: nope'), { code: 'EPERM' })
    const error = contentionError('/home/u/.agents/skill-lock.json', cause)

    assert.ok(error instanceof UserError)
    assert.equal(error.userCode, 'LOCK_WRITE_CONTENDED')
    assert.ok(error.message.includes('/home/u/.agents/skill-lock.json'))
    assert.ok(error.message.includes('skill-lock.json'))
    assert.equal(error.message.includes('.tmp'), false)
    assert.equal(error.detail, 'EPERM: nope')
    assert.ok(error.suggestion.length > 0)
  })

  it('formats the way showError expects', async () => {
    const { showError } = await import('./errors.js')
    const cause = Object.assign(new Error('EPERM: nope'), { code: 'EPERM' })
    const error = contentionError('lock.json', cause)

    // showError writes to stderr rather than returning, so capture it.
    const written = []
    const realError = console.error
    console.error = (line) => written.push(line)
    try {
      showError(error, {})
    } finally {
      console.error = realError
    }

    const text = written.join('\n')
    assert.ok(text.includes('lock.json'), 'names the lock file')
    assert.ok(text.includes('💡'), 'shows the suggestion')
    assert.equal(text.includes('.tmp'), false, 'leaks no temp path')
  })
})

describe('writeJsonAtomic', () => {
  it('still cleans up the temp file when the rename fails', async () => {
    const dir = await scratch()
    const lockPath = join(dir, 'broken.json')

    // A directory where the lock file should be makes the rename fail with
    // something non-transient, which is enough to exercise the cleanup path.
    const { mkdir } = await import('node:fs/promises')
    await mkdir(lockPath, { recursive: true })

    await assert.rejects(() => writeJsonAtomic(lockPath, { a: 1 }))

    const { readdir } = await import('node:fs/promises')
    const leftovers = (await readdir(dir)).filter((f) => f.includes('.tmp'))
    assert.deepEqual(leftovers, [], 'no temp file left behind')
  })
})
