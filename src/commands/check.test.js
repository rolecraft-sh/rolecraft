import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, originalCwd, originalHome, checkModule, lockModule

function capture() {
  const logs = []
  const origLog = console.log
  console.log = (...args) => { if (args.length) logs.push(String(args[0])) }
  return { logs, restore: () => { console.log = origLog } }
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-check-test-'))
  originalCwd = process.cwd()
  originalHome = process.env.HOME
  process.env.HOME = tempDir
  process.chdir(tempDir)

  await mkdir(join(tempDir, '.agents'), { recursive: true })

  checkModule = await import('./check.js')
  lockModule = await import('../utils/lockfile.js')
})

after(async () => {
  process.chdir(originalCwd)
  process.env.HOME = originalHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('check command', () => {
  it('shows no skills message when no skills installed', async () => {
    const { logs, restore } = capture()
    try {
      await checkModule.checkCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('No installed skills found')))
  })

  it('reports skill with no source info', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/no-source': { slug: 'test/no-source' },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await checkModule.checkCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('no source info')))
  })

  it('reports skill as up to date when hash matches', async () => {
    const skillDir = join(tempDir, 'uptodate-skill')
    mkdirSync(skillDir, { recursive: true })
    const skillContent = '# slug: test/uptodate\nname: uptodate-skill\nSome content'
    writeFileSync(join(skillDir, 'SKILL.md'), skillContent)

    const { computeContentHash } = await import('../utils/lockfile.js')
    const fileContents = { 'SKILL.md': skillContent }
    const hash = computeContentHash(fileContents)

    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/uptodate': { slug: 'test/uptodate', source: skillDir, sourceType: 'local', contentSha: hash },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await checkModule.checkCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('up to date')))
  })

  it('reports update available when hash differs', async () => {
    const skillDir = join(tempDir, 'update-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/update\nname: update-skill\nNewer content')

    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/update': { slug: 'test/update', source: skillDir, sourceType: 'local', contentSha: 'oldhashthatdoesnotmatch' },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await checkModule.checkCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('update available')))
  })

  it('handles resolveSource failure', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/fail': { slug: 'test/fail', source: join(tempDir, 'nonexistent-dir'), sourceType: 'local', contentSha: 'somehash' },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await checkModule.checkCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('could not check')))
  })

  it('merges skills from global and project locks', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'global/skill': { slug: 'global/skill', source: join(tempDir, 'nonexistent-global'), contentSha: 'h1' },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const projectDir = join(tempDir, 'my-project')
    await mkdir(join(projectDir, '.agents'), { recursive: true })
    await writeFile(join(projectDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'project/skill': { slug: 'project/skill', source: join(tempDir, 'nonexistent-project'), contentSha: 'h2' },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const origCwd = process.cwd()
    process.chdir(projectDir)
    const { logs, restore } = capture()
    try {
      await checkModule.checkCommand()
    } finally {
      restore()
      process.chdir(origCwd)
    }
    assert.ok(logs.some(l => l.includes('could not check')))
    assert.equal(logs.filter(l => l.includes('could not check')).length, 2)
  })
})
