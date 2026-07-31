import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdtempSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'),
)
const VERSION = pkg.version

let tempDir, upgradeModule, logs, origLog, origExit, origError

function captureLog() {
  logs = []
  origLog = console.log
  origError = console.error
  console.log = (...args) => {
    if (args.length) logs.push(String(args[0]))
  }
  console.error = (...args) => {
    if (args.length) logs.push(String(args[0]))
  }
}

function restoreLog() {
  console.log = origLog
  console.error = origError
}

function mockExit() {
  origExit = process.exit
  process.exit = (code) => {
    throw new Error(`exit:${code}`)
  }
}

function restoreExit() {
  process.exit = origExit
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-upgrade-test-'))
  process.env.HOME = tempDir
  upgradeModule = await import('./upgrade.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe('upgrade command', () => {
  it('shows current version and check message', async () => {
    captureLog()
    mockExit()
    try {
      await upgradeModule.upgradeCommand()
    } catch (e) {
      if (!e.message.startsWith('exit:')) throw e
    }
    restoreLog()
    restoreExit()

    assert.ok(logs.some((l) => l.includes(`v${VERSION}`)))
    assert.ok(logs.some((l) => l.includes('Checking for updates')))
  })

  it('dry-run shows plan without upgrading', async () => {
    captureLog()
    await upgradeModule.upgradeCommand({ dryRun: true })
    restoreLog()

    assert.ok(logs.some((l) => l.includes('[dry-run]')))
    assert.ok(logs.some((l) => l.includes('Current:')))
  })

  it('dry-run shows current version', async () => {
    captureLog()
    await upgradeModule.upgradeCommand({ dryRun: true })
    restoreLog()

    assert.ok(logs.some((l) => l.includes(`v${VERSION}`)))
  })

  it('compares versions correctly', () => {
    const { compareVersions } = upgradeModule
    assert.equal(compareVersions('1.0.0', '1.0.0'), 0)
    assert.ok(compareVersions('1.0.1', '1.0.0') > 0)
    assert.ok(compareVersions('1.0.0', '1.0.1') < 0)
    assert.ok(compareVersions('2.0.0', '1.9.9') > 0)
    assert.ok(compareVersions('1.0.0', '0.9.9') > 0)
  })

  it('dry-run shows message when fetch fails', async () => {
    const origFetch = globalThis.fetch
    globalThis.fetch = () => Promise.reject(new Error('network error'))

    captureLog()
    await upgradeModule.upgradeCommand({ dryRun: true })
    restoreLog()

    globalThis.fetch = origFetch

    assert.ok(logs.some((l) => l.includes('could not fetch')))
  })

  it('dry-run shows would-install when newer version exists', async () => {
    const origFetch = globalThis.fetch
    globalThis.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: '99.99.99' }),
      })

    captureLog()
    await upgradeModule.upgradeCommand({ dryRun: true })
    restoreLog()

    globalThis.fetch = origFetch

    assert.ok(logs.some((l) => l.includes('Would install')))
  })

  it('shows warning when fetch fails without dry-run', async () => {
    const origFetch = globalThis.fetch
    globalThis.fetch = () => Promise.reject(new Error('network error'))

    captureLog()
    await upgradeModule.upgradeCommand()
    restoreLog()

    globalThis.fetch = origFetch

    assert.ok(logs.some((l) => l.includes('Could not check')))
  })

  it('executes upgrade when newer version exists on npm', async () => {
    const origFetch = globalThis.fetch
    globalThis.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: '99.99.99' }),
      })

    captureLog()
    await upgradeModule.upgradeCommand({ execSync: () => {} })
    restoreLog()

    globalThis.fetch = origFetch

    assert.ok(logs.some((l) => l.includes('Upgraded to')))
    assert.ok(logs.some((l) => l.includes('Restart your terminal')))
  })

  it('shows upgrade failed message when execSync throws', async () => {
    const origFetch = globalThis.fetch
    globalThis.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: '99.99.99' }),
      })

    captureLog()
    await assert.rejects(
      () =>
        upgradeModule.upgradeCommand({
          execSync: () => {
            throw new Error('install failed')
          },
        }),
      /Try running manually/,
    )
    restoreLog()

    globalThis.fetch = origFetch

    assert.ok(logs.some((l) => l.includes('Upgrading to')))
  })
})
