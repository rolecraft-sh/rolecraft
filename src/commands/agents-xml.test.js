import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, originalCwd, originalHome, xmlModule

function capture() {
  const logs = []
  const origLog = console.log
  console.log = (...args) => { if (args.length) logs.push(String(args[0])) }
  return { logs, restore: () => { console.log = origLog } }
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-xml-test-'))
  originalCwd = process.cwd()
  originalHome = process.env.HOME
  process.env.HOME = tempDir
  process.chdir(tempDir)

  await mkdir(join(tempDir, '.agents'), { recursive: true })
  await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
    version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [],
  }))

  xmlModule = await import('./agents-xml.js')
})

after(async () => {
  process.chdir(originalCwd)
  process.env.HOME = originalHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('agents-xml command', () => {
  it('shows no skills message when lockfile is empty', async () => {
    const { logs, restore } = capture()
    try {
      await xmlModule.agentsXmlCommand()
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('No skills found')))
  })

  it('outputs XML when skills are in lockfile', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/my-skill': { slug: 'test/my-skill', source: '', contentSha: 'abc' },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await xmlModule.agentsXmlCommand()
    } finally {
      restore()
    }
    const output = logs.join(' ')
    assert.ok(output.includes('<skills_system>'))
    assert.ok(output.includes('<available_skills>'))
    assert.ok(output.includes('test/my-skill'))
  })

  it('includes description from SKILL.md when available', async () => {
    await mkdir(join(tempDir, '.agents', 'skills', 'test-my-skill'), { recursive: true })
    writeFileSync(join(tempDir, '.agents', 'skills', 'test-my-skill', 'SKILL.md'), `---
name: My Custom Skill
description: A detailed description
slug: test/my-skill
---

Content here
`)

    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/my-skill': { slug: 'test/my-skill', source: tempDir, sourceType: 'local', contentSha: 'abc',
          agents: ['opencode'],
        },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await xmlModule.agentsXmlCommand()
    } finally {
      restore()
    }
    const output = logs.join(' ')
    assert.ok(output.includes('My Custom Skill'))
    assert.ok(output.includes('A detailed description'))
  })

  it('includes global location for non-project skills', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/global-skill': { slug: 'test/global-skill', source: '', contentSha: 'abc',
          agents: ['opencode'],
        },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await xmlModule.agentsXmlCommand()
    } finally {
      restore()
    }
    const output = logs.join(' ')
    assert.ok(output.includes('<location>global</location>'))
  })

  it('includes project location for project-scoped skills', async () => {
    await mkdir(join(tempDir, '.agents', 'skills'), { recursive: true })
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {}, dismissed: {}, lastSelectedAgents: [],
    }))

    const projectDir = join(tempDir, 'my-project')
    await mkdir(join(projectDir, '.agents'), { recursive: true })
    await writeFile(join(projectDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/proj-skill': { slug: 'test/proj-skill', source: '', contentSha: 'abc',
          agents: ['project', 'claude-code'],
        },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const origCwd = process.cwd()
    process.chdir(projectDir)
    const { logs, restore } = capture()
    try {
      await xmlModule.agentsXmlCommand()
    } finally {
      restore()
      process.chdir(origCwd)
    }
    const output = logs.join(' ')
    assert.ok(output.includes('<location>project</location>'))
  })

  it('escapes XML special characters', async () => {
    await mkdir(join(tempDir, '.agents', 'skills', 'test-special'), { recursive: true })
    writeFileSync(join(tempDir, '.agents', 'skills', 'test-special', 'SKILL.md'), `---
name: Skill & Co <test>
description: Description with "quotes" & <tags>
slug: test/special
---
`)

    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/special': { slug: 'test/special', source: tempDir, sourceType: 'local', contentSha: 'abc',
          agents: ['opencode'],
        },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await xmlModule.agentsXmlCommand()
    } finally {
      restore()
    }
    const output = logs.join(' ')
    assert.ok(output.includes('&amp;'))
    assert.ok(output.includes('&lt;'))
    assert.ok(output.includes('&quot;'))
  })

  it('--write writes to AGENTS.md', async () => {
    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/write-test': { slug: 'test/write-test', source: '', contentSha: 'abc',
          agents: ['opencode'],
        },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { logs, restore } = capture()
    try {
      await xmlModule.agentsXmlCommand(true)
    } finally {
      restore()
    }
    assert.ok(logs.some(l => l.includes('AGENTS.md')))
    const content = readFileSync(join(tempDir, 'AGENTS.md'), 'utf-8')
    assert.ok(content.includes('<skills_system>'))
    assert.ok(content.includes('test/write-test'))
  })

  it('--write replaces existing skills_system section', async () => {
    writeFileSync(join(tempDir, 'AGENTS.md'), `# Project

Some content.

<skills_system>
<available_skills>
  <skill>
    <name>old-skill</name>
  </skill>
</available_skills>
</skills_system>

More content.
`)

    await writeFile(join(tempDir, '.agents', '.skill-lock.json'), JSON.stringify({
      version: 3, skills: {
        'test/new-skill': { slug: 'test/new-skill', source: '', contentSha: 'abc',
          agents: ['opencode'],
        },
      }, dismissed: {}, lastSelectedAgents: [],
    }))

    const { restore } = capture()
    try {
      await xmlModule.agentsXmlCommand(true)
    } finally {
      restore()
    }
    const content = readFileSync(join(tempDir, 'AGENTS.md'), 'utf-8')
    assert.ok(content.includes('test/new-skill'))
    assert.ok(!content.includes('old-skill'))
    assert.ok(content.includes('Some content.'))
    assert.ok(content.includes('More content.'))
  })
})
