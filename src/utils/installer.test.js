import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, readlinkSync, lstatSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, installerModule, resolvedSkill, origHome

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-install-test-'))
  origHome = process.env.HOME
  process.env.HOME = tempDir

  const sourceDir = join(tempDir, 'source-skill')
  mkdirSync(sourceDir, { recursive: true })
  writeFileSync(join(sourceDir, 'SKILL.md'), '# slug: test/my-skill\nname: my-skill\n# owner: test\nContent')
  writeFileSync(join(sourceDir, 'helper.js'), 'module.exports = {}\n')

  await mkdir(join(tempDir, '.agents'), { recursive: true })

  resolvedSkill = {
    slug: 'test/my-skill',
    name: 'my-skill',
    owner: 'test',
    content: '# slug: test/my-skill\nname: my-skill\nContent',
    files: ['SKILL.md', 'helper.js'],
    skillDir: sourceDir,
    sourcePath: sourceDir,
    sourceType: 'local',
  }

  installerModule = await import('./installer.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
  await rm(join(process.cwd(), '.github', 'copilot', 'skills'), { recursive: true, force: true })
  process.env.HOME = origHome
})

describe('installer', () => {
  it('installs skill to agents directory (global)', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['agents'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'agents')

    const skillDir = join(tempDir, '.agents', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
    assert.ok(existsSync(join(skillDir, 'helper.js')))

    const lock = JSON.parse(readFileSync(join(tempDir, '.agents', '.skill-lock.json'), 'utf-8'))
    assert.ok(lock.skills['test/my-skill'])
  })

  it('installs skill to claude directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['claude'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'claude')

    const skillDir = join(tempDir, '.claude', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to cursor directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['cursor'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'cursor')

    const skillDir = join(tempDir, '.cursor', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to windsurf directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['windsurf'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'windsurf')

    const skillDir = join(tempDir, '.windsurf', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to codex directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['codex'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'codex')

    const skillDir = join(tempDir, '.codex', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to copilot project directory (.github/copilot/skills/)', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['copilot'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'copilot')

    const skillDir = join(process.cwd(), '.github', 'copilot', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to aider directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['aider'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'aider')

    const skillDir = join(tempDir, '.aider', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to cline directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['cline'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'cline')

    const skillDir = join(tempDir, '.cline', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to devin directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['devin'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'devin')

    const skillDir = join(tempDir, '.devin', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to gemini directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['gemini'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'gemini')

    const skillDir = join(tempDir, '.gemini', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to cody directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['cody'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'cody')

    const skillDir = join(tempDir, '.cody', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to continue directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['continue'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'continue')

    const skillDir = join(tempDir, '.continue', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to warp directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['warp'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'warp')

    const skillDir = join(tempDir, '.warp', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to codeium directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['codeium'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'codeium')

    const skillDir = join(tempDir, '.codeium', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to fabric directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['fabric'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'fabric')

    const skillDir = join(tempDir, '.fabric', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to goose directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['goose'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'goose')

    const skillDir = join(tempDir, '.goose', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to tabnine directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['tabnine'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'tabnine')

    const skillDir = join(tempDir, '.tabnine', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to supermaven directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['supermaven'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'supermaven')

    const skillDir = join(tempDir, '.supermaven', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to pr-pilot directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['pr-pilot'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'pr-pilot')

    const skillDir = join(tempDir, '.pr-pilot', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to loom directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['loom'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'loom')

    const skillDir = join(tempDir, '.loom', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to command-code directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['command-code'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'command-code')
    const skillDir = join(process.env.HOME, '.commandcode', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to cortex directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['cortex'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'cortex')
    const skillDir = join(process.env.HOME, '.snowflake', 'cortex', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to mistral-vibe directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['mistral-vibe'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'mistral-vibe')
    const skillDir = join(process.env.HOME, '.vibe', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to qwen-code directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['qwen-code'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'qwen-code')
    const skillDir = join(process.env.HOME, '.qwen', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to openclaw directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['openclaw'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'openclaw')
    const skillDir = join(process.env.HOME, '.openclaw', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to codebuddy directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['codebuddy'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'codebuddy')
    const skillDir = join(process.env.HOME, '.codebuddy', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to mux directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['mux'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'mux')
    const skillDir = join(process.env.HOME, '.mux', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to pi directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['pi'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'pi')
    const skillDir = join(process.env.HOME, '.pi', 'agent', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to autohand-code directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['autohand-code'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'autohand-code')
    const skillDir = join(process.env.HOME, '.autohand', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to rovo directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['rovo'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'rovo')
    const skillDir = join(process.env.HOME, '.rovodev', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to firebender directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['firebender'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'firebender')
    const skillDir = join(process.env.HOME, '.firebender', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to bob directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['bob'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'bob')
    const skillDir = join(process.env.HOME, '.bob', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })
  it('installs skill to aider-desk directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['aider-desk'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'aider-desk')

    const skillDir = join(process.env.HOME, '.aider-desk', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to roo directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['roo'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'roo')
    const skillDir = join(process.env.HOME, '.roo', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to trae directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['trae'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'trae')
    const skillDir = join(process.env.HOME, '.trae', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to hermes directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['hermes'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'hermes')
    const skillDir = join(process.env.HOME, '.hermes', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to kiro directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['kiro'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'kiro')
    const skillDir = join(process.env.HOME, '.kiro', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to augment directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['augment'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'augment')
    const skillDir = join(process.env.HOME, '.augment', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to kilo directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['kilo'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'kilo')
    const skillDir = join(process.env.HOME, '.kilo', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to openhands directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['openhands'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'openhands')
    const skillDir = join(process.env.HOME, '.openhands', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to junie directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['junie'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'junie')
    const skillDir = join(process.env.HOME, '.junie', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })

  it('installs skill to factory directory', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['factory'])
    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'factory')
    const skillDir = join(process.env.HOME, '.factory', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
  })
  it('installs skill to project directory', async () => {
    const origCwd = process.cwd
    process.cwd = () => tempDir

    const results = await installerModule.installSkill(resolvedSkill, ['project'])

    assert.equal(results.length, 1)
    assert.equal(results[0].target, 'project')

    const skillDir = join(tempDir, '.agents', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))

    process.cwd = origCwd
  })

  it('installs to multiple targets', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['agents', 'project'])
    assert.equal(results.length, 2)
  })

  it('skips unknown targets', async () => {
    const results = await installerModule.installSkill(resolvedSkill, ['unknown'])
    assert.equal(results.length, 0)
  })

  it('handles missing source files gracefully', async () => {
    const badResolved = {
      ...resolvedSkill,
      files: ['SKILL.md', 'nonexistent.js'],
    }
    const results = await installerModule.installSkill(badResolved, ['agents'])
    assert.equal(results.length, 1)
    const skillDir = join(tempDir, '.agents', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
    assert.ok(!existsSync(join(skillDir, 'nonexistent.js')))
  })

  it('installs using fileContents when provided', async () => {
    const fileContentResolved = {
      ...resolvedSkill,
      skillDir: undefined,
      files: ['SKILL.md', 'data.json'],
      fileContents: {
        'SKILL.md': '# slug: test/filecontent\nname: filecontent-skill\nContent',
        'data.json': '{"key": "value"}',
      },
    }
    const results = await installerModule.installSkill(fileContentResolved, ['agents'])
    assert.equal(results.length, 1)

    const skillDir = join(tempDir, '.agents', 'skills', 'test-my-skill')
    assert.ok(existsSync(join(skillDir, 'SKILL.md')))
    assert.equal(
      readFileSync(join(skillDir, 'SKILL.md'), 'utf-8'),
      '# slug: test/filecontent\nname: filecontent-skill\nContent',
    )
    assert.ok(existsSync(join(skillDir, 'data.json')))
    assert.equal(
      readFileSync(join(skillDir, 'data.json'), 'utf-8'),
      '{"key": "value"}',
    )
  })

  it('installs with symlink mode', async () => {
    const sourceDir = join(tempDir, 'symlink-source')
    mkdirSync(sourceDir, { recursive: true })
    writeFileSync(join(sourceDir, 'SKILL.md'), '# slug: test/symlink\nname: symlink-skill\nContent')

    const symlinkResolved = {
      ...resolvedSkill,
      slug: 'test/symlink',
      skillDir: sourceDir,
      files: ['SKILL.md'],
      fileContents: {},
    }

    const results = await installerModule.installSkill(symlinkResolved, ['agents'], 'symlink')
    assert.equal(results.length, 1)

    const skillDir = join(tempDir, '.agents', 'skills', 'test-symlink')
    assert.ok(lstatSync(skillDir).isSymbolicLink())
    const target = readlinkSync(skillDir)
    assert.ok(target.includes('symlink-source'))
  })
})
