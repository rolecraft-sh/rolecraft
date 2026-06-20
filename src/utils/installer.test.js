import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, installerModule, resolvedSkill

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-install-test-'))
  process.env.HOME = tempDir

  const sourceDir = join(tempDir, 'source-skill')
  mkdirSync(sourceDir, { recursive: true })
  writeFileSync(join(sourceDir, 'SKILL.md'), '# slug: test/my-skill\nname: my-skill\n# owner: test\nContent')
  writeFileSync(join(sourceDir, 'helper.js'), 'module.exports = {}\n')

  await mkdir(join(tempDir, '.agents'), { recursive: true })

  resolvedSkill = {
    slug: 'test/my-skill',
    name: 'my-skill',
    owner: 'test',
    content: '# slug: test/my-skill\nname: my-skill\nContent',
    files: ['SKILL.md', 'helper.js'],
    skillDir: sourceDir,
    sourcePath: sourceDir,
    sourceType: 'local',
  }

  installerModule = await import('./installer.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe('installer', () => {
  it('installs skill to agents directory (global)', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['agents'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'agents')

    const skillDir = join(tempDir, '.agents', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
    assert.ok(existsSync(join(skillDir, 'helper.js')))

    const lock = JSON.parse(readFileSync(join(tempDir, '.agents', '.skill-lock.json'), 'utf-8'))
    assert.ok(lock.skills['test/my-skill'])
  })

  it('installs skill to claude directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['claude'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'claude')

    const skillDir = join(tempDir, '.claude', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to project directory', async () => {
    const origCwd = process.cwd
    process.cwd = () => tempDir

    const results = await installerModule.installSkill(resolvedSkill, ['project'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'project')

    const skillDir = join(tempDir, '.agents', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))

    process.cwd = origCwd
  })

  it('installs to multiple targets', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['agents', 'project'])
    assert.equal(results.length, 2)
  })

  it('skips unknown targets', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['unknown'])
    assert.equal(results.length, 0)
  })

  it('handles missing source files gracefully', async () => {
    const badResolved = {
      ...resolvedSkill,
      files: ['SKILL.md', 'nonexistent.js'],
    }
    const results = await installerModule.installSkill(badResolved, ['agents'])
    assert.equal(results.length, 1)
    const skillDir = join(tempDir, '.agents', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
    assert.ok(!existsSync(join(skillDir, 'nonexistent.js')))
  })

  it('installs using fileContents when provided', async () => {
    const fileContentResolved = {
      ...resolvedSkill,
      skillDir: undefined,
      files: ['SKILL.md', 'data.json'],
      fileContents: {
        'SKILL.md': '# slug: test/filecontent\nname: filecontent-skill\nContent',
        'data.json': '{"key": "value"}',
      },
    }
    const results = await installerModule.installSkill(fileContentResolved, ['agents'])
    assert.equal(results.length, 1)

    const skillDir = join(tempDir, '.agents', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
    assert.equal(
      readFileSync(join(skillDir, 'SKILL.md'), 'utf-8'),
      '# slug: test/filecontent\nname: filecontent-skill\nContent',
    )
    assert.ok(existsSync(join(skillDir, 'data.json')))
    assert.equal(
      readFileSync(join(skillDir, 'data.json'), 'utf-8'),
      '{"key": "value"}',
    )
  })
})
