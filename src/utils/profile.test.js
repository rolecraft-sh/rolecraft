import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, constants } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, profileModule, origHome

const VALID_PROFILE = {
  name: 'test-profile',
  version: 1,
  description: 'A test profile',
  agents: {
    opencode: {
      config: { model: 'gpt-4' },
      instructions: [{ file: 'AGENTS.md', contentSha: 'abc' }],
      mcpServers: { github: { command: 'npx', args: ['-y', '@test/pkg'] } },
      skills: ['owner/repo-a', 'owner/repo-b'],
    },
    cursor: {
      mcpServers: {},
      skills: [],
    },
  },
  projectOverrides: {
    '/projects/my-app': {
      opencode: { model: 'gpt-4o' },
    },
  },
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-profile-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir
  profileModule = await import('./profile.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
  process.env.HOME = origHome
})

describe('profile utils', () => {
  describe('isValidProfileName', () => {
    it('accepts simple names', () => {
      assert.ok(profileModule.isValidProfileName('frontend-dev'))
      assert.ok(profileModule.isValidProfileName('data_science'))
      assert.ok(profileModule.isValidProfileName('my.config.v1'))
      assert.ok(profileModule.isValidProfileName('a'))
    })

    it('rejects invalid names', () => {
      assert.equal(profileModule.isValidProfileName(''), false)
      assert.equal(profileModule.isValidProfileName(null), false)
      assert.equal(profileModule.isValidProfileName(undefined), false)
      assert.equal(profileModule.isValidProfileName(' space-start'), false)
      assert.equal(profileModule.isValidProfileName('has space'), false)
      assert.equal(profileModule.isValidProfileName('../evil'), false)
      assert.equal(profileModule.isValidProfileName(''), false)
    })
  })

  describe('getProfilesDir', () => {
    it('returns path inside homedir', () => {
      assert.equal(profileModule.getProfilesDir(), join(tempDir, '.agents', 'profiles'))
    })
  })

  describe('profilePath', () => {
    it('returns correct path for valid name', () => {
      const p = profileModule.profilePath('frontend-dev')
      assert.equal(p, join(tempDir, '.agents', 'profiles', 'frontend-dev.json'))
    })

    it('throws for invalid name', () => {
      assert.throws(() => profileModule.profilePath('../bad'), /Invalid profile name/)
    })
  })

  describe('validateProfile', () => {
    it('accepts a valid profile', () => {
      const result = profileModule.validateProfile(VALID_PROFILE)
      assert.ok(result.valid)
      assert.equal(result.errors.length, 0)
    })

    it('rejects null input', () => {
      const result = profileModule.validateProfile(null)
      assert.equal(result.valid, false)
    })

    it('rejects empty object', () => {
      const result = profileModule.validateProfile({})
      assert.equal(result.valid, false)
    })

    it('rejects missing name', () => {
      const result = profileModule.validateProfile({ agents: {} })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some(e => e.includes('name')))
    })

    it('rejects non-object agents', () => {
      const result = profileModule.validateProfile({ name: 'test', agents: 'bad' })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some(e => e.includes('agents')))
    })

    it('rejects array agents', () => {
      const result = profileModule.validateProfile({ name: 'test', agents: [] })
      assert.equal(result.valid, false)
    })

    it('rejects non-array skills', () => {
      const result = profileModule.validateProfile({
        name: 'test',
        agents: { opencode: { skills: 'not-array' } },
      })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some(e => e.includes('skills')))
    })

    it('rejects non-object mcpServers', () => {
      const result = profileModule.validateProfile({
        name: 'test',
        agents: { opencode: { mcpServers: 'bad' } },
      })
      assert.equal(result.valid, false)
    })

    it('rejects non-array instructions', () => {
      const result = profileModule.validateProfile({
        name: 'test',
        agents: { opencode: { instructions: 'bad' } },
      })
      assert.equal(result.valid, false)
    })

    it('rejects non-object projectOverrides', () => {
      const result = profileModule.validateProfile({
        name: 'test',
        agents: {},
        projectOverrides: 'bad',
      })
      assert.equal(result.valid, false)
    })
  })

  describe('writeProfile and readProfile', () => {
    it('writes and reads a profile', async () => {
      const written = await profileModule.writeProfile(VALID_PROFILE)
      assert.equal(written.name, 'test-profile')
      assert.equal(written.version, 1)
      assert.ok(written.createdAt)
      assert.ok(written.updatedAt)

      const read = await profileModule.readProfile('test-profile')
      assert.equal(read.name, 'test-profile')
      assert.equal(read.agents.opencode.config.model, 'gpt-4')
      assert.deepEqual(read.agents.opencode.skills, ['owner/repo-a', 'owner/repo-b'])
    })

    it('sets defaults for createdAt and version', async () => {
      const minimal = { name: 'minimal', agents: {} }
      const written = await profileModule.writeProfile(minimal)
      assert.equal(written.version, profileModule.PROFILE_SCHEMA_VERSION)
      assert.ok(written.createdAt)
      assert.ok(written.updatedAt)
    })

    it('readProfile returns null for missing profile', async () => {
      const result = await profileModule.readProfile('nonexistent')
      assert.equal(result, null)
    })

    it('throws on invalid profile data', async () => {
      await assert.rejects(
        () => profileModule.writeProfile({ name: '' }),
        /Invalid profile/
      )
    })
  })

  describe('listProfiles', () => {
    it('returns empty array when no profiles exist', async () => {
      // isolate: use a clean subdirectory
      const subDir = join(tempDir, 'list-empty-' + Date.now())
      process.env.HOME = subDir
      const freshModule = await import('./profile.js')
      const list = await freshModule.listProfiles()
      assert.deepEqual(list, [])
      process.env.HOME = tempDir
    })

    it('lists created profiles', async () => {
      const subDir = join(tempDir, 'list-with-' + Date.now())
      process.env.HOME = subDir
      const freshModule = await import('./profile.js')
      await freshModule.writeProfile({ name: 'profile-a', agents: { opencode: {} } })
      await freshModule.writeProfile({ name: 'profile-b', agents: { opencode: {}, cursor: {} } })

      const list = await freshModule.listProfiles()
      assert.equal(list.length, 2)

      const names = list.map(p => p.name).sort()
      assert.deepEqual(names, ['profile-a', 'profile-b'])

      const a = list.find(p => p.name === 'profile-a')
      assert.equal(a.agentCount, 1)
      assert.ok(a.updatedAt)

      const b = list.find(p => p.name === 'profile-b')
      assert.equal(b.agentCount, 2)
      process.env.HOME = tempDir
    })
  })

  describe('deleteProfile', () => {
    it('deletes an existing profile', async () => {
      await profileModule.writeProfile({ name: 'to-delete', agents: {} })

      let read = await profileModule.readProfile('to-delete')
      assert.ok(read)

      const deleted = await profileModule.deleteProfile('to-delete')
      assert.equal(deleted, true)

      read = await profileModule.readProfile('to-delete')
      assert.equal(read, null)
    })

    it('returns false for missing profile', async () => {
      const result = await profileModule.deleteProfile('does-not-exist')
      assert.equal(result, false)
    })
  })

  describe('ensureProfileDir', () => {
    it('creates the profiles directory', async () => {
      const dir = profileModule.getProfilesDir()
      await rm(dir, { recursive: true, force: true })
      assert.equal(existsSync(dir), false)

      await profileModule.ensureProfileDir()
      assert.equal(existsSync(dir), true)
    })
  })
})

describe('profile capture', () => {
  let captureDir, captureModule, origHome, origCwd

  before(async () => {
    captureDir = mkdtempSync(join(tmpdir(), 'rolecraft-capture-test-'))
    origHome = process.env.HOME
    origCwd = process.cwd
    process.env.HOME = captureDir
    process.cwd = () => captureDir
    await mkdir(join(captureDir, '.agents', 'profiles'), { recursive: true })
    captureModule = await import('./profile.js')
  })

  after(async () => {
    process.cwd = origCwd
    await rm(captureDir, { recursive: true, force: true })
    process.env.HOME = origHome
  })

  describe('detectAgents', () => {
    it('returns empty when no agents installed', async () => {
      const agents = await captureModule.detectAgents()
      assert.ok(Array.isArray(agents))
      assert.equal(agents.length, 0)
    })
  })

  describe('captureAgentConfig', () => {
    it('returns null when agent has no known config paths', async () => {
      const result = await captureModule.captureAgentConfig('nonexistent-agent')
      assert.equal(result, null)
    })

    it('returns null when config file does not exist', async () => {
      const result = await captureModule.captureAgentConfig('opencode')
      assert.equal(result, null)
    })

    it('captures config when file exists', async () => {
      const configPath = join(captureDir, '.opencode.json')
      await writeFile(configPath, JSON.stringify({ model: 'gpt-4', permission: { read: 'allow' } }))

      const result = await captureModule.captureAgentConfig('opencode')
      assert.ok(result)
      assert.ok(result.global)
      assert.equal(result.global.model, 'gpt-4')
      assert.equal(result.global.permission.read, 'allow')
    })

    it('captures both global and project configs', async () => {
      const globalPath = join(captureDir, '.opencode.json')
      const projectPath = join(process.cwd(), 'opencode.json')
      await writeFile(globalPath, JSON.stringify({ model: 'gpt-4' }))
      await mkdir(join(process.cwd()), { recursive: true })
      await writeFile(projectPath, JSON.stringify({ model: 'gpt-4o' }))

      const result = await captureModule.captureAgentConfig('opencode')
      assert.ok(result.global)
      assert.ok(result.project)
      assert.equal(result.global.model, 'gpt-4')
      assert.equal(result.project.model, 'gpt-4o')

      await rm(projectPath)
    })
  })

  describe('captureMcpServers', () => {
    it('returns null when no MCP servers configured', async () => {
      const result = await captureModule.captureMcpServers('opencode')
      assert.equal(result, null)
    })

    it('captures MCP servers when configured', async () => {
      const mcpPath = join(captureDir, '.agents', 'mcp.json')
      await writeFile(mcpPath, JSON.stringify({
        mcpServers: {
          github: { command: 'npx', args: ['-y', '@test/github'] },
          db: { command: 'node', args: ['/path/to/db.js'] },
        },
      }))

      const result = await captureModule.captureMcpServers('agents')
      assert.ok(result)
      assert.ok(result.github)
      assert.equal(result.github.command, 'npx')
      assert.ok(result.db)
      assert.equal(result.db.command, 'node')
    })
  })

  describe('captureSkills', () => {
    it('returns null when no skills installed', async () => {
      const result = await captureModule.captureSkills('opencode')
      assert.equal(result, null)
    })

    it('captures skills from lockfile for the agent', async () => {
      const lockPath = join(captureDir, '.agents', '.skill-lock.json')
      await writeFile(lockPath, JSON.stringify({
        version: 3,
        skills: {
          'owner/repo-a': { slug: 'owner/repo-a', agents: ['opencode'] },
          'owner/repo-b': { slug: 'owner/repo-b', agents: ['cursor'] },
          'owner/repo-c': { slug: 'owner/repo-c', agents: ['opencode', 'cursor'] },
        },
      }))

      const result = await captureModule.captureSkills('opencode')
      assert.ok(result)
      assert.ok(result.includes('owner/repo-a'))
      assert.ok(result.includes('owner/repo-c'))
      assert.equal(result.includes('owner/repo-b'), false)
    })

    it('captures skills with "all" agent flag', async () => {
      const lockPath = join(captureDir, '.agents', '.skill-lock.json')
      await writeFile(lockPath, JSON.stringify({
        version: 3,
        skills: {
          'owner/global-skill': { slug: 'owner/global-skill', agents: ['agents'] },
        },
      }))

      const result = await captureModule.captureSkills('opencode')
      assert.ok(result)
      assert.ok(result.includes('owner/global-skill'))
    })
  })

  describe('captureInstructions', () => {
    it('captures opencode instructions from config', async () => {
      const configPath = join(captureDir, '.opencode.json')
      await writeFile(configPath, JSON.stringify({
        instructions: ['AGENTS.md', 'CONTRIBUTING.md'],
      }))

      const result = await captureModule.captureInstructions('opencode')
      assert.ok(result)
      assert.ok(Array.isArray(result))
    })

    it('returns null for agent without instruction paths', async () => {
      const result = await captureModule.captureInstructions('devin')
      assert.equal(result, null)
    })
  })

  describe('captureAgentFull', () => {
    it('returns null when nothing is configured', async () => {
      const subDir = join(captureDir, 'full-empty-' + Date.now())
      await mkdir(subDir, { recursive: true })
      process.env.HOME = subDir
      process.cwd = () => subDir
      const freshModule = await import('./profile.js')

      const result = await freshModule.captureAgentFull('opencode')
      assert.equal(result, null)

      process.env.HOME = captureDir
      process.cwd = () => captureDir
    })

    it('combines all captures for an agent', async () => {
      const subDir = join(captureDir, 'full-with-' + Date.now())
      await mkdir(subDir, { recursive: true })
      process.env.HOME = subDir
      process.cwd = () => subDir
      const freshModule = await import('./profile.js')

      const configPath = join(subDir, '.opencode.json')
      await writeFile(configPath, JSON.stringify({ model: 'gpt-4' }))

      const result = await freshModule.captureAgentFull('opencode')
      assert.ok(result)
      assert.ok(result.config)
      assert.equal(result.config.global.model, 'gpt-4')

      process.env.HOME = captureDir
      process.cwd = () => captureDir
    })
  })

  describe('captureAllAgents', () => {
    it('returns empty object when no agents', async () => {
      const result = await captureModule.captureAllAgents()
      assert.ok(typeof result === 'object')
      assert.equal(Object.keys(result).length, 0)
    })

    it('captures configured agents', async () => {
      await mkdir(join(captureDir, '.agents', 'skills', 'test-skill'), { recursive: true })
      const configPath = join(captureDir, '.opencode.json')
      await writeFile(configPath, JSON.stringify({ model: 'gpt-4' }))

      const result = await captureModule.captureAllAgents()
      assert.ok(typeof result === 'object')
    })
  })
})
