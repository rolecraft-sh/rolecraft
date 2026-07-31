import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, initModule, origCwd

/**
 * Runs a function while suppressing console.log.
 *
 * The init command prints `✅`/`→` (non-ASCII) to stdout. When node:test
 * runs each test file in a child process, that output shares the same pipe
 * as the v8-serialized result frames. A chunk boundary landing on a
 * non-ASCII byte can make the runner desync and fail the whole file with
 * "Unable to deserialize cloned data" — unrelated to the assertions.
 * See nodejs/node#64061.
 */
async function quietly(fn) {
  const origLog = console.log
  console.log = () => {}
  try {
    return await fn()
  } finally {
    console.log = origLog
  }
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-init-test-'))
  origCwd = process.cwd()
  process.chdir(tempDir)
  initModule = await import('./init.js')
})

after(async () => {
  process.chdir(origCwd)
  await rm(tempDir, { recursive: true, force: true })
})

describe('init command', () => {
  it('creates a basic skill scaffold with no options (backward compatible)', async () => {
    const dir = join(tempDir, 'test-skill')
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true })
    }

    await quietly(() => initModule.initCommand('test-skill'))

    const skPath = join(dir, 'SKILL.md')
    assert.ok(existsSync(skPath), 'SKILL.md was created')

    const content = readFileSync(skPath, 'utf-8')
    assert.ok(content.includes('name: test-skill'))
    assert.ok(content.includes('slug: test-skill'))
    assert.ok(content.includes('owner: local'))
    assert.ok(content.includes('description: Describe what this skill does'))
    assert.ok(content.includes('Write your skill instructions here.'))

    await rm(dir, { recursive: true, force: true })
  })

  it('creates a skill scaffold when name is undefined (defaults to my-skill)', async () => {
    const dir = join(tempDir, 'my-skill')
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true })
    }

    await quietly(() => initModule.initCommand())

    const skPath = join(dir, 'SKILL.md')
    assert.ok(existsSync(skPath), 'SKILL.md was created')
    const content = readFileSync(skPath, 'utf-8')
    assert.ok(content.includes('name: my-skill'))

    await rm(dir, { recursive: true, force: true })
  })

  it('creates skill with template when --template is specified', async () => {
    const dir = join(tempDir, 'review-skill')
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true })
    }

    await quietly(() =>
      initModule.initCommand('review-skill', {
        template: 'code-review',
      }),
    )

    const skPath = join(dir, 'SKILL.md')
    assert.ok(existsSync(skPath), 'SKILL.md was created')

    const content = readFileSync(skPath, 'utf-8')
    assert.ok(content.includes('name: review-skill'))
    assert.ok(content.includes('slug: review-skill'))
    assert.ok(content.includes('owner: local'))
    assert.ok(content.includes('## When to Use'))
    assert.ok(content.includes('## Review Checklist'))
    assert.ok(content.includes('category: code-quality'))

    await rm(dir, { recursive: true, force: true })
  })

  it('throws for unknown template', async () => {
    await assert.rejects(
      () =>
        quietly(() =>
          initModule.initCommand('bad-template-skill', {
            template: 'nonexistent',
          }),
        ),
      /Unknown template/,
    )
  })

  it('creates skill with git-workflow template', async () => {
    const dir = join(tempDir, 'git-skill')
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true })
    }

    await quietly(() =>
      initModule.initCommand('git-skill', {
        template: 'git-workflow',
      }),
    )

    const skPath = join(dir, 'SKILL.md')
    assert.ok(existsSync(skPath), 'SKILL.md was created')
    const content = readFileSync(skPath, 'utf-8')
    assert.ok(content.includes('name: git-skill'))
    assert.ok(content.includes('## Branch Strategy'))
    assert.ok(content.includes('## Commit Convention'))
    assert.ok(content.includes('category: workflow'))

    await rm(dir, { recursive: true, force: true })
  })

  it('--list outputs available templates', async () => {
    const logs = []
    const origLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    await initModule.initCommand(null, { list: true })

    console.log = origLog

    const output = logs.join('\n')
    assert.ok(output.includes('basic'))
    assert.ok(output.includes('code-review'))
    assert.ok(output.includes('git-workflow'))
    assert.ok(output.includes('testing'))
    assert.ok(output.includes('security'))
    assert.ok(output.includes('react'))
  })
})
