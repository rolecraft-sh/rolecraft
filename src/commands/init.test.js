import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, initModule, origCwd

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

    await initModule.initCommand('test-skill')

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

    await initModule.initCommand()

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

    await initModule.initCommand('review-skill', {
      template: 'code-review',
    })

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
        initModule.initCommand('bad-template-skill', {
          template: 'nonexistent',
        }),
      /Unknown template/,
    )
  })

  it('creates skill with git-workflow template', async () => {
    const dir = join(tempDir, 'git-skill')
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true })
    }

    await initModule.initCommand('git-skill', {
      template: 'git-workflow',
    })

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
