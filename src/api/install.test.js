import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { apiInstallSkills, apiResolveSkills } from './install.js'

let tempDir, origHome, origCwd

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-install-test-'))
  origHome = process.env.HOME
  origCwd = process.cwd()
  process.env.HOME = tempDir
  process.chdir(tempDir)
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  writeFileSync(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
    version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [],
  }))
})

after(async () => {
  process.chdir(origCwd)
  process.env.HOME = origHome
  await rm(tempDir, { recursive: true, force: true })
})

function createSkill({ name, slug, description, content, mcpServers } = {}) {
  const mcpYaml = mcpServers ? `mcp_servers:\n${mcpServers.map(s => `  - name: ${s.name}\n    source: ${s.source}\n    description: "${s.description || ''}"`).join('\n')}` : ''
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
    const skillFile = createSkill({ name: 'test-skill', slug: 'test/test-skill' })
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
    const skillFile = createSkill({ name: 'frozen-test', slug: 'test/frozen-test' })
    await writeFile(join(skillDir, 'SKILL.md'), skillFile)

    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3,
      skills: {
        'test/frozen-test': { source: skillDir, installedAt: new Date().toISOString() },
      },
      dismissed: {},
      lastSelectedAgents: [],
    }))

    await assert.rejects(
      apiInstallSkills(skillDir, {
        cwd: tempDir,
        scope: { project: true },
        frozenLockfile: true,
      }),
      /already installed/
    )
  })

  it('installs MCP servers from skill', async () => {
    const { setExecSync } = await import('../utils/resolver.js')
    let execCalls = []
    setExecSync((cmd, opts) => {
      execCalls.push(cmd)
      return ''
    })

    const skillDir = join(tempDir, 'test-skills', 'mcp-test')
    await mkdir(skillDir, { recursive: true })
    const skillFile = createSkill({
      name: 'mcp-test',
      slug: 'test/mcp-test',
      mcpServers: [{ name: 'test-server', source: 'npm:mcp-test-pkg', description: 'test' }],
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

  it('rejects when no matching skills found', async () => {
    const skillDir = join(tempDir, 'test-skills', 'filter-test')
    await mkdir(skillDir, { recursive: true })
    const skillFile = createSkill({ name: 'filter-test', slug: 'test/filter-test' })
    await writeFile(join(skillDir, 'SKILL.md'), skillFile)

    await assert.rejects(
      apiInstallSkills(skillDir, {
        cwd: tempDir,
        scope: { project: true },
        skill: ['nonexistent'],
      }),
      /No matching skills found/
    )
  })

  it('with yes installs all skills from multi-skill source', async () => {
    const baseDir = join(tempDir, 'multi-test-source')
    await mkdir(baseDir, { recursive: true })
    const skillDir = join(baseDir, '.agents', 'skills', 'multi-test')
    await mkdir(skillDir, { recursive: true })
    const skillFile = createSkill({ name: 'multi-test', slug: 'test/multi-test' })
    await writeFile(join(skillDir, 'SKILL.md'), skillFile)

    const result = await apiInstallSkills(baseDir, {
      cwd: tempDir,
      scope: { project: true },
      yes: true,
    })

    assert.equal(result.results.length, 1)
  })
})