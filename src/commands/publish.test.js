import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let publishModule

before(async () => {
  publishModule = await import('./publish.js')
})

after(() => {
  publishModule.setAskQuestion(undefined)
  publishModule.setSpawnSync(undefined)
})

let testDir

function capture(name) {
  const orig = console[name]
  const logs = []
  console[name] = (...args) => {
    if (args.length) logs.push(String(args[0]))
  }
  return {
    logs,
    restore: () => {
      console[name] = orig
    },
  }
}

function createTestSkill(dir, overrides = {}) {
  mkdirSync(dir, { recursive: true })
  const frontmatter = [
    '---',
    `name: ${overrides.name || 'Test Skill'}`,
    `slug: ${overrides.slug || 'test-skill'}`,
    `description: ${overrides.description || 'A test skill'}`,
    '---',
    '## Code Style',
    'Use tabs',
    '## Testing',
    'Write tests',
  ].join('\n')
  writeFileSync(join(dir, 'SKILL.md'), frontmatter)
}

describe('publish command', () => {
  afterEach(async () => {
    publishModule.setAskQuestion(undefined)
    publishModule.setSpawnSync(undefined)
    if (testDir) {
      await rm(testDir, { recursive: true, force: true })
      testDir = null
    }
  })

  it('shows dry-run output', async () => {
    testDir = mkdtempSync(join(tmpdir(), 'publish-test-'))
    createTestSkill(testDir)

    const { logs, restore } = capture('log')
    await publishModule.publishCommand(testDir, {
      repo: 'user/test-skill',
      dryRun: true,
    })
    restore()

    assert.ok(logs.some((l) => l.includes('[dry-run]')))
    assert.ok(logs.some((l) => l.includes('test-skill')))
    assert.ok(logs.some((l) => l.includes('user/test-skill')))
  })

  it('cancels on user rejection', async () => {
    testDir = mkdtempSync(join(tmpdir(), 'publish-cancel-'))
    createTestSkill(testDir)

    publishModule.setAskQuestion(() => Promise.resolve('n'))

    const { logs, restore } = capture('log')
    await publishModule.publishCommand(testDir, {
      repo: 'user/test-skill',
    })
    restore()

    assert.ok(logs.some((l) => l.includes('cancelled')))
  })

  it('proceeds with --yes flag', async () => {
    testDir = mkdtempSync(join(tmpdir(), 'publish-yes-'))
    createTestSkill(testDir)

    publishModule.setAskQuestion(() => Promise.resolve('n'))

    const { logs, restore } = capture('log')
    await publishModule.publishCommand(testDir, {
      repo: 'user/test-skill',
      yes: true,
    })
    restore()

    assert.ok(logs.some((l) => l.includes('Publishing')))
  })

  it('shows error for invalid source', async () => {
    const { logs, restore } = capture('error')
    await publishModule.publishCommand('/nonexistent/path', {
      dryRun: true,
    })
    restore()

    assert.ok(logs.some((l) => l.includes('Failed to resolve')))
  })

  it('shows error for invalid repo format', async () => {
    testDir = mkdtempSync(join(tmpdir(), 'publish-repo-'))
    createTestSkill(testDir)

    const { logs, restore } = capture('error')
    await publishModule.publishCommand(testDir, {
      repo: 'invalid-repo-format',
      dryRun: false,
      yes: true,
    })
    restore()

    assert.ok(logs.some((l) => l.includes('Invalid repo format')))
  })

  it('detects repo from git remote', async () => {
    testDir = mkdtempSync(join(tmpdir(), 'publish-git-'))
    createTestSkill(testDir)

    publishModule.setSpawnSync(() => ({
      stdout: Buffer.from('git@github.com:user/test-skill.git\n'),
      status: 0,
      error: null,
    }))

    const { logs, restore } = capture('log')
    await publishModule.publishCommand(testDir, {
      yes: true,
      dryRun: true,
    })
    restore()

    assert.ok(logs.some((l) => l.includes('user/test-skill')))
  })

  it('reports publish failure', async () => {
    testDir = mkdtempSync(join(tmpdir(), 'publish-fail-'))
    createTestSkill(testDir)

    const origToken = process.env.GITHUB_TOKEN
    delete process.env.GITHUB_TOKEN
    delete process.env.GH_TOKEN

    try {
      const { logs, restore } = capture('error')
      await publishModule.publishCommand(testDir, {
        repo: 'user/test-skill',
        yes: true,
      })
      restore()

      assert.ok(logs.some((l) => l.includes('Failed to publish')))
    } finally {
      if (origToken) process.env.GITHUB_TOKEN = origToken
    }
  })
})
