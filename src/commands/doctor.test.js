import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, originalCwd, originalHome, doctorModule

function capture() {
  const logs = []
  const origLog = console.log
  console.log = (...args) => { if (args.length) logs.push(String(args[0])) }
  return { logs, restore: () => { console.log = origLog } }
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-doctor-test-'))
  originalCwd = process.cwd()
  originalHome = process.env.HOME
  process.env.HOME = tempDir
  process.chdir(tempDir)

  await mkdir(join(tempDir, '.agents'), { recursive: true })
  await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
    version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [],
  }))

  doctorModule = await import('./doctor.js')
})

after(async () => {
  process.chdir(originalCwd)
  process.env.HOME = originalHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('doctor command', () => {
  it('shows health check header', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('System Health Check')))
  })

  it('reports node.js version', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('Node.js version')))
    assert.ok(logs.some(l => l.includes(`v${process.versions.node}`)))
  })

  it('reports rolecraft version', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('rolecraft version')))
  })

  it('reports home directory', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('Home directory')))
  })

  it('reports ~/.agents directory', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('.agents directory')))
  })

  it('shows warning when no agents detected', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('no supported agents detected')))
  })

  it('shows warning when no skills in lockfile', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('no global skills')))
  })

  it('shows summary at the end', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('Summary:')))
  })

  it('detects agent when its skill directory exists', async () => {
    await mkdir(join(tempDir, '.agents', 'skills'), { recursive: true })

    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('opencode')))
  })

  it('reports skill count for detected agent', async () => {
    await mkdir(join(tempDir, '.agents', 'skills'), { recursive: true })
    await mkdir(join(tempDir, '.agents', 'skills', 'test-skill'), { recursive: true })

    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('1 skill(s)')))
  })

  it('reports skills from global lockfile', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/my-skill': { slug: 'test/my-skill', contentSha: 'abc123' },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('1 skill(s) tracked')))
  })

  it('reports missing skill directories in integrity check', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/missing-skill': { slug: 'test/missing-skill', contentSha: 'abc123' },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('missing director')))
  })

  it('reports project lockfile skills', async () => {
    await mkdir(join(tempDir, '.agents'), { recursive: true })
    await mkdir(join(tempDir, '.agents', 'skills'), { recursive: true })
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [],
    }))

    const projectDir = join(tempDir, 'my-project')
    await mkdir(join(projectDir, '.agents'), { recursive: true })
    await writeFile(join(projectDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'project/my-skill': { slug: 'project/my-skill', contentSha: 'def456' },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const origCwd = process.cwd()
    process.chdir(projectDir)

    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
      process.chdir(origCwd)
    }
    assert.ok(logs.some(l => l.includes('Project lockfile')))
  })
})
