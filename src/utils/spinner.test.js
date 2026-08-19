import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { stdout } from 'node:process'
import { createSpinner, createProgressBar } from './spinner.js'

const origIsTTY = stdout.isTTY
const origWrite = stdout.write
const origColumns = stdout.columns
const origLog = console.log
const origError = console.error

const calls = {
  logs: [],
  writes: [],
  errors: [],
}

function capture(name, output) {
  calls[name].push(String(output))
}

beforeEach(() => {
  calls.logs = []
  calls.writes = []
  calls.errors = []
  stdout.write = (chunk) => {
    capture('writes', chunk)
    return true
  }
  console.log = (chunk) => capture('logs', chunk)
  console.error = (chunk) => capture('errors', chunk)
})

afterEach(() => {
  stdout.isTTY = origIsTTY
  stdout.write = origWrite
  stdout.columns = origColumns
  console.log = origLog
  console.error = origError
})

describe('createSpinner', () => {
  describe('non-TTY', () => {
    beforeEach(() => {
      stdout.isTTY = false
    })

    it('start logs the text', () => {
      createSpinner('installing').start()
      assert.deepEqual(calls.logs, ['installing'])
    })

    it('succeed logs the message', () => {
      createSpinner('install').succeed('done')
      assert.deepEqual(calls.logs, ['done'])
    })

    it('succeed without message logs nothing', () => {
      createSpinner('install').succeed()
      assert.deepEqual(calls.logs, [])
    })

    it('fail logs the message via stderr', () => {
      createSpinner('install').fail('oops')
      assert.deepEqual(calls.errors, ['oops'])
    })
  })

  describe('TTY', () => {
    beforeEach(() => {
      stdout.isTTY = true
    })

    it('succeed writes a check mark and clears the interval', () => {
      const spinner = createSpinner('install')
      spinner.start()
      spinner.succeed()
      assert.ok(calls.writes[calls.writes.length - 1].includes('✓'))
    })

    it('succeed writes the message when provided', () => {
      const spinner = createSpinner('install')
      spinner.start()
      spinner.succeed('ready')
      assert.ok(calls.writes[calls.writes.length - 1].includes('ready'))
    })

    it('fail writes a cross mark', () => {
      const spinner = createSpinner('install')
      spinner.start()
      spinner.fail()
      assert.ok(calls.writes[calls.writes.length - 1].includes('✗'))
    })

    it('start writes the initial frame', () => {
      const spinner = createSpinner('install')
      spinner.start()
      spinner.succeed()
      assert.ok(calls.writes.includes('⠋ install'))
    })
  })
})

describe('createProgressBar', () => {
  describe('non-TTY', () => {
    beforeEach(() => {
      stdout.isTTY = false
    })

    it('start logs the text', () => {
      createProgressBar('downloading').start()
      assert.deepEqual(calls.logs, ['downloading'])
    })

    it('update is a no-op', () => {
      const bar = createProgressBar('download')
      bar.start()
      bar.update(50)
      assert.deepEqual(calls.logs, ['download'])
      assert.deepEqual(calls.writes, [])
    })

    it('succeed logs the message', () => {
      createProgressBar('download').succeed('finished')
      assert.deepEqual(calls.logs, ['finished'])
    })

    it('fail logs the message via stderr', () => {
      createProgressBar('download').fail('broke')
      assert.deepEqual(calls.errors, ['broke'])
    })
  })

  describe('TTY', () => {
    beforeEach(() => {
      stdout.isTTY = true
      stdout.columns = 80
    })

    it('update renders the bar with the correct percentage', () => {
      const bar = createProgressBar('download')
      bar.start()
      bar.update(50)
      const out = calls.writes[calls.writes.length - 1]
      assert.ok(out.includes('50%'))
      assert.ok(out.includes('download'))
    })

    it('update clears the interval by rendering a single frame', () => {
      const bar = createProgressBar('download')
      bar.start()
      bar.update(10)
      assert.ok(calls.writes.some((w) => w.includes('10%')))
    })

    it('succeed renders 100%', () => {
      const bar = createProgressBar('download')
      bar.start()
      bar.succeed()
      const out = calls.writes[calls.writes.length - 2]
      assert.ok(out.includes('100%'))
    })

    it('fail writes a cross mark', () => {
      const bar = createProgressBar('download')
      bar.start()
      bar.fail()
      const out = calls.writes[calls.writes.length - 1]
      assert.ok(out.includes('✗'))
      assert.ok(out.includes('download'))
    })
  })
})

describe('marker colors', () => {
  const spinnerUrl = new URL('./spinner.js', import.meta.url).href

  function runWithEnv(env) {
    const script = `
      process.stdout.isTTY = true
      import(${JSON.stringify(spinnerUrl)}).then(
        ({ createSpinner, createProgressBar }) => {
          createSpinner('install').succeed()
          createSpinner('install').fail()
          createProgressBar('download').succeed()
          createProgressBar('download').fail()
        },
      )
    `
    return spawnSync(process.execPath, ['--input-type=module', '-'], {
      input: script,
      env: { ...process.env, NO_COLOR: '', ...env },
      encoding: 'utf-8',
    })
  }

  it('emits green check and red cross under FORCE_COLOR', () => {
    const result = runWithEnv({ FORCE_COLOR: '1' })
    assert.equal(result.status, 0, result.stderr)
    assert.ok(result.stdout.includes('\x1b[32m✓\x1b[0m'))
    assert.ok(result.stdout.includes('\x1b[31m✗\x1b[0m'))
  })

  it('stays bare when NO_COLOR overrides FORCE_COLOR', () => {
    const result = runWithEnv({ FORCE_COLOR: '1', NO_COLOR: '1' })
    assert.equal(result.status, 0, result.stderr)
    assert.ok(result.stdout.includes('✓'))
    assert.ok(!result.stdout.includes('\x1b[32m'))
  })
})
