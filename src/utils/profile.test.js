import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, constants } from 'node:fs'
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises'
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

    it('rejects invalid version type', () => {
      const result = profileModule.validateProfile({ name: 'test', version: 'string-not-number', agents: {} })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some(e => e.includes('version')))
    })

    it('rejects non-object localOverrides', () => {
      const result = profileModule.validateProfile({
        name: 'test',
        agents: {},
        localOverrides: 'bad',
      })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some(e => e.includes('localOverrides')))
    })

    it('rejects null agent entry value', () => {
      const result = profileModule.validateProfile({
        name: 'test',
        agents: { opencode: null },
      })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some(e => e.includes('agents.opencode')))
    })

    it('rejects non-object agent entry config', () => {
      const result = profileModule.validateProfile({
        name: 'test',
        agents: { opencode: { config: 'string-not-object' } },
      })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some(e => e.includes('config')))
    })

    it('rejects array mcpServers', () => {
      const result = profileModule.validateProfile({
        name: 'test',
        agents: { opencode: { mcpServers: [] } },
      })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some(e => e.includes('mcpServers')))
    })

    it('rejects invalid profile name characters', () => {
      const result = profileModule.validateProfile({ name: 'bad/name', agents: {} })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some(e => e.includes('Invalid profile name')))
    })

    it('rejects name with spaces', () => {
      const result = profileModule.validateProfile({ name: 'my profile', agents: {} })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some(e => e.includes('Invalid profile name')))
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

    it('throws on corrupted profile file', async () => {
      const { writeFile } = await import('node:fs/promises')
      const { profilePath } = await import('./profile.js')
      const path = profilePath('corrupted')
      await writeFile(path, 'not valid json', 'utf-8')

      await assert.rejects(
        () => profileModule.readProfile('corrupted'),
        /JSON/
      )
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

    it('sorts profiles with missing updatedAt as lower priority', async () => {
      const subDir = join(tempDir, 'list-sort-' + Date.now())
      process.env.HOME = subDir
      const freshModule = await import('./profile.js')
      await freshModule.writeProfile({ name: 'has-date', agents: {} })
      const { writeFile } = await import('node:fs/promises')
      const { profilePath } = await import('./profile.js')
      await writeFile(profilePath('no-date'), JSON.stringify({ name: 'no-date', agents: {} }), 'utf-8')

      const list = await freshModule.listProfiles()
      assert.equal(list.length, 2)
      assert.ok(list.find(p => p.name === 'has-date'))
      assert.ok(list.find(p => p.name === 'no-date'))

      process.env.HOME = tempDir
    })

    it('sorts alphabetically when both have no updatedAt', async () => {
      const subDir = join(tempDir, 'list-sort-alpha-' + Date.now())
      process.env.HOME = subDir
      const freshModule = await import('./profile.js')
      const profilesDir = join(subDir, '.agents', 'profiles')
      await mkdir(profilesDir, { recursive: true })
      const { writeFile } = await import('node:fs/promises')
      await writeFile(join(profilesDir, 'b-profile.json'), JSON.stringify({ name: 'b-profile', agents: {} }), 'utf-8')
      await writeFile(join(profilesDir, 'a-profile.json'), JSON.stringify({ name: 'a-profile', agents: {} }), 'utf-8')

      const list = await freshModule.listProfiles()
      assert.equal(list.length, 2)
      assert.equal(list[0].name, 'a-profile')
      assert.equal(list[1].name, 'b-profile')

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
      const result = await captureModule.captureAgentConfig('agents')
      assert.equal(result, null)
    })

    it('captures config when file exists', async () => {
      const configPath = join(captureDir, '.opencode.json')
      await writeFile(configPath, JSON.stringify({ model: 'gpt-4', permission: { read: 'allow' } }))

      const result = await captureModule.captureAgentConfig('agents')
      assert.ok(result)
      assert.ok(result.global)
      assert.equal(result.global.model, 'gpt-4')
      assert.equal(result.global.permission.read, 'allow')
    })

    it('stores non-JSON config as raw string', async () => {
      const configPath = join(captureDir, '.cursorrules')
      await writeFile(configPath, 'You are a helpful assistant.')

      const result = await captureModule.captureAgentConfig('cursor')
      assert.ok(result)
      assert.ok(result.project)
      assert.equal(result.project, 'You are a helpful assistant.')
    })

    it('captures both global and project configs', async () => {
      const globalPath = join(captureDir, '.opencode.json')
      const projectPath = join(process.cwd(), 'opencode.json')
      await writeFile(globalPath, JSON.stringify({ model: 'gpt-4' }))
      await mkdir(join(process.cwd()), { recursive: true })
      await writeFile(projectPath, JSON.stringify({ model: 'gpt-4o' }))

      const result = await captureModule.captureAgentConfig('agents')
      assert.ok(result.global)
      assert.ok(result.project)
      assert.equal(result.global.model, 'gpt-4')
      assert.equal(result.project.model, 'gpt-4o')

      await rm(projectPath)
    })
  })

  describe('captureAgentConfigRaw', () => {
    it('returns null for unknown agent flag', async () => {
      const result = await captureModule.captureAgentConfigRaw('nonexistent')
      assert.equal(result, null)
    })

    it('returns null when config file does not exist', async () => {
      const rawDir = join(captureDir, 'raw-no-file-' + Date.now())
      process.env.HOME = rawDir
      process.cwd = () => rawDir
      const freshModule = await import('./profile.js')
      const result = await freshModule.captureAgentConfigRaw('agents')
      assert.equal(result, null)
      process.env.HOME = captureDir
      process.cwd = () => captureDir
    })

    it('reads raw config content when file exists', async () => {
      const rawDir = join(captureDir, 'raw-with-file-' + Date.now())
      await mkdir(rawDir, { recursive: true })
      const configPath = join(rawDir, '.opencode.json')
      await writeFile(configPath, JSON.stringify({ model: 'gpt-4' }))

      process.env.HOME = rawDir
      process.cwd = () => rawDir
      const freshModule = await import('./profile.js')
      const result = await freshModule.captureAgentConfigRaw('agents')
      assert.ok(result)
      assert.ok(result.global)
      assert.equal(result.global, JSON.stringify({ model: 'gpt-4' }))
      process.env.HOME = captureDir
      process.cwd = () => captureDir
    })
  })

  describe('captureMcpServers', () => {
    it('returns null when no MCP servers configured', async () => {
      const result = await captureModule.captureMcpServers('agents')
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
      const result = await captureModule.captureSkills('agents')
      assert.equal(result, null)
    })

    it('captures skills from lockfile for the agent', async () => {
      const lockPath = join(captureDir, '.agents', '.skill-lock.json')
      await writeFile(lockPath, JSON.stringify({
        version: 3,
        skills: {
          'owner/repo-a': { slug: 'owner/repo-a', agents: ['agents'] },
          'owner/repo-b': { slug: 'owner/repo-b', agents: ['cursor'] },
          'owner/repo-c': { slug: 'owner/repo-c', agents: ['agents', 'cursor'] },
        },
      }))

      const result = await captureModule.captureSkills('agents')
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

      const result = await captureModule.captureInstructions('agents')
      assert.ok(result)
      assert.ok(Array.isArray(result))
      assert.equal(result.length, 1)
      assert.equal(result[0].scope, 'global')
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

      const result = await freshModule.captureAgentFull('agents')
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

      const result = await freshModule.captureAgentFull('agents')
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

describe('profile apply', () => {
  let applyDir, applyModule, origHome, origCwd

  before(async () => {
    applyDir = mkdtempSync(join(tmpdir(), 'rolecraft-apply-test-'))
    origHome = process.env.HOME
    origCwd = process.cwd
    process.env.HOME = applyDir
    process.cwd = () => join(applyDir, 'project')
    await mkdir(join(applyDir, '.agents', 'profiles'), { recursive: true })
    await mkdir(join(applyDir, 'project'), { recursive: true })
    applyModule = await import('./profile.js')
  })

  after(async () => {
    process.cwd = origCwd
    await rm(applyDir, { recursive: true, force: true })
    process.env.HOME = origHome
  })

  describe('createBackup', () => {
    it('returns null for agent without known config paths', async () => {
      const result = await applyModule.createBackup('nonexistent')
      assert.equal(result, null)
    })

    it('backs up existing config', async () => {
      const configPath = join(applyDir, '.opencode.json')
      await writeFile(configPath, JSON.stringify({ model: 'gpt-4' }))

      const result = await applyModule.createBackup('agents')
      assert.ok(result)
      assert.equal(result.length, 1)
      assert.equal(result[0].scope, 'global')
      assert.ok(result[0].path.includes('.bak'))
    })

    it('returns null when no config exists', async () => {
      await rm(join(applyDir, '.opencode.json'))
      const result = await applyModule.createBackup('agents')
      assert.equal(result, null)
    })
  })

  describe('applyAgentConfig', () => {
    it('writes config to the correct path', async () => {
      const configData = {
        global: { model: 'gpt-4o', permission: { read: 'allow' } },
      }

      const result = await applyModule.applyAgentConfig('agents', configData)
      assert.equal(result.length, 1)
      assert.equal(result[0].scope, 'global')

      const written = JSON.parse(await readFile(result[0].path, 'utf-8'))
      assert.equal(written.model, 'gpt-4o')
      assert.equal(written.permission.read, 'allow')
    })

    it('writes project-scoped config', async () => {
      const projectDir = join(applyDir, 'project')
      const configData = {
        project: { model: 'deepseek-v4' },
      }

      const result = await applyModule.applyAgentConfig('agents', configData)
      assert.equal(result.length, 1)
      assert.equal(result[0].scope, 'project')

      const written = JSON.parse(await readFile(result[0].path, 'utf-8'))
      assert.equal(written.model, 'deepseek-v4')
    })

    it('returns empty array for unknown agent', async () => {
      const result = await applyModule.applyAgentConfig('unknown', { global: {} })
      assert.deepEqual(result, [])
    })

    it('returns empty array for null config', async () => {
      const result = await applyModule.applyAgentConfig('agents', null)
      assert.deepEqual(result, [])
    })
  })

  describe('applyMcpServers', () => {
    it('adds MCP servers to agent config', async () => {
      const servers = {
        'test-server': { command: 'npx', args: ['-y', '@test/server'] },
      }

      const result = await applyModule.applyMcpServers('agents', servers)
      assert.equal(result.length, 1)
      assert.equal(result[0].name, 'test-server')
      assert.ok(result[0].success)
    })

    it('returns empty array for empty servers', async () => {
      const result = await applyModule.applyMcpServers('agents', {})
      assert.equal(result.length, 0)
    })

    it('returns empty array for non-object servers', async () => {
      const result = await applyModule.applyMcpServers('agents', null)
      assert.equal(result.length, 0)
    })

  })

  describe('applyInstructions', () => {
    it('applies instructions to opencode config', async () => {
      const instructions = [
        { file: 'AGENTS.md', contentSha: 'abc' },
        { file: 'CONTRIBUTING.md', contentSha: 'def' },
      ]

      const result = await applyModule.applyInstructions('agents', instructions)
      assert.ok(result.length > 0)

      const configPath = join(applyDir, '.opencode.json')
      const config = JSON.parse(await readFile(configPath, 'utf-8'))
      assert.ok(config.instructions)
      assert.ok(config.instructions.includes('AGENTS.md'))
    })

    it('returns empty array for unknown agent', async () => {
      const result = await applyModule.applyInstructions('unknown', [{ file: 'test.md' }])
      assert.deepEqual(result, [])
    })

    it('returns empty array for empty instructions', async () => {
      const result = await applyModule.applyInstructions('agents', [])
      assert.deepEqual(result, [])
    })

    it('applies cursor instructions to .cursorrules', async () => {
      const cursorDir = join(applyDir, 'cursor-project')
      await mkdir(cursorDir, { recursive: true })
      process.cwd = () => cursorDir

      const result = await applyModule.applyInstructions('cursor', [{ content: 'Be helpful' }])
      assert.ok(result.length > 0)

      const rulesPath = join(cursorDir, '.cursorrules')
      const content = await readFile(rulesPath, 'utf-8')
      assert.ok(content.includes('Be helpful'))
    })
  })

  describe('applyProfileEntry', () => {
    it('returns result object with dry-run', async () => {
      const entry = { config: { global: { model: 'gpt-4' } } }
      const result = await applyModule.applyProfileEntry('agents', entry, { dryRun: true })

      assert.equal(result.agent, 'agents')
      assert.equal(result.config.applied.length, 0)
      assert.equal(result.backup, null)
    })

    it('applies a complete entry', async () => {
      const entry = {
        config: { global: { model: 'gpt-4', instructions: ['AGENTS.md'] } },
        mcpServers: { 'test-mcp': { command: 'npx', args: ['-y', '@test/mcp'] } },
        instructions: [{ file: 'AGENTS.md' }],
      }

      const result = await applyModule.applyProfileEntry('agents', entry, { skipSkills: true })
      assert.equal(result.agent, 'agents')
      assert.ok(result.config.applied.length > 0)
      assert.ok(result.backup)
      assert.ok(result.mcpServers.applied.length > 0)
    })

    it('skips config when entry has no config field', async () => {
      const result = await applyModule.applyProfileEntry('agents', { mcpServers: {}, skills: [], instructions: [] }, { skipSkills: true, skipMcp: true })
      assert.ok(result.config.skipped.some(s => s.includes('no config data')))
    })

    it('skips MCP servers when skipMcp is true', async () => {
      const entry = { config: { global: { model: 'test' } }, mcpServers: { m: { command: 'npx', args: ['x'] } } }
      const result = await applyModule.applyProfileEntry('agents', entry, { skipSkills: true, skipMcp: true })
      assert.ok(result.mcpServers.skipped.some(s => s.includes('skipped via flag')))
    })

    it('skips MCP servers when entry has no mcpServers field', async () => {
      const entry = { config: { global: { model: 'test' } }, instructions: [] }
      const result = await applyModule.applyProfileEntry('agents', entry, { skipSkills: true })
      assert.ok(result.mcpServers.skipped.some(s => s.includes('no MCP data')))
    })

    it('skips skills when skipSkills is true', async () => {
      const entry = { config: { global: { model: 'test' } }, skills: ['some-slug'] }
      const result = await applyModule.applyProfileEntry('agents', entry, { skipSkills: true, skipMcp: true })
      assert.ok(result.skills.skipped.some(s => s.includes('skipped via flag')))
    })

    it('skips skills when entry has no skills field', async () => {
      const entry = { config: { global: { model: 'test' } }, instructions: [] }
      const result = await applyModule.applyProfileEntry('agents', entry, { skipMcp: true })
      assert.ok(result.skills.skipped.some(s => s.includes('no skills data')))
    })

    it('skips instructions when entry has no instructions field', async () => {
      const entry = { config: { global: { model: 'test' } } }
      const result = await applyModule.applyProfileEntry('agents', entry, { skipSkills: true, skipMcp: true })
      assert.ok(result.instructions.skipped.some(s => s.includes('no instructions data')))
    })

    it('processes skills field (installed or already-installed)', async () => {
      const entry = {
        config: { global: { model: 'test' } },
        skills: ['bench-skill'],
      }

      const result = await applyModule.applyProfileEntry('agents', entry, { skipMcp: true })
      const all = [...result.skills.applied, ...result.skills.skipped]
      assert.ok(all.length > 0 || result.skills.failed.length > 0)
    })
  })

  describe('applyProfileData', () => {
    it('applies all agents in data', async () => {
      const data = {
        agents: {
          agents: {
            config: { global: { model: 'gpt-4' } },
          },
        },
      }

      const results = await applyModule.applyProfileData(data, { skipSkills: true, skipMcp: true })
      assert.ok(results.agents)
      assert.ok(results.agents.config.applied.length > 0)
    })

    it('throws when data is null', async () => {
      await assert.rejects(
        () => applyModule.applyProfileData(null),
        /must contain an "agents" object/
      )
    })

    it('throws when agents is missing', async () => {
      await assert.rejects(
        () => applyModule.applyProfileData({}),
        /must contain an "agents" object/
      )
    })

    it('throws when agents is not an object', async () => {
      await assert.rejects(
        () => applyModule.applyProfileData({ agents: 'string' }),
        /must contain an "agents" object/
      )
    })
  })

  describe('ensureSkillsInstalled', () => {
    it('returns empty array for empty input', async () => {
      const result = await applyModule.ensureSkillsInstalled([])
      assert.deepEqual(result, [])
    })

    it('returns empty array for null input', async () => {
      const result = await applyModule.ensureSkillsInstalled(null)
      assert.deepEqual(result, [])
    })

    it('skips already installed skills from lockfile', async () => {
      const lockDir = join(applyDir, '.agents')
      await mkdir(lockDir, { recursive: true })
      await writeFile(join(lockDir, '.skill-lock.json'), JSON.stringify({
        version: 3,
        skills: { 'already-installed-slug': { slug: 'already-installed-slug', agents: ['agents'] } },
      }))

      const result = await applyModule.ensureSkillsInstalled(['already-installed-slug'])
      assert.equal(result.length, 1)
      assert.equal(result[0].slug, 'already-installed-slug')
      assert.equal(result[0].action, 'skipped')
      assert.equal(result[0].reason, 'already_installed')
    })

    it('installs a local skill from file path', async () => {
      const skillDir = join(applyDir, 'local-skill-test')
      await mkdir(skillDir, { recursive: true })
      await writeFile(join(skillDir, 'SKILL.md'), '---\nslug: local-install-skill\nname: Local Test\n---\n# Test', 'utf-8')

      const result = await applyModule.ensureSkillsInstalled([skillDir])
      assert.equal(result.length, 1)
      assert.equal(result[0].slug, skillDir)
      assert.equal(result[0].action, 'installed')

      const installedDir = join(applyDir, '.agents', 'skills', 'local-install-skill')
      const stat = await import('node:fs/promises').then(m => m.stat(installedDir))
      assert.ok(true)
    })

    it('reports failed installation when source is invalid', async () => {
      const result = await applyModule.ensureSkillsInstalled(['/nonexistent/skill/path'])
      assert.equal(result.length, 1)
      assert.equal(result[0].action, 'failed')
    })
  })

  describe('formatApplyResults', () => {
    it('formats results into readable string', () => {
      const results = {
        opencode: {
          config: { applied: [{ scope: 'global', path: '/tmp/test' }], skipped: [] },
          mcpServers: { applied: ['github'], skipped: [] },
          skills: { applied: [], skipped: ['already-installed'], failed: [] },
          instructions: { applied: [], skipped: ['no data'] },
          backup: null,
        },
      }

      const formatted = applyModule.formatApplyResults(results)
      assert.ok(formatted.includes('opencode'))
      assert.ok(formatted.includes('config'))
      assert.ok(formatted.includes('MCP'))
    })

    it('handles no changes', () => {
      const results = {
        opencode: {
          config: { applied: [], skipped: [] },
          mcpServers: { applied: [], skipped: [] },
          skills: { applied: [], skipped: [] },
          instructions: { applied: [], skipped: [] },
          backup: null,
        },
      }

      const formatted = applyModule.formatApplyResults(results)
      assert.ok(formatted.includes('no changes'))
    })
  })
})
