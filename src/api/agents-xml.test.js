import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync } from 'node:fs'
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { agentsXmlApi } from './agents-xml.js'

let homeDir, projectDir
let originalHome, originalCwd

async function writeLock(root, skills) {
  await mkdir(join(root, '.agents'), { recursive: true })
  await writeFile(
    join(root, '.agents', '.skill-lock.json'),
    JSON.stringify({
      version: 3,
      skills,
      dismissed: {},
      lastSelectedAgents: [],
    }),
  )
}

async function writeSkillDir(root, slug, name, description) {
  const dir = join(root, '.agents', 'skills', slug)
  await mkdir(dir, { recursive: true })
  await writeFile(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${description}\n---\n\nBody\n`,
  )
}

before(() => {
  homeDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-agents-xml-home-'))
  projectDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-agents-xml-proj-'))
  originalHome = process.env.HOME
  originalCwd = process.cwd()
  process.env.HOME = homeDir
  process.chdir(projectDir)
})

beforeEach(async () => {
  await rm(join(homeDir, '.agents'), { recursive: true, force: true })
  await rm(join(projectDir, '.agents'), { recursive: true, force: true })
  await rm(join(projectDir, 'AGENTS.md'), { force: true })
})

after(async () => {
  process.chdir(originalCwd)
  process.env.HOME = originalHome
  await rm(homeDir, { recursive: true, force: true })
  await rm(projectDir, { recursive: true, force: true })
})

describe('agentsXmlApi', () => {
  it('returns an empty xml with written false when no skills are installed', async () => {
    const result = await agentsXmlApi()
    assert.deepEqual(result, { xml: '', written: false })
  })

  it('does not create AGENTS.md when writeToFile is true but there are no skills', async () => {
    const result = await agentsXmlApi(true)
    assert.deepEqual(result, { xml: '', written: false })
    assert.ok(!existsSync(join(projectDir, 'AGENTS.md')))
  })

  it('builds xml for global and project skills with correct location', async () => {
    await writeLock(homeDir, {
      'acme/foo': {
        slug: 'acme/foo',
        agents: ['claude'],
        source: 'acme/foo',
        sourceType: 'github',
        installedAt: new Date().toISOString(),
      },
    })
    await writeSkillDir(homeDir, 'acme-foo', 'Foo Skill', 'Does foo things')

    await writeLock(projectDir, {
      'acme/bar': {
        slug: 'acme/bar',
        agents: ['project'],
        source: 'acme/bar',
        sourceType: 'github',
        installedAt: new Date().toISOString(),
      },
    })
    await writeSkillDir(projectDir, 'acme-bar', 'Bar Skill', 'Does bar things')

    const result = await agentsXmlApi()

    assert.equal(result.written, false)
    assert.match(result.xml, /<skills_system>/)
    assert.match(result.xml, /<available_skills>/)
    assert.match(
      result.xml,
      /<name>Foo Skill<\/name>\s*<description>Does foo things<\/description>\s*<location>global<\/location>/,
    )
    assert.match(
      result.xml,
      /<name>Bar Skill<\/name>\s*<description>Does bar things<\/description>\s*<location>project<\/location>/,
    )
  })

  it('derives location from the entry agents, not from the lockfile it came from', async () => {
    await writeLock(homeDir, {
      'acme/proj-in-global': {
        slug: 'acme/proj-in-global',
        agents: ['project'],
        source: 'acme/proj-in-global',
        sourceType: 'github',
        installedAt: new Date().toISOString(),
      },
    })
    await writeLock(projectDir, {
      'acme/global-in-project': {
        slug: 'acme/global-in-project',
        agents: ['claude'],
        source: 'acme/global-in-project',
        sourceType: 'github',
        installedAt: new Date().toISOString(),
      },
    })

    const result = await agentsXmlApi()

    assert.match(
      result.xml,
      /<name>acme\/proj-in-global<\/name>\s*<description><\/description>\s*<location>project<\/location>/,
    )
    assert.match(
      result.xml,
      /<name>acme\/global-in-project<\/name>\s*<description><\/description>\s*<location>global<\/location>/,
    )
  })

  it('lets the global lock entry win on a slug collision', async () => {
    await writeLock(homeDir, {
      'dup/skill': {
        slug: 'dup/skill',
        agents: ['claude'],
        source: 'dup/skill',
        sourceType: 'github',
        installedAt: new Date().toISOString(),
      },
    })
    await writeSkillDir(homeDir, 'dup-skill', 'Dup Skill', 'From global')

    await writeLock(projectDir, {
      'dup/skill': {
        slug: 'dup/skill',
        agents: ['project'],
        source: 'dup/skill',
        sourceType: 'github',
        installedAt: new Date().toISOString(),
      },
    })

    const result = await agentsXmlApi()

    const matches = result.xml.match(/<name>Dup Skill<\/name>/g) || []
    assert.equal(matches.length, 1)
    assert.match(result.xml, /<location>global<\/location>/)
  })

  it('writes AGENTS.md and replaces a stale skills_system block', async () => {
    await writeLock(homeDir, {
      'acme/foo': {
        slug: 'acme/foo',
        agents: ['claude'],
        source: 'acme/foo',
        sourceType: 'github',
        installedAt: new Date().toISOString(),
      },
    })
    await writeSkillDir(homeDir, 'acme-foo', 'Foo Skill', 'Does foo things')

    await writeFile(
      join(projectDir, 'AGENTS.md'),
      '# My Project\n\n<skills_system>\nSTALE\n</skills_system>\n\nMore notes.\n',
    )

    const result = await agentsXmlApi(true)

    assert.equal(result.written, true)
    assert.equal(result.path, join(projectDir, 'AGENTS.md'))

    const written = await readFile(join(projectDir, 'AGENTS.md'), 'utf-8')
    assert.ok(!written.includes('STALE'))
    assert.match(written, /# My Project/)
    assert.match(written, /More notes\./)
    assert.match(written, /<skills_system>/)
  })

  it('creates AGENTS.md when it does not already exist', async () => {
    await writeLock(homeDir, {
      'acme/foo': {
        slug: 'acme/foo',
        agents: ['claude'],
        source: 'acme/foo',
        sourceType: 'github',
        installedAt: new Date().toISOString(),
      },
    })
    await writeSkillDir(homeDir, 'acme-foo', 'Foo Skill', 'Does foo things')

    const result = await agentsXmlApi(true)

    assert.equal(result.written, true)
    const written = await readFile(join(projectDir, 'AGENTS.md'), 'utf-8')
    assert.equal(written, result.xml)
  })
})
