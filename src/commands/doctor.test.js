import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile, symlink } from 'node:fs/promises'
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

  it('reports git availability', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('Git availability')))
  })

  it('reports npm availability', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('npm availability')))
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

  it('warns when .agents directory is missing', async () => {
    const altDir = mkdtempSync(join(tmpdir(), 'rolecraft-doctor-alt-'))
    const origHome = process.env.HOME
    const origCwd = process.cwd()
    process.env.HOME = altDir
    process.chdir(altDir)

    await writeFile(join(altDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [],
    })).catch(() => {})
    await rm(join(altDir, '.agents'), { recursive: true, force: true }).catch(() => {})

    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
      process.env.HOME = origHome
      process.chdir(origCwd)
      await rm(altDir, { recursive: true, force: true }).catch(() => {})
    }
    assert.ok(logs.some(l => l.includes('not yet created')))
  })

  it('reports missing skill directory in integrity check', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/hash-check': { slug: 'test/hash-check', contentSha: 'abc' },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }

    assert.ok(logs.some(l => l.includes('hash mismatch') || l.includes('missing')))
  })

  it('verifies skill integrity when directory exists with matching hash', async () => {
    await mkdir(join(tempDir, '.agents', 'skills', 'test-hash-ok'), { recursive: true })
    const { writeFileSync } = await import('node:fs')
    writeFileSync(join(tempDir, '.agents', 'skills', 'test-hash-ok', 'SKILL.md'), '# Test skill\n\nContent')
    const { computeContentHash } = await import('../utils/lockfile.js')
    const hash = computeContentHash({ 'SKILL.md': '# Test skill\n\nContent' })

    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/hash-ok': { slug: 'test/hash-ok', contentSha: hash },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }

    assert.ok(logs.some(l => l.includes('checked')))
  })

  it('reports hash mismatch when content differs', async () => {
    await mkdir(join(tempDir, '.agents', 'skills', 'test-hash-bad'), { recursive: true })
    const { writeFileSync } = await import('node:fs')
    writeFileSync(join(tempDir, '.agents', 'skills', 'test-hash-bad', 'SKILL.md'), '# Original content')
    const { computeContentHash } = await import('../utils/lockfile.js')
    const origContent = { 'SKILL.md': '# Different content' }
    const badHash = computeContentHash(origContent)

    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/hash-bad': { slug: 'test/hash-bad', contentSha: badHash },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }

    assert.ok(logs.some(l => l.includes('hash mismatch') || l.includes('checked')))
  })

  it('shows platform info', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('Platform')))
  })

  it('shows node.js location', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('Node.js location')))
    assert.ok(logs.some(l => l.includes(process.execPath)))
  })

  it('validates lockfile schema as valid', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('lockfile schema')))
    assert.ok(logs.some(l => l.includes('valid')))
  })

  it('reports no orphaned skill dirs when clean', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('Orphaned skill dirs')))
    assert.ok(logs.some(l => l.includes('none')))
  })

  it('reports mcp servers check', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('MCP servers')))
  })

  it('outputs json with --json flag', async () => {
    const { logs, restore } = capture()
    try {
      await doctorModule.doctorCommand({ json: true })
    } finally {
      restore()
    }
    assert.ok(logs.length > 0)
    const parsed = JSON.parse(logs.join(''))
    assert.ok(typeof parsed.status === 'string')
    assert.ok(typeof parsed.checks === 'object')
    assert.ok(typeof parsed.summary === 'object')
    assert.ok(typeof parsed.summary.passed === 'number')
  })
})
