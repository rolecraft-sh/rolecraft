import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, realpathSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { initApi } from './init.js'

let tempDir
let originalCwd

before(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-init-test-'))
  originalCwd = process.cwd()
  process.chdir(tempDir)
})

after(async () => {
  process.chdir(originalCwd)
  await rm(tempDir, { recursive: true, force: true })
})

describe('initApi', () => {
  it('creates the default skill and returns its generated metadata', async () => {
    const result = await initApi()

    assert.deepEqual(result, {
      // initApi joins onto process.cwd(), which resolves symlinks. On macOS
      // mkdtempSync hands back /var/... while cwd reports /private/var/...,
      // so comparing against tempDir directly fails on that platform only.
      path: realpathSync(join(tempDir, 'my-skill', 'SKILL.md')),
      slug: 'my-skill',
      name: 'my-skill',
      owner: 'local',
    })

    const content = readFileSync(result.path, 'utf-8')
    assert.match(
      content,
      /^---\nname: my-skill\nslug: my-skill\nowner: local\n/,
    )
    assert.match(content, /^description: Describe what this skill does$/m)
    assert.match(content, /^Write your skill instructions here\.$/m)
  })

  it('uses the owner and display name from a namespaced slug', async () => {
    const result = await initApi('team/release-notes')

    assert.equal(result.slug, 'team/release-notes')
    assert.equal(result.name, 'release-notes')
    assert.equal(result.owner, 'team')

    const content = readFileSync(result.path, 'utf-8')
    assert.match(content, /^name: release-notes$/m)
    assert.match(content, /^slug: team\/release-notes$/m)
    assert.match(content, /^owner: team$/m)
  })
})
