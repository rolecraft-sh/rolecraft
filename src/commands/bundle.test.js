import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

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

  it('throws on invalid JSON format', async () => {
    const bundlePath = join(tempDir, 'invalid-structure.json')
    writeFileSync(bundlePath, '{"name": "test"}')

    await assert.rejects(
      () => bundleModule.bundleCommand(bundlePath),
      /JSON bundle must/,
    )
  })

  it('throws on malformed JSON', async () => {
    const bundlePath = join(tempDir, 'malformed.json')
    writeFileSync(bundlePath, 'not json')

    await assert.rejects(
      () => bundleModule.bundleCommand(bundlePath),
      /JSON/,
    )
  })

  it('resolves bundle using candidate paths when arg is a bare name', async () => {
    const skillDir = join(tempDir, 'bare-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/bare\nname: bare\nContent')

    const bundlePath = join(tempDir, 'my-bundle.json')
    writeFileSync(bundlePath, JSON.stringify([skillDir]))

    const origCwd = process.cwd
    process.cwd = () => tempDir
    capture()
    await bundleModule.bundleCommand('my-bundle')
    restoreLog()
    process.cwd = origCwd

    assert.ok(logs.some(l => l.includes('All 1 skill(s) installed')))
  })

  it('creates a bundle interactively when no name is given', async () => {
    const copyPath = join(tempDir, 'bundle-interactive.mjs')
    let modSrc = readFileSync(join(__dirname, 'bundle.js'), 'utf-8')
    modSrc = modSrc.replace(
      `import { installCommand } from './install.js'`,
      `import { installCommand } from '${join(__dirname, 'install.js')}'`,
    )
    modSrc = modSrc.replace(
      `import { createInterface } from 'node:readline'`,
      [
        `const _bAns = ['my-test-bundle', '']`,
        `let _bIdx = 0`,
        `const createInterface = () => ({`,
        `  question: (q, cb) => cb(_bAns[_bIdx++]),`,
        `  close: () => {},`,
        `})`,
      ].join('\n'),
    )
    writeFileSync(copyPath, modSrc)

    const freshBundle = await import(copyPath)
    capture()
    await freshBundle.bundleCreateCommand()
    restoreLog()

    assert.ok(logs.some(l => l.includes('Created')))

    const createdPath = join(tempDir, 'my-test-bundle.json')
    assert.ok(readFileSync(createdPath, 'utf-8'))
    const content = JSON.parse(readFileSync(createdPath, 'utf-8'))
    assert.equal(content.name, 'my-test-bundle')
    assert.ok(Array.isArray(content.skills))
  })

  it('prompts for overwrite when file write fails', async () => {
    const copyPath = join(tempDir, 'bundle-overwrite.mjs')
    let modSrc = readFileSync(join(__dirname, 'bundle.js'), 'utf-8')
    modSrc = modSrc.replace(
      `import { installCommand } from './install.js'`,
      `import { installCommand } from '${join(__dirname, 'install.js')}'`,
    )
    modSrc = modSrc.replace(
      `import { createInterface } from 'node:readline'`,
      [
        `const createInterface = () => ({`,
        `  question: (q, cb) => cb('y'),`,
        `  close: () => {},`,
        `})`,
      ].join('\n'),
    )
    modSrc = modSrc.replace(
      `import { readFile, writeFile } from 'node:fs/promises'`,
      [
        `import { readFile } from 'node:fs/promises'`,
        `import { writeFile as _bOrigWf } from 'node:fs/promises'`,
        `let _bWfCalls = 0`,
        `const writeFile = async (...args) => {`,
        `  _bWfCalls++`,
        `  if (_bWfCalls === 1) throw new Error('x')`,
        `  return _bOrigWf(...args)`,
        `}`,
      ].join('\n'),
    )
    writeFileSync(copyPath, modSrc)

    const bundlePath = join(tempDir, 'test-overwrite-bundle.json')
    writeFileSync(bundlePath, '{}')

    const freshBundle = await import(copyPath)
    capture()
    await freshBundle.bundleCreateCommand('test-overwrite-bundle')
    restoreLog()

    assert.ok(logs.some(l => l.includes('Created')))

    const { existsSync } = await import('node:fs')
    assert.ok(existsSync(bundlePath))
    const content = JSON.parse(readFileSync(bundlePath, 'utf-8'))
    assert.equal(content.name, 'test-overwrite-bundle')
    assert.deepEqual(content.skills, ['owner/skill-name'])
  })
})
