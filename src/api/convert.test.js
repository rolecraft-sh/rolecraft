import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { convertApi } from './convert.js'

let tempDir

before(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-convert-test-'))
})

after(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe('convertApi', () => {
  it('converts a SKILL.md file to .mdc', async () => {
    const skillContent =
      '---\nname: test-skill\nslug: org/test-skill\ndescription: A test skill\n---\n\n# Test Skill\n\nSome instructions.\n'
    const skillPath = join(tempDir, 'SKILL.md')
    await writeFile(skillPath, skillContent)

    const result = await convertApi(skillPath, { output: tempDir })

    const outPath = join(tempDir, 'org-test-skill.mdc')
    assert.deepEqual(result, [
      { from: skillPath, to: outPath, format: 'skill-to-mdc' },
    ])
    const outContent = readFileSync(outPath, 'utf-8')
    assert.match(outContent, /description: A test skill/)
    assert.match(outContent, /alwaysApply: false/)
  })

  it('converts an .mdc file to SKILL.md', async () => {
    const mdcContent =
      '---\ndescription: My rule\nalwaysApply: false\nglobs: src/**/*.ts\n---\n\n# My Rule\n\nDo not use any.\n'
    const mdcPath = join(tempDir, 'my-rule.mdc')
    await writeFile(mdcPath, mdcContent)

    const result = await convertApi(mdcPath, { output: tempDir })

    const outPath = join(tempDir, 'SKILL.md')
    assert.equal(result.length, 1)
    assert.equal(result[0].format, 'mdc-to-skill')
    assert.equal(result[0].to, outPath)
    assert.match(readFileSync(outPath, 'utf-8'), /name: My rule/)
  })

  it('converts a directory containing a SKILL.md', async () => {
    const skillDir = join(tempDir, 'dir-skill-src')
    await mkdir(skillDir, { recursive: true })
    await writeFile(
      join(skillDir, 'SKILL.md'),
      '---\nname: dir-skill\nslug: dir-skill\n---\n\nBody\n',
    )

    const result = await convertApi(skillDir, { output: tempDir })

    assert.equal(result.length, 1)
    assert.equal(result[0].format, 'skill-to-mdc')
    assert.ok(existsSync(join(tempDir, 'dir-skill.mdc')))
  })

  it('converts a directory containing multiple .mdc files', async () => {
    const mdcDir = join(tempDir, 'rules')
    await mkdir(mdcDir, { recursive: true })
    await writeFile(
      join(mdcDir, 'rule1.mdc'),
      '---\ndescription: Rule 1\nalwaysApply: false\n---\nContent 1\n',
    )
    await writeFile(
      join(mdcDir, 'rule2.mdc'),
      '---\ndescription: Rule 2\nalwaysApply: false\n---\nContent 2\n',
    )

    const result = await convertApi(mdcDir, { output: tempDir })

    assert.equal(result.length, 2)
    assert.ok(result.every((r) => r.format === 'mdc-to-skill'))
  })

  it('dry-run returns a plan without writing the file', async () => {
    const skillPath = join(tempDir, 'dry-SKILL.md')
    await writeFile(skillPath, '---\nname: dry\nslug: dry\n---\nBody\n')

    const result = await convertApi(skillPath, {
      dryRun: true,
      output: tempDir,
    })

    assert.deepEqual(result, [
      {
        dryRun: true,
        from: skillPath,
        to: join(tempDir, 'dry.mdc'),
      },
    ])
    assert.ok(!existsSync(join(tempDir, 'dry.mdc')))
  })

  it('detects skill format by content when the filename is ambiguous', async () => {
    const ambiguousPath = join(tempDir, 'rules.txt')
    await writeFile(
      ambiguousPath,
      '---\nname: test-skill\nslug: sniffed-skill\n---\n\nBody\n',
    )

    const result = await convertApi(ambiguousPath, { output: tempDir })

    assert.equal(result.length, 1)
    assert.equal(result[0].format, 'skill-to-mdc')
    assert.ok(existsSync(join(tempDir, 'sniffed-skill.mdc')))
  })

  it('detects mdc format by content when the filename is ambiguous', async () => {
    const ambiguousPath = join(tempDir, 'rules2.txt')
    await writeFile(
      ambiguousPath,
      '---\ndescription: My rule\nalwaysApply: true\n---\n\n# Rule\n',
    )

    const result = await convertApi(ambiguousPath, { output: tempDir })

    assert.equal(result.length, 1)
    assert.equal(result[0].format, 'mdc-to-skill')
    assert.match(readFileSync(join(tempDir, 'SKILL.md'), 'utf-8'), /My rule/)
  })

  it('rejects an empty source file', async () => {
    const emptyPath = join(tempDir, 'empty-SKILL.md')
    await writeFile(emptyPath, '')

    await assert.rejects(
      () => convertApi(emptyPath, { output: tempDir }),
      /Source is empty:/,
    )
  })

  it('rejects a nonexistent source', async () => {
    await assert.rejects(
      () => convertApi(join(tempDir, 'nonexistent'), { output: tempDir }),
      /Source not found:/,
    )
  })

  it('rejects a file with ambiguous name and no recognizable content', async () => {
    const ambiguousPath = join(tempDir, 'data.bin')
    await writeFile(ambiguousPath, 'some random binary data\n')

    await assert.rejects(
      () => convertApi(ambiguousPath, { output: tempDir }),
      /Cannot detect format\./,
    )
  })

  it('rejects a directory with no SKILL.md or .mdc files', async () => {
    const emptyDir = join(tempDir, 'empty-dir')
    await mkdir(emptyDir, { recursive: true })

    await assert.rejects(
      () => convertApi(emptyDir, { output: tempDir }),
      /No SKILL.md or .mdc files found/,
    )
  })
})
