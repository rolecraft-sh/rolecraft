import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { apiInstallSkills } from './install.js'

let tempDir, origHome, origCwd

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-install-test-'))
  origHome = process.env.HOME
  origCwd = process.cwd()
  process.env.HOME = tempDir
  process.chdir(tempDir)
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  writeFileSync(
    join(tempDir, '.agents', '.skill-lock.json'),
    JSON.stringify({
      version: 3,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    }),
  )
})

after(async () => {
  process.chdir(origCwd)
  process.env.HOME = origHome
  await rm(tempDir, { recursive: true, force: true })
})

function createSkill({ name, slug, description, content, mcpServers } = {}) {
  const mcpYaml = mcpServers
    ? `mcp_servers:\n${mcpServers.map((s) => `  - name: ${s.name}\n    source: ${s.source}\n    description: "${s.description || ''}"`).join('\n')}`
    : ''
  const skillContent = content || '# Test Skill\nSome skill content here.'
  const skillFile = `---
name: ${name || 'test-skill'}
slug: ${slug || `test/${name || 'test-skill'}`}
owner: tester
${mcpYaml}description: >-
  ${description || 'A test skill for unit tests.'}
---

${skillContent}`
  return skillFile
}

describe('api install', () => {
  it('installs a local skill with dryRun', async () => {
    const skillDir = join(tempDir, 'test-skills', 'test-skill')
    await mkdir(skillDir, { recursive: true })
    const skillFile = createSkill({
      name: 'test-skill',
      slug: 'test/test-skill',
    })
    await writeFile(join(skillDir, 'SKILL.md'), skillFile)

    const result = await apiInstallSkills(skillDir, {
      cwd: tempDir,
      scope: { project: true },
      yes: true,
      dryRun: true,
    })

    assert.equal(result.dryRun, true)
    assert.equal(result.skills.length, 1)
    assert.equal(result.skills[0].name, 'test-skill')
    assert.deepEqual(result.skills[0].targets, ['project'])
  })

  it('installs a local skill with project scope', async () => {
    const skillDir = join(tempDir, 'test-skills', 'skill2')
    await mkdir(skillDir, { recursive: true })
    const skillFile = createSkill({ name: 'skill2', slug: 'test/skill2' })
    await writeFile(join(skillDir, 'SKILL.md'), skillFile)

    const result = await apiInstallSkills(skillDir, {
      cwd: tempDir,
      scope: { project: true },
      yes: true,
    })

    assert.equal(result.results.length, 1)
    assert.equal(result.results[0].name, 'skill2')
  })

  it('frozenLockfile prevents re-install with lockfile collision', async () => {
    const skillDir = join(tempDir, 'test-skills', 'frozen-test')
    await mkdir(skillDir, { recursive: true })
    const skillFile = createSkill({
      name: 'frozen-test',
      slug: 'test/frozen-test',
    })
    await writeFile(join(skillDir, 'SKILL.md'), skillFile)

    await writeFile(
      join(tempDir, '.agents', '.skill-lock.json'),
      JSON.stringify({
        version: 3,
        skills: {
          'test/frozen-test': {
            source: skillDir,
            installedAt: new Date().toISOString(),
          },
        },
        dismissed: {},
        lastSelectedAgents: [],
      }),
    )

    await assert.rejects(
      apiInstallSkills(skillDir, {
        cwd: tempDir,
        scope: { project: true },
        frozenLockfile: true,
      }),
      /already installed/,
    )
  })

  it('rejects slugs that normalize to an installed directory', async () => {
    const firstSkillDir = join(tempDir, 'test-skills', 'first-colliding-skill')
    await mkdir(firstSkillDir, { recursive: true })
    await writeFile(
      join(firstSkillDir, 'SKILL.md'),
      createSkill({
        name: 'foo-bar',
        slug: 'acme/foo-bar',
        content: 'first install',
      }),
    )

    await apiInstallSkills(firstSkillDir, {
      cwd: tempDir,
      scope: { project: true },
      yes: true,
    })

    const installedPath = join(
      tempDir,
      '.agents',
      'skills',
      'acme-foo-bar',
      'SKILL.md',
    )
    const installedBefore = readFileSync(installedPath, 'utf-8')
    const lockPath = join(tempDir, '.agents', '.skill-lock.json')
    const lockBefore = JSON.parse(readFileSync(lockPath, 'utf-8'))

    const secondSkillDir = join(
      tempDir,
      'test-skills',
      'second-colliding-skill',
    )
    await mkdir(secondSkillDir, { recursive: true })
    await writeFile(
      join(secondSkillDir, 'SKILL.md'),
      createSkill({
        name: 'foo-bar',
        slug: 'acme-foo-bar',
        content: 'second install',
      }),
    )

    await assert.rejects(
      apiInstallSkills(secondSkillDir, {
        cwd: tempDir,
        scope: { project: true },
        yes: true,
      }),
      (error) => {
        assert.equal(error.userCode, 'SLUG_COLLISION')
        assert.match(error.message, /acme\/foo-bar/)
        assert.match(error.message, /acme-foo-bar/)
        return true
      },
    )

    assert.equal(readFileSync(installedPath, 'utf-8'), installedBefore)
    assert.deepEqual(JSON.parse(readFileSync(lockPath, 'utf-8')), lockBefore)
  })

  it('installs MCP servers from skill', async () => {
    const { setExecSync } = await import('../utils/resolver.js')
    const execCalls = []
    setExecSync((cmd, _opts) => {
      execCalls.push(cmd)
      return ''
    })

    const skillDir = join(tempDir, 'test-skills', 'mcp-test')
    await mkdir(skillDir, { recursive: true })
    const skillFile = createSkill({
      name: 'mcp-test',
      slug: 'test/mcp-test',
      mcpServers: [
        {
          name: 'test-server',
          source: 'npm:mcp-test-pkg',
          description: 'test',
        },
      ],
    })
    await writeFile(join(skillDir, 'SKILL.md'), skillFile)

    const result = await apiInstallSkills(skillDir, {
      cwd: tempDir,
      scope: { project: true },
      yes: true,
    })

    assert.equal(result.results.length, 1)
    assert.equal(result.mcpResults.length, 1)
    assert.equal(result.mcpResults[0].server, 'test-server')
  })

  it('requires explicit approval for unscanned npm MCP servers', async () => {
    const skillDir = join(tempDir, 'test-skills', 'mcp-review')
    await mkdir(skillDir, { recursive: true })
    await writeFile(
      join(skillDir, 'SKILL.md'),
      createSkill({
        name: 'mcp-review',
        slug: 'test/mcp-review',
        mcpServers: [
          {
            name: 'unscanned-server',
            source: 'npm:unscanned-mcp-package',
          },
        ],
      }),
    )

    await assert.rejects(
      apiInstallSkills(skillDir, {
        cwd: tempDir,
        scope: { project: true },
      }),
      (error) => {
        assert.equal(error.userCode, 'MCP_SECURITY_REVIEW')
        assert.match(error.message, /needs security review/)
        return true
      },
    )
  })

  it('rejects when no matching skills found', async () => {
    const skillDir = join(tempDir, 'test-skills', 'filter-test')
    await mkdir(skillDir, { recursive: true })
    const skillFile = createSkill({
      name: 'filter-test',
      slug: 'test/filter-test',
    })
    await writeFile(join(skillDir, 'SKILL.md'), skillFile)

    await assert.rejects(
      apiInstallSkills(skillDir, {
        cwd: tempDir,
        scope: { project: true },
        skill: ['nonexistent'],
      }),
      /No matching skills found/,
    )
  })

  it('with yes installs all skills from multi-skill source', async () => {
    const baseDir = join(tempDir, 'multi-test-source')
    await mkdir(baseDir, { recursive: true })
    const skillDir = join(baseDir, '.agents', 'skills', 'multi-test')
    await mkdir(skillDir, { recursive: true })
    const skillFile = createSkill({
      name: 'multi-test',
      slug: 'test/multi-test',
    })
    await writeFile(join(skillDir, 'SKILL.md'), skillFile)

    const result = await apiInstallSkills(baseDir, {
      cwd: tempDir,
      scope: { project: true },
      yes: true,
    })

    assert.equal(result.results.length, 1)
  })

  it('installs a project skill under options.cwd even when process.cwd() differs', async () => {
    const projectDir = join(tempDir, 'cwd-project')
    await mkdir(projectDir, { recursive: true })
    const decoyDir = join(tempDir, 'cwd-decoy')
    await mkdir(decoyDir, { recursive: true })

    const skillDir = join(tempDir, 'test-skills', 'cwd-mismatch-skill')
    await mkdir(skillDir, { recursive: true })
    const skillFile = createSkill({
      name: 'cwd-mismatch-skill',
      slug: 'cwd-mismatch-skill',
    })
    await writeFile(join(skillDir, 'SKILL.md'), skillFile)

    const beforeTestCwd = process.cwd()
    process.chdir(decoyDir)
    try {
      await apiInstallSkills(skillDir, {
        cwd: projectDir,
        scope: { project: true },
        yes: true,
      })
    } finally {
      process.chdir(beforeTestCwd)
    }

    assert.ok(
      existsSync(
        join(projectDir, '.agents', 'skills', 'cwd-mismatch-skill', 'SKILL.md'),
      ),
      'skill should install under options.cwd, not process.cwd()',
    )
  })
})
