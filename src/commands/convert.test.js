import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, commandModule, converterModule

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-convert-test-'))
  commandModule = await import('./convert.js')
  converterModule = await import('../utils/converter.js')
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe('convert command', () => {
  it('converts SKILL.md to .mdc', async () => {
    const skillContent = '---\nname: test-skill\nslug: org/test-skill\ndescription: A test skill\n---\n\n# Test Skill\n\nSome instructions.\n'
    await writeFile(join(tempDir, 'SKILL.md'), skillContent)

    const logs = []
    mock.method(console, 'log', (...args) => { logs.push(String(args[0])) })

    await commandModule.convertCommand(join(tempDir, 'SKILL.md'), { output: tempDir })

    const outPath = join(tempDir, 'org-test-skill.mdc')
    const outContent = readFileSync(outPath, 'utf-8')
    assert.match(outContent, /description: A test skill/)
    assert.match(outContent, /alwaysApply: false/)
    assert.match(outContent, /# Test Skill/)
    assert.match(outContent, /Some instructions/)
    assert.ok(logs.some(l => l.includes('Converted')))
  })

  it('converts .mdc to SKILL.md', async () => {
    const mdcContent = '---\ndescription: My rule\nalwaysApply: false\nglobs: src/**/*.ts\n---\n\n# My Rule\n\nDo not use any.\n'
    const mdcPath = join(tempDir, 'my-rule.mdc')
    await writeFile(mdcPath, mdcContent)

    const logs = []
    mock.method(console, 'log', (...args) => { logs.push(String(args[0])) })

    await commandModule.convertCommand(mdcPath, { output: tempDir })

    const outPath = join(tempDir, 'SKILL.md')
    const outContent = readFileSync(outPath, 'utf-8')
    assert.match(outContent, /name: My rule/)
    assert.match(outContent, /slug: my-rule/)
    assert.match(outContent, /owner: local/)
    assert.match(outContent, /# My Rule/)
    assert.ok(logs.some(l => l.includes('Converted')))
  })

  it('converts a directory containing SKILL.md', async () => {
    const skillDir = join(tempDir, 'my-skill')
    await mkdir(skillDir, { recursive: true })
    const skillContent = '---\nname: dir-skill\nslug: dir-skill\n---\n\nBody\n'
    await writeFile(join(skillDir, 'SKILL.md'), skillContent)

    const logs = []
    mock.method(console, 'log', (...args) => { logs.push(String(args[0])) })

    await commandModule.convertCommand(skillDir, { output: tempDir })

    const outPath = join(tempDir, 'dir-skill.mdc')
    assert.ok(readFileSync(outPath, 'utf-8').includes('Body'))
    assert.ok(logs.some(l => l.includes('Converted')))
  })

  it('converts a directory containing .mdc files', async () => {
    const mdcDir = join(tempDir, 'rules')
    await mkdir(mdcDir, { recursive: true })
    await writeFile(join(mdcDir, 'rule1.mdc'), '---\ndescription: Rule 1\nalwaysApply: false\n---\nContent 1\n')
    await writeFile(join(mdcDir, 'rule2.mdc'), '---\ndescription: Rule 2\nalwaysApply: false\n---\nContent 2\n')

    const logs = []
    mock.method(console, 'log', (...args) => { logs.push(String(args[0])) })

    await commandModule.convertCommand(mdcDir, { output: tempDir })

    const out1 = join(tempDir, 'SKILL.md')
    const content = readFileSync(out1, 'utf-8')
    assert.ok(content.includes('Content 1') || content.includes('Content 2'))
  })

  it('dry-run shows plan without writing', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), '---\nname: dry\nslug: dry\n---\nBody\n')

    const logs = []
    mock.method(console, 'log', (...args) => { logs.push(String(args[0])) })

    await commandModule.convertCommand(join(tempDir, 'SKILL.md'), { dryRun: true, output: tempDir })

    assert.ok(logs.some(l => l.includes('Would convert')))
    const outPath = join(tempDir, 'dry.mdc')
    try {
      readFileSync(outPath, 'utf-8')
      assert.fail('Should not have written file')
    } catch {
      // expected - file doesn't exist
    }
  })

  it('throws for nonexistent source', async () => {
    await assert.rejects(
      () => commandModule.convertCommand(join(tempDir, 'nonexistent')),
      /Source not found/
    )
  })

  it('preserves mcp_servers during round-trip', async () => {
    const skillContent = '---\nname: mcp-skill\nslug: mcp-skill\ndescription: Has MCP\nmcp_servers:\n  - name: github\n    source: gh:github/github-mcp-server\n---\n\nBody\n'
    await writeFile(join(tempDir, 'SKILL.md'), skillContent)

    await commandModule.convertCommand(join(tempDir, 'SKILL.md'), { output: tempDir })
    const mdcPath = join(tempDir, 'mcp-skill.mdc')
    const mdcContent = readFileSync(mdcPath, 'utf-8')

    assert.match(mdcContent, /mcp_servers/)
    assert.match(mdcContent, /github/)
  })

  it('converts .mdc back to SKILL.md preserving body', async () => {
    const mdcPath = join(tempDir, 'test-rule.mdc')
    await writeFile(mdcPath, '---\ndescription: Test rule\nalwaysApply: true\n---\n\n# Test\n\nRule body here.\n')

    await commandModule.convertCommand(mdcPath, { output: tempDir })
    const skillPath = join(tempDir, 'SKILL.md')
    const content = readFileSync(skillPath, 'utf-8')

    assert.match(content, /name: Test rule/)
    assert.match(content, /slug: test-rule/)
    assert.match(content, /# Test/)
    assert.match(content, /Rule body here/)
  })

  it('handles file without frontmatter as body-only conversion', async () => {
    const bodyOnly = '# Just Content\n\nNo frontmatter here.\n'
    await writeFile(join(tempDir, 'SKILL.md'), bodyOnly)

    await commandModule.convertCommand(join(tempDir, 'SKILL.md'), { output: tempDir })
    const outPath = join(tempDir, 'skill.mdc')
    const content = readFileSync(outPath, 'utf-8')

    assert.match(content, /alwaysApply: false/)
    assert.match(content, /# Just Content/)
    assert.match(content, /No frontmatter here/)
  })

  it('throws for empty directory with no SKILL.md or .mdc', async () => {
    const emptyDir = join(tempDir, 'empty')
    await mkdir(emptyDir, { recursive: true })

    await assert.rejects(
      () => commandModule.convertCommand(emptyDir),
      /No SKILL.md or .mdc files found/
    )
  })

  it('detects format by content when filename is ambiguous', async () => {
    const skillContent = '---\nname: test-skill\nslug: test-skill\n---\n\nBody\n'
    const ambiguousPath = join(tempDir, 'rules.txt')
    await writeFile(ambiguousPath, skillContent)

    await commandModule.convertCommand(ambiguousPath, { output: tempDir })

    const outPath = join(tempDir, 'test-skill.mdc')
    const content = readFileSync(outPath, 'utf-8')
    assert.match(content, /alwaysApply: false/)
    assert.match(content, /Body/)
  })

  it('detects mdc format by content when filename is ambiguous', async () => {
    const mdcContent = '---\ndescription: My rule\nalwaysApply: true\nglobs: src/**/*.ts\n---\n\n# Rule\n'
    const ambiguousPath = join(tempDir, 'rules.txt')
    await writeFile(ambiguousPath, mdcContent)

    await commandModule.convertCommand(ambiguousPath, { output: tempDir })

    const outPath = join(tempDir, 'SKILL.md')
    const content = readFileSync(outPath, 'utf-8')
    assert.match(content, /name: My rule/)
    assert.match(content, /slug: rules-txt/)
  })

  it('throws when file has ambiguous name and no recognizable content', async () => {
    const ambiguousPath = join(tempDir, 'data.bin')
    await writeFile(ambiguousPath, 'some random binary data\n')

    await assert.rejects(
      () => commandModule.convertCommand(ambiguousPath),
      /Cannot detect format/
    )
  })

  it('mdc dry-run shows plan without writing', async () => {
    const mdcPath = join(tempDir, 'test.mdc')
    await writeFile(mdcPath, '---\ndescription: Test\nalwaysApply: false\n---\nBody\n')

    const logs = []
    mock.method(console, 'log', (...args) => { logs.push(String(args[0])) })

    await commandModule.convertCommand(mdcPath, { dryRun: true, output: tempDir })

    assert.ok(logs.some(l => l.includes('Would convert')))
    assert.ok(logs.some(l => l.includes('SKILL.md')))
    const outPath = join(tempDir, 'SKILL.md')
    try {
      readFileSync(outPath, 'utf-8')
      assert.fail('Should not have written file')
    } catch {
      // expected
    }
  })
})

describe('converter utilities', () => {
  it('handles invalid JSON in bracketed frontmatter value', () => {
    const content = '---\ntags: [invalid json\n---\nBody\n'
    const { attrs } = converterModule.parseFrontmatter(content)
    assert.equal(attrs.tags, '[invalid json')
  })

  it('parses plain string array items (non key:value)', () => {
    const content = '---\ntags:\n  - foo\n  - bar\n---\nBody\n'
    const { attrs } = converterModule.parseFrontmatter(content)
    assert.deepEqual(attrs.tags, ['foo', 'bar'])
  })

  it('serializes non-object array items', () => {
    const result = converterModule.serializeFrontmatter({ tags: ['a', 'b'] })
    assert.match(result, /tags:\n  - a\n  - b/)
  })

  it('detectFormat returns null for unknown extension', () => {
    assert.equal(converterModule.detectFormat('file.txt'), null)
    assert.equal(converterModule.detectFormat('data.json'), null)
  })

  it('mdcToSkill preserves mcp_servers from mdc', () => {
    const mdcContent = '---\ndescription: MCP skill\nalwaysApply: false\nmcp_servers:\n  - name: git\n    source: gh:git/mcp\n---\nBody\n'
    const result = converterModule.mdcToSkill(mdcContent, 'test.mdc')
    assert.match(result, /mcp_servers/)
    assert.match(result, /git/)
  })
})
