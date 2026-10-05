import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { apiCi } from './ci.js'
import { resolveSource } from '../utils/resolver.js'

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

async function writeLocalSkill(name, body = '') {
  const dir = join(tempDir, 'sources', name)
  await mkdir(dir, { recursive: true })
  await writeFile(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: Test skill ${name}\n---\n\n# ${name}\n${body}`,
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

  // #407: `ci` hardcoded `targets: ['agents']` and never read the lockfile's
  // `agents`, so a skill recorded for one agent landed in the directory twelve
  // agents share, leaving the lockfile's record disagreeing with the disk.
  it('installs into the directories the lockfile recorded', async () => {
    const source = await writeLocalSkill('claude-only')
    await writeGlobalLock({
      'claude-only': { source, sourceType: 'local', agents: ['claude-code'] },
    })

    const result = await apiCi(workDir)

    assert.equal(result.allPassed, true)
    assert.equal(
      existsSync(join(homeDir, '.agents', 'skills', 'claude-only', 'SKILL.md')),
      false,
      'must not write to the directory 12 agents share',
    )
    assert.ok(
      existsSync(join(homeDir, '.claude', 'skills', 'claude-only', 'SKILL.md')),
    )
  })

  it('installs once per directory when the lockfile records several agents', async () => {
    const source = await writeLocalSkill('two-agents')
    await writeGlobalLock({
      'two-agents': {
        source,
        sourceType: 'local',
        agents: ['claude-code', 'cursor'],
      },
    })

    const result = await apiCi(workDir)

    assert.equal(result.allPassed, true)
    assert.equal(result.installed.length, 1)
    assert.equal(result.installed[0].results.length, 2)
  })

  it('keeps a project-scoped entry in the project lockfile', async () => {
    const source = await writeLocalSkill('project-scoped')
    const projectDir = join(tempDir, 'project-scoped-dir')
    await writeProjectLock(projectDir, {
      'project-scoped': {
        source,
        sourceType: 'local',
        agents: ['project'],
      },
    })

    await apiCi(projectDir)

    // The global lock must not be created or touched at all.
    assert.equal(
      existsSync(join(homeDir, '.agents', '.skill-lock.json')),
      false,
      'a project-scoped entry must not create a global lock entry',
    )
    assert.ok(
      existsSync(
        join(projectDir, '.agents', 'skills', 'project-scoped', 'SKILL.md'),
      ),
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

  // #402: `ci` is documented as a frozen lockfile install but never compared
  // `contentSha`, so a lockfile entry could name one source and install another.
  // The lockfile is repo content in a cloned repo, so that is the attack.
  it('refuses to install when the resolved content hash differs', async () => {
    const source = await writeLocalSkill('drifted')
    await writeGlobalLock({
      drifted: { source, sourceType: 'local', contentSha: 'not-the-real-hash' },
    })

    const result = await apiCi(workDir)

    assert.equal(result.allPassed, false)
    assert.deepEqual(result.installed, [])
    assert.match(result.failed[0].reason, /content hash mismatch/)
  })

  it('installs when the recorded content hash matches', async () => {
    const source = await writeLocalSkill('intact')
    const { contentSha } = await resolveSource(source)
    await writeGlobalLock({
      intact: { source, sourceType: 'local', contentSha },
    })

    const result = await apiCi(workDir)

    assert.equal(result.allPassed, true)
    assert.equal(result.installed.length, 1)
  })

  it('does not report a review verdict as a pass', async () => {
    const source = await writeLocalSkill('flagged', 'Read ~/.ssh/id_rsa\n')
    await writeGlobalLock({
      flagged: { source, sourceType: 'local' },
    })

    const result = await apiCi(workDir)

    assert.equal(
      result.allPassed,
      false,
      'a review verdict must not read as success',
    )
    assert.match(result.failed[0].reason, /security review/)
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

  it('refuses to restore an MCP source the scanner could not read', async () => {
    // `ci` has no --yes override, so a source that resolves to a runner command
    // with nothing to inspect (`local`, `uvx:`, `go:`, …) is refused rather than
    // restored on the strength of a 100/SAFE score it never earned (#401).
    await writeMcpLock({
      db: { source: './db.js', agents: ['agents', 'cursor'] },
      nosrc: { agents: ['agents'] },
    })

    const result = await apiCi(workDir)

    assert.equal(result.mcpCount, 2)
    assert.equal(result.allPassed, false)
    assert.deepEqual(result.mcpInstalled, [])
    assert.equal(result.mcpFailed.length, 2)
    assert.ok(
      result.mcpFailed[0].reason.includes(
        'unscanned sources cannot be restored',
      ),
    )
    assert.deepEqual(result.mcpFailed[1], {
      name: 'nosrc',
      reason: 'missing source in lockfile',
    })
    // Nothing was written to either agent's config.
    for (const dir of ['.agents', '.cursor']) {
      const configPath = join(homeDir, dir, 'mcp.json')
      assert.equal(existsSync(configPath), false)
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

  it('restores MCP servers from the MCP lockfile for each agent', async () => {
    // A `gh:` source is a real fetch, so the clone produces contents the scanner
    // can read and the restore path is reachable without an approval override.
    const { execFileSync, spawnSync } = await import('node:child_process')
    const { setSpawnSync: setMcpSpawnSync } = await import('../utils/mcp.js')
    const remote = 'modelcontextprotocol/db-server'
    const cloneUrl = new URL(remote, 'https://github.com/')
    cloneUrl.pathname += '.git'

    const repo = join(tempDir, 'mcp-repo')
    await mkdir(repo, { recursive: true })
    await writeFile(
      join(repo, 'package.json'),
      JSON.stringify({ name: 'db-server', main: 'index.js' }),
    )
    await writeFile(join(repo, 'index.js'), 'export default {}\n')
    execFileSync('git', ['init', repo], { stdio: 'ignore' })
    execFileSync('git', ['-C', repo, 'add', '.'], { stdio: 'ignore' })
    execFileSync(
      'git',
      [
        '-C',
        repo,
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

    setMcpSpawnSync((command, args, options) => {
      if (
        command === 'git' &&
        args[0] === 'clone' &&
        args[3] === cloneUrl.href
      ) {
        return spawnSync(
          command,
          ['clone', '--depth', '1', repo, args[4]],
          options,
        )
      }
      return spawnSync(command, args, options)
    })

    try {
      await writeMcpLock({
        db: { source: `gh:${remote}`, agents: ['agents', 'cursor'] },
        nosrc: { agents: ['agents'] },
      })

      const result = await apiCi(workDir)

      assert.equal(result.mcpCount, 2)
      assert.equal(result.total, 2)
      assert.deepEqual(result.mcpInstalled, [
        { name: 'db', source: `gh:${remote}`, agents: ['agents', 'cursor'] },
      ])
      assert.deepEqual(result.mcpFailed, [
        { name: 'nosrc', reason: 'missing source in lockfile' },
      ])
      for (const dir of ['.agents', '.cursor']) {
        const config = JSON.parse(
          readFileSync(join(homeDir, dir, 'mcp.json'), 'utf-8'),
        )
        assert.equal(config.mcpServers.db.command, 'node')
      }
    } finally {
      setMcpSpawnSync(spawnSync)
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

it('does not restore unscanned npm entries or mutate agent config or locks', async () => {
  await writeMcpLock({
    db: { source: 'npm:@test/db@1.0.0', agents: ['agents', 'cursor'] },
  })
  const lockPath = join(homeDir, '.agents', '.mcp-lock.json')
  const before = readFileSync(lockPath, 'utf-8')
  const result = await apiCi(workDir)
  assert.equal(result.allPassed, false)
  assert.deepEqual(result.mcpInstalled, [])
  assert.equal(result.mcpFailed.length, 1)
  assert.match(result.mcpFailed[0].reason, /needs security review/)
  for (const dir of ['.agents', '.cursor']) {
    assert.equal(existsSync(join(homeDir, dir, 'mcp.json')), false)
  }
  assert.equal(readFileSync(lockPath, 'utf-8'), before)
})
