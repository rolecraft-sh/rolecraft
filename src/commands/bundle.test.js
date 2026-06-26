import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, bundleModule, origCwd, origHome, origLog, logs

function capture() {
  logs = []
  origLog = console.log
  console.log = (...args) => {
    if (args.length) logs.push(String(args[0]))
  }
}

function restoreLog() {
  console.log = origLog
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-bundle-test-'))
  origCwd = process.cwd()
  origHome = process.env.HOME
  process.env.HOME = tempDir
  process.chdir(tempDir)

  mkdirSync(join(tempDir, '.agents'), { recursive: true })
  await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({ version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [] }))

  bundleModule = await import('./bundle.js')
})

after(async () => {
  process.chdir(origCwd)
  process.env.HOME = origHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('bundle command', () => {
  it('installs from a JSON array file', async () => {
    const skillDir1 = join(tempDir, 'bundle-skill-1')
    mkdirSync(skillDir1, { recursive: true })
    writeFileSync(join(skillDir1, 'SKILL.md'), '# slug: test/bundle1\nname: bundle1\nContent')

    const skillDir2 = join(tempDir, 'bundle-skill-2')
    mkdirSync(skillDir2, { recursive: true })
    writeFileSync(join(skillDir2, 'SKILL.md'), '# slug: test/bundle2\nname: bundle2\nContent')

    const bundlePath = join(tempDir, 'test-bundle.json')
    writeFileSync(bundlePath, JSON.stringify([skillDir1, skillDir2]))

    capture()
    await bundleModule.bundleCommand(bundlePath)
    restoreLog()

    assert.ok(logs.some(l => l.includes('All 2 skill(s) installed')))
  })

  it('installs from a JSON object with skills key', async () => {
    const skillDir = join(tempDir, 'bundle-obj-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/bundle-obj\nname: bundle-obj\nContent')

    const bundlePath = join(tempDir, 'test-bundle-obj.json')
    writeFileSync(bundlePath, JSON.stringify({ skills: [skillDir] }))

    capture()
    await bundleModule.bundleCommand(bundlePath)
    restoreLog()

    assert.ok(logs.some(l => l.includes('All 1 skill(s) installed')))
  })

  it('reads skills from a text file', async () => {
    const skillDir = join(tempDir, 'bundle-txt-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/bundle-txt\nname: bundle-txt\nContent')

    const bundlePath = join(tempDir, 'test-bundle.txt')
    writeFileSync(bundlePath, `# comment\n${skillDir}\n`)

    capture()
    await bundleModule.bundleCommand(bundlePath)
    restoreLog()

    assert.ok(logs.some(l => l.includes('All 1 skill(s) installed')))
  })

  it('handles empty bundle file gracefully', async () => {
    const bundlePath = join(tempDir, 'empty-bundle.json')
    writeFileSync(bundlePath, '[]')

    capture()
    await bundleModule.bundleCommand(bundlePath)
    restoreLog()

    assert.ok(logs.some(l => l.includes('No skills')))
  })

  it('installs inline sources when multiple args given', async () => {
    const skillDir = join(tempDir, 'inline-skill-1')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/inline1\nname: inline1\nContent')

    capture()
    await bundleModule.bundleCommand([skillDir], {})
    restoreLog()

    assert.ok(logs.some(l => l.includes('All 1 skill(s) installed')))
  })

  it('shows dry-run with inline sources', async () => {
    capture()
    await bundleModule.bundleCommand(['owner/fake-skill'], { dryRun: true })
    restoreLog()

    assert.ok(logs.some(l => l.includes('Would install')))
    assert.ok(logs.some(l => l.includes('1 skill')))
  })

  it('shows dry-run with file bundle', async () => {
    const skillDir = join(tempDir, 'dry-bundle-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/dry-bundle\nname: dry-bundle\nContent')

    const bundlePath = join(tempDir, 'dry-bundle.json')
    writeFileSync(bundlePath, JSON.stringify([skillDir]))

    capture()
    await bundleModule.bundleCommand(bundlePath, { dryRun: true })
    restoreLog()

    assert.ok(logs.some(l => l.includes('Would install')))
    assert.ok(logs.some(l => l.includes('1 skill')))
  })

  it('treats single arg as source when file not found', async () => {
    capture()
    await bundleModule.bundleCommand('owner/nonexistent-skill', { global: true })
    restoreLog()

    assert.ok(logs.some(l => l.includes('[1/1] owner/nonexistent-skill')))
  })

  it('throws when bundle file read fails', async () => {
    await assert.rejects(
      () => bundleModule.bundleCommand(join(tempDir, 'nonexistent-bundle.json')),
      /Bundle file not found/,
    )
  })

  it('creates a bundle file with a given name', async () => {
    capture()
    await bundleModule.bundleCreateCommand('test-collection')
    restoreLog()

    assert.ok(logs.some(l => l.includes('Created')))

    const { readFileSync, existsSync } = await import('node:fs')
    const createdPath = join(tempDir, 'test-collection.json')
    assert.ok(existsSync(createdPath))
    const content = JSON.parse(readFileSync(createdPath, 'utf-8'))
    assert.equal(content.name, 'test-collection')
    assert.ok(Array.isArray(content.skills))
  })
})
