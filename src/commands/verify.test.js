import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, originalCwd, originalHome, verifyModule, lockModule

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

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-verify-test-'))
  originalCwd = process.cwd()
  originalHome = process.env.HOME
  process.env.HOME = tempDir
  process.chdir(tempDir)
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  await mkdir(join(tempDir, '.agents', 'skills'), { recursive: true })
  await writeFile(
    join(tempDir, '.agents', '.skill-lock.json'),
    JSON.stringify({
      version: 3,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    }),
  )
  verifyModule = await import('./verify.js')
  lockModule = await import('../utils/lockfile.js')
})

after(async () => {
  process.chdir(originalCwd)
  process.env.HOME = originalHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('verify command', () => {
  it('shows no skills message when lockfile is empty', async () => {
    const { logs, restore } = capture('log')
    await verifyModule.verifyCommand()
    restore()
    assert.ok(logs.some((l) => l.includes('No skills in lockfile')))
  })

  it('verifies skill with matching hash', async () => {
    const slug = 'test/verify-ok'
    const files = {
      'SKILL.md': '# slug: test/verify-ok\nname: verify-ok\nContent',
    }
    const hash = lockModule.computeContentHash(files)

    const skillDir = join(
      tempDir,
      '.agents',
      'skills',
      slug.replace(/\//g, '-'),
    )
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), files['SKILL.md'])

    await lockModule.addSkillToLock(slug, {
      slug,
      contentSha: hash,
      source: 'local',
      sourceType: 'local',
    })

    const { logs, restore } = capture('log')
    await verifyModule.verifyCommand()
    restore()
    assert.ok(logs.some((l) => l.includes('verified')))
  })

  it('detects hash mismatch', async () => {
    const slug = 'test/verify-bad'
    const skillDir = join(
      tempDir,
      '.agents',
      'skills',
      slug.replace(/\//g, '-'),
    )
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      '# slug: test/verify-bad\nname: verify-bad\nContent',
    )

    await lockModule.addSkillToLock(slug, {
      slug,
      contentSha: 'badhash',
      source: 'local',
      sourceType: 'local',
    })

    const { logs: errors, restore } = capture('error')
    await verifyModule.verifyCommand()
    restore()
    assert.ok(errors.some((l) => l.includes('hash mismatch')))
  })

  it('detects missing skill directory', async () => {
    const slug = 'test/verify-missing'
    await lockModule.addSkillToLock(slug, {
      slug,
      contentSha: 'hash',
      source: 'local',
      sourceType: 'local',
    })

    const { logs: errors, restore } = capture('error')
    await verifyModule.verifyCommand()
    restore()
    assert.ok(errors.some((l) => l.includes('not found')))
  })

  it('reports which file changed on hash mismatch with fileHashes', async () => {
    const slug = 'test/verify-modified'
    const normSlug = slug.replace(/\//g, '-')
    const skillDir = join(tempDir, '.agents', 'skills', normSlug)
    mkdirSync(skillDir, { recursive: true })

    writeFileSync(join(skillDir, 'SKILL.md'), '# Original content')
    writeFileSync(join(skillDir, 'unchanged.txt'), 'Same content')

    const files = {
      'SKILL.md': '# Original content',
      'unchanged.txt': 'Same content',
    }
    const fileHashes = {}
    for (const [name, content] of Object.entries(files)) {
      const { createHash } = await import('node:crypto')
      fileHashes[name] = createHash('sha256').update(content).digest('hex')
    }
    const hash = lockModule.computeContentHash(files)

    await lockModule.addSkillToLock(slug, {
      slug,
      contentSha: hash,
      fileHashes,
      source: 'local',
      sourceType: 'local',
      agents: ['opencode'],
    })

    writeFileSync(join(skillDir, 'SKILL.md'), '# Modified content!')

    const { logs: errors, restore } = capture('error')
    await verifyModule.verifyCommand()
    restore()
    assert.ok(errors.some((l) => l.includes('modified: SKILL.md')))
    assert.ok(!errors.some((l) => l.includes('unchanged.txt')))
  })

  it('reports missing file when fileHash entry not found on disk', async () => {
    const slug = 'test/verify-missing-file'
    const normSlug = slug.replace(/\//g, '-')
    const skillDir = join(tempDir, '.agents', 'skills', normSlug)
    mkdirSync(skillDir, { recursive: true })

    writeFileSync(join(skillDir, 'SKILL.md'), '# Some content')

    const files = { 'SKILL.md': '# Some content' }
    const fileHashes = {
      'SKILL.md': (await import('node:crypto'))
        .createHash('sha256')
        .update('# Some content')
        .digest('hex'),
      'missing.txt': (await import('node:crypto'))
        .createHash('sha256')
        .update('ghost')
        .digest('hex'),
    }
    const hash = lockModule.computeContentHash(files)

    await lockModule.addSkillToLock(slug, {
      slug,
      contentSha: hash,
      fileHashes,
      source: 'local',
      sourceType: 'local',
      agents: ['opencode'],
    })

    writeFileSync(
      join(skillDir, 'SKILL.md'),
      '# Modified content (triggers hash mismatch)',
    )

    const { logs: errors, restore } = capture('error')
    await verifyModule.verifyCommand()
    restore()
    assert.ok(errors.some((l) => l.includes('missing.txt')))
  })

  it('reports missing source in frozen mode', async () => {
    const slug = 'test/frozen-missing'
    await lockModule.addSkillToLock(slug, {
      slug,
      contentSha: 'hash',
      sourceType: 'local',
    })

    const origExit = process.exit
    process.exit = () => {
      throw new Error('exit')
    }
    const { logs: errors, restore } = capture('error')
    try {
      await verifyModule.verifyCommand(true)
    } catch {}
    process.exit = origExit
    restore()
    assert.ok(errors.some((l) => l.includes('missing source')))
  })
})
