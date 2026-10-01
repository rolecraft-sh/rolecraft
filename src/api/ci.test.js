import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { apiCi } from './ci.js'

let tempDir
let homeDir
let workDir
let originalHome
let originalCwd

async function writeJson(path, data) {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, JSON.stringify(data))
}

function skillLock(skills) {
  return { version: 3, skills, dismissed: {}, lastSelectedAgents: [] }
}

async function writeGlobalLock(skills) {
  await writeJson(
    join(homeDir, '.agents', '.skill-lock.json'),
    skillLock(skills),
  )
}

async function writeProjectLock(dir, skills) {
  await writeJson(join(dir, '.agents', '.skill-lock.json'), skillLock(skills))
}

async function writeMcpLock(servers) {
  await writeJson(join(homeDir, '.agents', '.mcp-lock.json'), {
    version: 1,
    servers,
  })
}

async function writeLocalSkill(name) {
  const dir = join(tempDir, 'sources', name)
  await mkdir(dir, { recursive: true })
  await writeFile(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: Test skill ${name}\n---\n\n# ${name}\n`,
  )
  return dir
}

before(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-ci-test-'))
  homeDir = join(tempDir, 'home')
  workDir = join(tempDir, 'work')
  originalHome = process.env.HOME
  originalCwd = process.cwd()
  process.env.HOME = homeDir
})

beforeEach(async () => {
  await rm(homeDir, { recursive: true, force: true })
  await rm(workDir, { recursive: true, force: true })
  await mkdir(homeDir, { recursive: true })
  await mkdir(workDir, { recursive: true })
  process.chdir(workDir)
})

after(async () => {
  process.chdir(originalCwd)
  process.env.HOME = originalHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('api ci', () => {
  it('returns an empty passing result when nothing is locked', async () => {
    const result = await apiCi(workDir)

    assert.deepEqual(result, {
      installed: [],
      failed: [],
      mcpInstalled: [],
      mcpFailed: [],
      allPassed: true,
      total: 0,
      skillCount: 0,
      mcpCount: 0,
    })
  })

  it('installs a local skill from the lockfile into the project', async () => {
    const source = await writeLocalSkill('ci-skill')
    await writeProjectLock(workDir, {
      'ci-skill': { source, sourceType: 'local' },
    })

    const result = await apiCi(workDir)

    assert.equal(result.allPassed, true)
    assert.equal(result.skillCount, 1)
    assert.equal(result.installed.length, 1)
    assert.equal(result.installed[0].slug, 'ci-skill')
    assert.equal(result.installed[0].source, source)
    assert.ok(Array.isArray(result.installed[0].results))
    assert.ok(
      existsSync(join(workDir, '.agents', 'skills', 'ci-skill', 'SKILL.md')),
    )
  })

  it('reports entries without a source and failing sources', async () => {
    const missingDir = join(tempDir, 'sources', 'does-not-exist')
    await writeGlobalLock({
      'no-source': { sourceType: 'local' },
      broken: { source: missingDir, sourceType: 'local' },
    })

    const result = await apiCi(workDir)

    assert.equal(result.allPassed, false)
    assert.equal(result.total, 2)
    assert.deepEqual(result.installed, [])
    assert.deepEqual(result.failed[0], {
      slug: 'no-source',
      reason: 'missing source in lockfile',
    })
    assert.equal(result.failed[1].slug, 'broken')
    assert.equal(result.failed[1].source, missingDir)
    assert.equal(typeof result.failed[1].reason, 'string')
    assert.ok(result.failed[1].reason.length > 0)
  })

  it('merges project lock entries without overriding global ones', async () => {
    const globalSource = await writeLocalSkill('shared')
    const projectOnly = await writeLocalSkill('project-only')
    const projectDir = join(tempDir, 'project')
    await writeGlobalLock({
      shared: { source: globalSource, sourceType: 'local' },
    })
    await writeProjectLock(projectDir, {
      shared: {
        source: join(tempDir, 'sources', 'wrong'),
        sourceType: 'local',
      },
      'project-only': { source: projectOnly, sourceType: 'local' },
    })

    const result = await apiCi(projectDir)

    assert.equal(result.skillCount, 2)
    assert.equal(result.allPassed, true)
    assert.deepEqual(
      result.installed.map(({ slug, source }) => ({ slug, source })),
      [
        { slug: 'shared', source: globalSource },
        { slug: 'project-only', source: projectOnly },
      ],
    )
  })

  it('restores MCP servers from the MCP lockfile for each agent', async () => {
    await writeMcpLock({
      db: { source: 'npm:@test/db@1.0.0', agents: ['agents', 'cursor'] },
      nosrc: { agents: ['agents'] },
    })

    const result = await apiCi(workDir)

    assert.equal(result.mcpCount, 2)
    assert.equal(result.total, 2)
    assert.equal(result.allPassed, false)
    assert.deepEqual(result.mcpInstalled, [
      {
        name: 'db',
        source: 'npm:@test/db@1.0.0',
        agents: ['agents', 'cursor'],
      },
    ])
    assert.deepEqual(result.mcpFailed, [
      { name: 'nosrc', reason: 'missing source in lockfile' },
    ])
    for (const dir of ['.agents', '.cursor']) {
      const config = JSON.parse(
        readFileSync(join(homeDir, dir, 'mcp.json'), 'utf-8'),
      )
      assert.deepEqual(config.mcpServers.db, {
        command: 'npx',
        args: ['-y', '@test/db@1.0.0'],
      })
    }
  })

  it('keeps a GitHub skill from a project lock inside the project', async () => {
    const { execFileSync, spawnSync } = await import('node:child_process')
    const { setSpawnSync } = await import('../utils/resolver.js')
    const source = await writeLocalSkill('github-skill')
    const projectDir = join(tempDir, 'github-project')
    const remote = 'fixture-owner/skills'
    const cloneUrl = new URL(remote, 'https://github.com/')
    cloneUrl.pathname += '.git'

    await writeFile(
      join(source, 'SKILL.md'),
      [
        '---',
        'name: GitHub Fixture',
        'slug: github-fixture',
        'description: A local test fixture',
        '---',
        '',
        '# GitHub Fixture',
        '',
      ].join(String.fromCharCode(10)),
    )
    execFileSync('git', ['init', source], { stdio: 'ignore' })
    execFileSync('git', ['-C', source, 'add', 'SKILL.md'], {
      stdio: 'ignore',
    })
    execFileSync(
      'git',
      [
        '-C',
        source,
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@example.com',
        'commit',
        '-m',
        'fixture',
      ],
      { stdio: 'ignore' },
    )

    setSpawnSync((command, args, options) => {
      if (
        command === 'git' &&
        args[0] === 'clone' &&
        args[3] === cloneUrl.href
      ) {
        return spawnSync(
          command,
          ['clone', '--depth', '1', source, args[4]],
          options,
        )
      }
      return spawnSync(command, args, options)
    })

    try {
      await writeProjectLock(projectDir, {
        'github-fixture': { source: remote, sourceType: 'github' },
      })
      const result = await apiCi(projectDir)

      assert.equal(result.allPassed, true)
      assert.ok(
        existsSync(
          join(projectDir, '.agents', 'skills', 'github-fixture', 'SKILL.md'),
        ),
      )
      assert.equal(
        existsSync(
          join(homeDir, '.agents', 'skills', 'github-fixture', 'SKILL.md'),
        ),
        false,
      )
    } finally {
      setSpawnSync(spawnSync)
    }
  })

  it('installs project skills under the requested cwd even when process.cwd() differs', async () => {
    const source = await writeLocalSkill('cwd-mismatch-skill')
    await writeProjectLock(workDir, {
      'cwd-mismatch-skill': { source, sourceType: 'local' },
    })

    const decoyDir = join(tempDir, 'decoy')
    await mkdir(decoyDir, { recursive: true })
    process.chdir(decoyDir)

    const result = await apiCi(workDir)

    assert.equal(result.allPassed, true)
    assert.ok(
      existsSync(
        join(workDir, '.agents', 'skills', 'cwd-mismatch-skill', 'SKILL.md'),
      ),
      'skill should install under the requested project cwd, not process.cwd()',
    )
  })
})
