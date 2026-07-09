import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, watchModule, origHome, origCwd

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-watch-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir
  origCwd = process.cwd
  process.cwd = () => tempDir

  await mkdir(join(tempDir, '.agents', 'skills', 'local-skill'), { recursive: true })
  writeFileSync(join(tempDir, '.agents', 'skills', 'local-skill', 'SKILL.md'), '---\nname: Local Skill\nslug: local-skill\n---\nContent')

  const lockPath = join(tempDir, '.agents', '.skill-lock.json')
  await writeFile(lockPath, JSON.stringify({
    version: 3,
    skills: {
      'local-skill': {
        name: 'Local Skill',
        source: join(tempDir, 'source-local'),
        sourceType: 'local',
        installedAt: new Date().toISOString(),
        agents: ['opencode'],
      },
      'remote-skill': {
        name: 'Remote Skill',
        source: 'someuser/some-repo',
        sourceType: 'github',
        installedAt: new Date().toISOString(),
        agents: ['opencode'],
      },
    },
    dismissed: {},
    lastSelectedAgents: [],
  }))

  const sourceDir = join(tempDir, 'source-local')
  mkdirSync(sourceDir, { recursive: true })
  writeFileSync(join(sourceDir, 'SKILL.md'), '---\nname: Local Skill\nslug: local-skill\n---\nContent')

  watchModule = await import('./watch.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
  process.env.HOME = origHome
  process.cwd = origCwd
})

describe('watch command', () => {
  it('shows message when no skills installed', async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'rolecraft-watch-empty-'))
    const origHome2 = process.env.HOME
    process.env.HOME = emptyDir

    const logs = []
    const origLog = console.log
    console.log = (...args) => { if (args.length) logs.push(String(args[0])) }

    const { watchers } = await watchModule.watchCommand(undefined, emptyDir)
    for (const w of watchers) w.close()

    assert.ok(logs.some(l => l.includes('No skills installed')))
    console.log = origLog
    process.env.HOME = origHome2
    await rm(emptyDir, { recursive: true, force: true })
  })

  it('shows error when specific slug not found', async () => {
    const logs = []
    const errors = []
    const origLog = console.log
    const origError = console.error
    console.log = (...args) => { if (args.length) logs.push(String(args[0])) }
    console.error = (...args) => { if (args.length) errors.push(String(args[0])) }

    const { watchers } = await watchModule.watchCommand('nonexistent', tempDir)
    for (const w of watchers) w.close()

    assert.ok(logs.some(l => l.includes('not found')) || errors.some(e => e.includes('not found')))
    console.log = origLog
    console.error = origError
  })

  it('shows message when no local skills available', async () => {
    const remoteOnlyDir = mkdtempSync(join(tmpdir(), 'rolecraft-watch-remote-'))
    const origHome3 = process.env.HOME
    process.env.HOME = remoteOnlyDir

    await mkdir(join(remoteOnlyDir, '.agents', 'skills', 'gh-skill'), { recursive: true })
    writeFileSync(join(remoteOnlyDir, '.agents', 'skills', 'gh-skill', 'SKILL.md'), '---\nname: GH Skill\nslug: gh-skill\n---\nContent')
    await writeFile(join(remoteOnlyDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: {
        'gh-skill': {
          source: 'user/repo',
          sourceType: 'github',
          agents: ['opencode'],
          installedAt: new Date().toISOString(),
        },
      },
      dismissed: {},
      lastSelectedAgents: [],
    }))

    const logs = []
    const origLog = console.log
    console.log = (...args) => { if (args.length) logs.push(String(args[0])) }

    const { watchers } = await watchModule.watchCommand(undefined, remoteOnlyDir)
    for (const w of watchers) w.close()

    assert.ok(logs.some(l => l.includes('No local skills')))
    console.log = origLog
    process.env.HOME = origHome3
    await rm(remoteOnlyDir, { recursive: true, force: true })
  })

  it('starts watching local skills', async () => {
    const logs = []
    const origLog = console.log
    console.log = (...args) => { if (args.length) logs.push(String(args[0])) }

    const { watchers } = await watchModule.watchCommand(undefined, tempDir)
    for (const w of watchers) w.close()

    assert.ok(logs.some(l => l.includes('local-skill')))
    assert.ok(logs.some(l => l.includes('watching')))
    console.log = origLog
  })

  it('starts watching specific skill by slug', async () => {
    const logs = []
    const origLog = console.log
    console.log = (...args) => { if (args.length) logs.push(String(args[0])) }

    const { watchers } = await watchModule.watchCommand('local-skill', tempDir)
    for (const w of watchers) w.close()

    assert.ok(logs.some(l => l.includes('local-skill')))
    assert.ok(logs.some(l => l.includes('watching')))
    console.log = origLog
  })

  it('skips non-local source when specific slug is remote', async () => {
    const logs = []
    const origLog = console.log
    console.log = (...args) => { if (args.length) logs.push(String(args[0])) }

    const { watchers } = await watchModule.watchCommand('remote-skill', tempDir)
    for (const w of watchers) w.close()

    assert.ok(logs.some(l => l.includes('Skipping')))
    assert.ok(logs.some(l => l.includes('remote')))
    console.log = origLog
  })

  it('handles file system watcher error gracefully', async () => {
    const errors = []
    const origError = console.error
    const origLog = console.log
    console.error = (...args) => { if (args.length) errors.push(String(args[0])) }
    console.log = () => {}

    const badDir = mkdtempSync(join(tmpdir(), 'rolecraft-watch-bad-'))
    await mkdir(join(badDir, '.agents'), { recursive: true })
    await writeFile(join(badDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: {
        'bad-skill': {
          name: 'Bad Skill',
          source: '/nonexistent/path',
          sourceType: 'local',
          installedAt: new Date().toISOString(),
          agents: ['opencode'],
        },
      },
      dismissed: {},
      lastSelectedAgents: [],
    }))

    const { watchers } = await watchModule.watchCommand(undefined, badDir)
    for (const w of watchers) w.close()

    assert.ok(errors.some(e => e.includes('cannot watch')), `Expected 'cannot watch' in: ${errors.join('; ')}`)
    console.error = origError
    console.log = origLog
    process.env.HOME = tempDir
    await rm(badDir, { recursive: true, force: true })
  })

  it('reinstalls skill on file change and logs sync', async () => {
    const logs = []
    const origLog = console.log
    console.log = (...args) => { if (args.length) logs.push(String(args[0])) }

    const { watchers } = await watchModule.watchCommand('local-skill', tempDir)

    // Trigger a file change in the watched source directory
    await writeFile(join(tempDir, 'source-local', 'TEST.md'), 'change 1')
    await writeFile(join(tempDir, 'source-local', 'TEST.md'), 'change 2')

    // Wait for debounce (300ms) plus buffer
    await new Promise(r => setTimeout(r, 600))

    for (const w of watchers) w.close()

    assert.ok(logs.some(l => l.includes('syncing')), `Expected 'syncing' in logs: ${logs.join('; ')}`)
    assert.ok(logs.some(l => l.includes('synced')), `Expected 'synced' in logs: ${logs.join('; ')}`)
    console.log = origLog
  })
})
