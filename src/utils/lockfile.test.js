import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, lockModule, origHome

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-lock-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir
  await mkdir(join(tempDir, '.agents'), { recursive: true })
  lockModule = await import('./lockfile.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
  process.env.HOME = origHome
})

describe('lockfile', () => {
  it('normalizeSlug converts path separators to hyphens', () => {
    assert.equal(lockModule.normalizeSlug('owner/group/skill'), 'owner-group-skill')
    assert.equal(lockModule.normalizeSlug('already-normalized'), 'already-normalized')
  })

  it('getGlobalLockPath returns path inside homedir', () => {
    assert.equal(lockModule.getGlobalLockPath(), join(tempDir, '.agents', '.skill-lock.json'))
  })

  it('getAgentsDir returns path inside homedir', () => {
    assert.equal(lockModule.getAgentsDir(), join(tempDir, '.agents', 'skills'))
  })

  it('getClaudeDir returns path inside homedir', () => {
    assert.equal(lockModule.getClaudeDir(), join(tempDir, '.claude', 'skills'))
  })

  it('getCommandCodeDir returns path inside homedir', () => {
    assert.equal(lockModule.getCommandCodeDir(), join(tempDir, '.commandcode', 'skills'))
  })

  it('getCortexDir returns path inside homedir', () => {
    assert.equal(lockModule.getCortexDir(), join(tempDir, '.snowflake', 'cortex', 'skills'))
  })

  it('getMistralVibeDir returns path inside homedir', () => {
    assert.equal(lockModule.getMistralVibeDir(), join(tempDir, '.vibe', 'skills'))
  })

  it('getQwenCodeDir returns path inside homedir', () => {
    assert.equal(lockModule.getQwenCodeDir(), join(tempDir, '.qwen', 'skills'))
  })

  it('getOpenClawDir returns path inside homedir', () => {
    assert.equal(lockModule.getOpenClawDir(), join(tempDir, '.openclaw', 'skills'))
  })

  it('getCodeBuddyDir returns path inside homedir', () => {
    assert.equal(lockModule.getCodeBuddyDir(), join(tempDir, '.codebuddy', 'skills'))
  })

  it('getMuxDir returns path inside homedir', () => {
    assert.equal(lockModule.getMuxDir(), join(tempDir, '.mux', 'skills'))
  })

  it('getPiDir returns path inside homedir', () => {
    assert.equal(lockModule.getPiDir(), join(tempDir, '.pi', 'agent', 'skills'))
  })

  it('getAutohandCodeDir returns path inside homedir', () => {
    assert.equal(lockModule.getAutohandCodeDir(), join(tempDir, '.autohand', 'skills'))
  })

  it('getRovoDevDir returns path inside homedir', () => {
    assert.equal(lockModule.getRovoDevDir(), join(tempDir, '.rovodev', 'skills'))
  })

  it('getFirebenderDir returns path inside homedir', () => {
    assert.equal(lockModule.getFirebenderDir(), join(tempDir, '.firebender', 'skills'))
  })

  it('getBobDir returns path inside homedir', () => {
    assert.equal(lockModule.getBobDir(), join(tempDir, '.bob', 'skills'))
  })

  it('getAiderDeskDir returns path inside homedir', () => {
    assert.equal(lockModule.getAiderDeskDir(), join(tempDir, '.aider-desk', 'skills'))
  })

  it('getCopilotDir returns path inside homedir', () => {
    assert.equal(lockModule.getCopilotDir(), join(tempDir, '.copilot', 'skills'))
  })

  it('getAstrbotDir returns path inside homedir', () => {
    assert.equal(lockModule.getAstrbotDir(), join(tempDir, '.astrbot', 'data', 'skills'))
  })

  it('getQoderCnDir returns path inside homedir', () => {
    assert.equal(lockModule.getQoderCnDir(), join(tempDir, '.qoder-cn', 'skills'))
  })

  it('getTraeCnDir returns path inside homedir', () => {
    assert.equal(lockModule.getTraeCnDir(), join(tempDir, '.trae-cn', 'skills'))
  })

  it('getZenflowDir returns path inside homedir', () => {
    assert.equal(lockModule.getZenflowDir(), join(tempDir, '.zencoder', 'skills'))
  })

  it('getNeovateDir returns path inside homedir', () => {
    assert.equal(lockModule.getNeovateDir(), join(tempDir, '.neovate', 'skills'))
  })

  it('getPochiDir returns path inside homedir', () => {
    assert.equal(lockModule.getPochiDir(), join(tempDir, '.pochi', 'skills'))
  })

  it('getAdalDir returns path inside homedir', () => {
    assert.equal(lockModule.getAdalDir(), join(tempDir, '.adal', 'skills'))
  })

  it('getDroidDir returns path inside homedir', () => {
    assert.equal(lockModule.getDroidDir(), join(tempDir, '.factory', 'skills'))
  })

  it('getChatgptDir returns path inside homedir', () => {
    assert.equal(lockModule.getChatgptDir(), join(tempDir, '.chatgpt', 'skills'))
  })

  it('getCodeartsAgentDir returns path inside homedir', () => {
    assert.equal(lockModule.getCodeartsAgentDir(), join(tempDir, '.codeartsdoer', 'skills'))
  })

  it('getUniversalDir returns path inside homedir', () => {
    assert.equal(lockModule.getUniversalDir(), join(tempDir, '.config', 'agents', 'skills'))
  })

  it('getCursorDir returns path inside homedir', () => {
    assert.equal(lockModule.getCursorDir(), join(tempDir, '.cursor', 'skills'))
  })

  it('getWindsurfDir returns path inside homedir', () => {
    assert.equal(lockModule.getWindsurfDir(), join(tempDir, '.windsurf', 'skills'))
  })

  it('getCodexDir returns path inside homedir', () => {
    assert.equal(lockModule.getCodexDir(), join(tempDir, '.codex', 'skills'))
  })

  it('getCopilotProjectDir returns path relative to cwd', () => {
    assert.equal(lockModule.getCopilotProjectDir(), join(process.cwd(), '.github', 'copilot', 'skills'))
  })

  it('getAiderDir returns path inside homedir', () => {
    assert.equal(lockModule.getAiderDir(), join(tempDir, '.aider', 'skills'))
  })

  it('getClineDir returns path inside homedir', () => {
    assert.equal(lockModule.getClineDir(), join(tempDir, '.cline', 'skills'))
  })

  it('getDevinDir returns path inside homedir', () => {
    assert.equal(lockModule.getDevinDir(), join(tempDir, '.devin', 'skills'))
  })

  it('getGeminiDir returns path inside homedir', () => {
    assert.equal(lockModule.getGeminiDir(), join(tempDir, '.gemini', 'skills'))
  })

  it('getCodyDir returns path inside homedir', () => {
    assert.equal(lockModule.getCodyDir(), join(tempDir, '.cody', 'skills'))
  })

  it('getContinueDir returns path inside homedir', () => {
    assert.equal(lockModule.getContinueDir(), join(tempDir, '.continue', 'skills'))
  })

  it('getWarpDir returns path inside homedir', () => {
    assert.equal(lockModule.getWarpDir(), join(tempDir, '.warp', 'skills'))
  })

  it('getCodeiumDir returns path inside homedir', () => {
    assert.equal(lockModule.getCodeiumDir(), join(tempDir, '.codeium', 'skills'))
  })

  it('getFabricDir returns path inside homedir', () => {
    assert.equal(lockModule.getFabricDir(), join(tempDir, '.fabric', 'skills'))
  })

  it('getGooseDir returns path inside homedir', () => {
    assert.equal(lockModule.getGooseDir(), join(tempDir, '.goose', 'skills'))
  })

  it('getTabnineDir returns path inside homedir', () => {
    assert.equal(lockModule.getTabnineDir(), join(tempDir, '.tabnine', 'skills'))
  })

  it('getSupermavenDir returns path inside homedir', () => {
    assert.equal(lockModule.getSupermavenDir(), join(tempDir, '.supermaven', 'skills'))
  })

  it('getPrPilotDir returns path inside homedir', () => {
    assert.equal(lockModule.getPrPilotDir(), join(tempDir, '.pr-pilot', 'skills'))
  })

  it('getLoomDir returns path inside homedir', () => {
    assert.equal(lockModule.getLoomDir(), join(tempDir, '.loom', 'skills'))
  })

  it('getRooDir returns path inside homedir', () => {
    assert.equal(lockModule.getRooDir(), join(tempDir, '.roo', 'skills'))
  })

  it('getTraeDir returns path inside homedir', () => {
    assert.equal(lockModule.getTraeDir(), join(tempDir, '.trae', 'skills'))
  })

  it('getHermesDir returns path inside homedir', () => {
    assert.equal(lockModule.getHermesDir(), join(tempDir, '.hermes', 'skills'))
  })

  it('getKiroDir returns path inside homedir', () => {
    assert.equal(lockModule.getKiroDir(), join(tempDir, '.kiro', 'skills'))
  })

  it('getAugmentDir returns path inside homedir', () => {
    assert.equal(lockModule.getAugmentDir(), join(tempDir, '.augment', 'skills'))
  })

  it('getKiloDir returns path inside homedir', () => {
    assert.equal(lockModule.getKiloDir(), join(tempDir, '.kilo', 'skills'))
  })

  it('getOpenHandsDir returns path inside homedir', () => {
    assert.equal(lockModule.getOpenHandsDir(), join(tempDir, '.openhands', 'skills'))
  })

  it('getJunieDir returns path inside homedir', () => {
    assert.equal(lockModule.getJunieDir(), join(tempDir, '.junie', 'skills'))
  })

  it('getFactoryDir returns path inside homedir', () => {
    assert.equal(lockModule.getFactoryDir(), join(tempDir, '.factory', 'skills'))
  })

  it('getZapDir returns path inside homedir', () => {
    assert.equal(lockModule.getZapDir(), join(tempDir, '.zap', 'skills'))
  })

  it('getCodeepDir returns path inside homedir', () => {
    assert.equal(lockModule.getCodeepDir(), join(tempDir, '.codeep', 'skills'))
  })

  it('getKimiCodeDir returns path inside homedir', () => {
    assert.equal(lockModule.getKimiCodeDir(), join(tempDir, '.kimi-code', 'skills'))
  })

  it('getZCodeDir returns path inside homedir', () => {
    assert.equal(lockModule.getZCodeDir(), join(tempDir, '.zcode', 'skills'))
  })

  it('getCodeArtsDoerDir returns path inside homedir', () => {
    assert.equal(lockModule.getCodeArtsDoerDir(), join(tempDir, '.codeartsdoer', 'skills'))
  })

  it('getCodeMakerDir returns path inside homedir', () => {
    assert.equal(lockModule.getCodeMakerDir(), join(tempDir, '.codemaker', 'skills'))
  })

  it('getCodeStudioDir returns path inside homedir', () => {
    assert.equal(lockModule.getCodeStudioDir(), join(tempDir, '.codestudio', 'skills'))
  })

  it('getCrushDir returns path inside homedir', () => {
    assert.equal(lockModule.getCrushDir(), join(tempDir, '.crush', 'skills'))
  })

  it('getEveDir returns path relative to cwd', () => {
    assert.equal(lockModule.getEveDir(), join(process.cwd(), 'agent', 'skills'))
  })

  it('getForgeDir returns path inside homedir', () => {
    assert.equal(lockModule.getForgeDir(), join(tempDir, '.forge', 'skills'))
  })

  it('getInferenceShDir returns path inside homedir', () => {
    assert.equal(lockModule.getInferenceShDir(), join(tempDir, '.inferencesh', 'skills'))
  })

  it('getJazzDir returns path inside homedir', () => {
    assert.equal(lockModule.getJazzDir(), join(tempDir, '.jazz', 'skills'))
  })

  it('getIFlowDir returns path inside homedir', () => {
    assert.equal(lockModule.getIFlowDir(), join(tempDir, '.iflow', 'skills'))
  })

  it('getKiloCodeDir returns path inside homedir', () => {
    assert.equal(lockModule.getKiloCodeDir(), join(tempDir, '.kilocode', 'skills'))
  })

  it('getKodeDir returns path inside homedir', () => {
    assert.equal(lockModule.getKodeDir(), join(tempDir, '.kode', 'skills'))
  })

  it('getLingmaDir returns path inside homedir', () => {
    assert.equal(lockModule.getLingmaDir(), join(tempDir, '.lingma', 'skills'))
  })

  it('getMcpJamDir returns path inside homedir', () => {
    assert.equal(lockModule.getMcpJamDir(), join(tempDir, '.mcpjam', 'skills'))
  })

  it('getMoxbyDir returns path inside homedir', () => {
    assert.equal(lockModule.getMoxbyDir(), join(tempDir, '.moxby', 'skills'))
  })

  it('getOnaDir returns path inside homedir', () => {
    assert.equal(lockModule.getOnaDir(), join(tempDir, '.ona', 'skills'))
  })

  it('getQoderDir returns path inside homedir', () => {
    assert.equal(lockModule.getQoderDir(), join(tempDir, '.qoder', 'skills'))
  })

  it('getReasonixDir returns path inside homedir', () => {
    assert.equal(lockModule.getReasonixDir(), join(tempDir, '.reasonix', 'skills'))
  })

  it('getTerraMindDir returns path inside homedir', () => {
    assert.equal(lockModule.getTerraMindDir(), join(tempDir, '.terramind', 'skills'))
  })

  it('getTinyCloudDir returns path inside homedir', () => {
    assert.equal(lockModule.getTinyCloudDir(), join(tempDir, '.tinycloud', 'skills'))
  })

  it('getZencoderDir returns path inside homedir', () => {
    assert.equal(lockModule.getZencoderDir(), join(tempDir, '.zencoder', 'skills'))
  })

  it('getProjectLockPath returns path relative to cwd', () => {
    assert.equal(lockModule.getProjectLockPath(process.cwd()), join(process.cwd(), '.agents', '.skill-lock.json'))
  })

  it('readLock returns default when no file exists', async () => {
    const lock = await lockModule.readLock()
    assert.deepEqual(lock, {
      version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [],
    })
  })

  it('readLock parses existing lock file', async () => {
    const data = { version: 3, skills: { test: { name: 'x' } }, dismissed: {}, lastSelectedAgents: [] }
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify(data))
    const lock = await lockModule.readLock()
    assert.deepEqual(lock, data)
  })

  it('writeLock writes lock file', async () => {
    const data = { version: 3, skills: { w: {} }, dismissed: {}, lastSelectedAgents: [] }
    await lockModule.writeLock(data)
    const written = JSON.parse(readFileSync(join(tempDir, '.agents', '.skill-lock.json'), 'utf-8'))
    assert.deepEqual(written, data)
  })

  it('addSkillToLock adds entry and sets installedAt', async () => {
    await lockModule.addSkillToLock('test/skill', { name: 'Test' })
    const lock = await lockModule.readLock()
    assert.equal(lock.skills['test/skill'].name, 'Test')
    assert.ok(lock.skills['test/skill'].installedAt)
  })

  it('addSkillToLock merges agents instead of overwriting', async () => {
    await lockModule.addSkillToLock('merge-skill', { agents: ['claude-code'] })
    await lockModule.addSkillToLock('merge-skill', { agents: ['cursor', 'warp'] })
    const lock = await lockModule.readLock()
    const agents = lock.skills['merge-skill'].agents
    assert.ok(agents.includes('claude-code'))
    assert.ok(agents.includes('cursor'))
    assert.ok(agents.includes('warp'))
    assert.equal(agents.length, 3)
  })

  it('removeSkillFromLock removes entry', async () => {
    await lockModule.addSkillToLock('to-remove', {})
    await lockModule.removeSkillFromLock('to-remove')
    const lock = await lockModule.readLock()
    assert.ok(!lock.skills['to-remove'])
  })

  it('computeContentHash produces deterministic hash', () => {
    const h1 = lockModule.computeContentHash({ 'SKILL.md': 'content', 'helper.js': 'x' })
    const h2 = lockModule.computeContentHash({ 'helper.js': 'x', 'SKILL.md': 'content' })
    assert.equal(h1, h2)
    assert.equal(h1.length, 64)
  })

  it('computeContentHash changes when content changes', () => {
    const h1 = lockModule.computeContentHash({ 'SKILL.md': 'same', 'extra.js': 'a' })
    const h2 = lockModule.computeContentHash({ 'SKILL.md': 'same', 'extra.js': 'b' })
    assert.notEqual(h1, h2)
  })

  it('computeContentHash returns different hash for different files', () => {
    const h1 = lockModule.computeContentHash({ 'SKILL.md': 'x' })
    const h2 = lockModule.computeContentHash({ 'SKILL.md': 'x', 'extra.js': 'y' })
    assert.notEqual(h1, h2)
  })
})
