import { after, afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareVersions, upgradeApi } from './upgrade.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'),
)
const CURRENT = pkg.version
const [major, minor, patch] = CURRENT.split('.').map(Number)
const NEWER = `${major}.${minor}.${patch + 1}`
const OLDER = patch > 0 ? `${major}.${minor}.${patch - 1}` : `${major - 1}.0.0`

const originalFetch = globalThis.fetch
let fetchCalls

function mockRegistry(response) {
  fetchCalls = []
  globalThis.fetch = async (url) => {
    fetchCalls.push(url)
    if (response instanceof Error) throw response
    return response
  }
}

function registryVersion(version) {
  return {
    ok: true,
    status: 200,
    async json() {
      return { version }
    },
  }
}

function recordingExecSync() {
  const calls = []
  const fn = (command, options) => {
    calls.push({ command, options })
    return ''
  }
  return { calls, fn }
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

after(() => {
  globalThis.fetch = originalFetch
})

describe('compareVersions', () => {
  it('compares major, minor and patch numerically', () => {
    assert.equal(compareVersions('1.2.3', '1.2.3'), 0)
    assert.ok(compareVersions('1.10.0', '1.9.9') > 0)
    assert.ok(compareVersions('1.2.3', '2.0.0') < 0)
    assert.ok(compareVersions('1.2.10', '1.2.9') > 0)
  })
})

describe('upgradeApi', () => {
  it('queries the npm registry for the rolecraft latest version', async () => {
    mockRegistry(registryVersion(CURRENT))
    await upgradeApi({ dryRun: true })
    assert.deepEqual(fetchCalls, [
      'https://registry.npmjs.org/rolecraft/latest',
    ])
  })

  it('dry-run returns the check result without running npm', async () => {
    mockRegistry(registryVersion(NEWER))
    const exec = recordingExecSync()
    const checks = []

    const result = await upgradeApi({
      dryRun: true,
      execSync: exec.fn,
      onCheck: (c) => checks.push(c),
    })

    assert.deepEqual(result, {
      current: CURRENT,
      latest: NEWER,
      isUpToDate: false,
      dryRun: true,
    })
    assert.deepEqual(checks, [
      { current: CURRENT, latest: NEWER, isUpToDate: false },
    ])
    assert.equal(exec.calls.length, 0)
  })

  it('does not upgrade when already on the latest version', async () => {
    mockRegistry(registryVersion(CURRENT))
    const exec = recordingExecSync()

    const result = await upgradeApi({ execSync: exec.fn })

    assert.deepEqual(result, {
      current: CURRENT,
      latest: CURRENT,
      isUpToDate: true,
      upgraded: false,
      reason: 'Already up to date',
    })
    assert.equal(exec.calls.length, 0)
  })

  it('treats an older registry version as up to date', async () => {
    mockRegistry(registryVersion(OLDER))
    const exec = recordingExecSync()

    const result = await upgradeApi({ execSync: exec.fn })

    assert.equal(result.isUpToDate, true)
    assert.equal(result.upgraded, false)
    assert.equal(exec.calls.length, 0)
  })

  it('installs the latest version with npm when an update exists', async () => {
    mockRegistry(registryVersion(NEWER))
    const exec = recordingExecSync()

    const result = await upgradeApi({ execSync: exec.fn, silent: true })

    assert.deepEqual(result, {
      current: CURRENT,
      latest: NEWER,
      isUpToDate: false,
      upgraded: true,
      version: NEWER,
    })
    assert.equal(exec.calls.length, 1)
    assert.equal(exec.calls[0].command, `npm install -g rolecraft@${NEWER}`)
    assert.equal(exec.calls[0].options.stdio, 'pipe')
    assert.equal(exec.calls[0].options.env.npm_config_fund, 'false')
    assert.equal(exec.calls[0].options.env.npm_config_audit, 'false')
  })

  it('inherits stdio when not silent', async () => {
    mockRegistry(registryVersion(NEWER))
    const exec = recordingExecSync()

    await upgradeApi({ execSync: exec.fn })

    assert.equal(exec.calls[0].options.stdio, 'inherit')
  })

  it('reports a failed registry lookup without upgrading', async () => {
    const exec = recordingExecSync()
    for (const response of [
      new Error('offline'),
      { ok: false, status: 503, json: async () => ({}) },
    ]) {
      mockRegistry(response)

      const result = await upgradeApi({ execSync: exec.fn })

      assert.deepEqual(result, {
        current: CURRENT,
        latest: null,
        isUpToDate: null,
        upgraded: false,
        reason:
          'Could not fetch latest version. Check your internet connection.',
      })
    }
    assert.equal(exec.calls.length, 0)
  })

  it('refuses to run npm with an unsafe version string', async () => {
    mockRegistry(registryVersion(`${major + 1}.0.0; rm -rf /`))
    const exec = recordingExecSync()

    await assert.rejects(
      () => upgradeApi({ execSync: exec.fn }),
      /Invalid version: /,
    )
    assert.equal(exec.calls.length, 0)
  })

  it('throws a manual-upgrade hint when npm install fails', async () => {
    mockRegistry(registryVersion(NEWER))

    await assert.rejects(
      () =>
        upgradeApi({
          execSync: () => {
            throw new Error('EACCES')
          },
        }),
      /Upgrade failed\. Try running manually: npm install -g rolecraft/,
    )
  })
})
