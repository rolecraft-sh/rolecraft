import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtempSync, mkdirSync, writeFileSync, symlinkSync,
} from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir, resolverModule

async function freshImport() {
  resolverModule = await import('./resolver.js')
}

describe('resolver', () => {
  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-resolver-test-'))
  })

  after(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('resolveSource', () => {
    it('throws for invalid source', async () => {
      await freshImport()
      await assert.rejects(
        () => resolverModule.resolveSource('invalid-format'),
        /Invalid source/,
      )
    })

    it('recognises local dot-path', async () => {
      await freshImport()
      const relDir = 'dot-local-skill'
      const absDir = join(process.cwd(), relDir)
      mkdirSync(absDir, { recursive: true })
      writeFileSync(join(absDir, 'SKILL.md'), '# slug: test/dot\nname: dot-path\nContent')

      const result = await resolverModule.resolveSource('./' + relDir)
      assert.equal(result.name, 'dot-path')
      assert.equal(result.sourceType, 'local')
      await rm(absDir, { recursive: true, force: true })
    })

    it('recognises absolute path', async () => {
      await freshImport()
      const skillDir = join(tempDir, 'abs-skill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'SKILL.md'), '# slug: test/abs\nname: abs-skill\nContent')

      const result = await resolverModule.resolveSource(skillDir)
      assert.equal(result.name, 'abs-skill')
    })
  })

  describe('resolveLocal', () => {
    it('resolves a SKILL.md file path', async () => {
      const skillDir = join(tempDir, 'file-skill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'SKILL.md'), '# slug: a/b\nname: file-skill\n# owner: someone\nData')

      const result = await resolverModule.resolveSource(join(skillDir, 'SKILL.md'))
      assert.equal(result.name, 'file-skill')
      assert.equal(result.slug, 'a/b')
      assert.equal(result.owner, 'someone')
      assert.equal(result.sourceType, 'local')
    })

    it('resolves a directory containing SKILL.md', async () => {
      const skillDir = join(tempDir, 'dir-skill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'SKILL.md'), '# slug: c/d\nname: dir-skill\nContent')

      const result = await resolverModule.resolveSource(skillDir)
      assert.equal(result.name, 'dir-skill')
    })

    it('throws for non-SKILL.md file', async () => {
      const p = join(tempDir, 'readme.txt')
      writeFileSync(p, 'hello')
      await assert.rejects(
        () => resolverModule.resolveSource(p),
        /Source must be a SKILL.md file or a directory containing one/,
      )
    })

    it('throws when no SKILL.md found in directory', async () => {
      const d = join(tempDir, 'empty-dir')
      mkdirSync(d, { recursive: true })
      await assert.rejects(
        () => resolverModule.resolveSource(d),
        /No SKILL.md found/,
      )
    })

    it('handles ~ expansion', async () => {
      const origHome = process.env.HOME
      process.env.HOME = tempDir
      await freshImport()

      const skillDir = join(tempDir, 'tilde-skill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'SKILL.md'), '# slug: t/tilde\nname: tilde-skill\nContent')

      const result = await resolverModule.resolveSource('~/tilde-skill')
      assert.equal(result.name, 'tilde-skill')
      process.env.HOME = origHome
    })

    it('scans subdirectories recursively', async () => {
      const parent = join(tempDir, 'parent')
      const nested = join(parent, 'sub', 'deep')
      mkdirSync(nested, { recursive: true })
      writeFileSync(join(nested, 'SKILL.md'), '# slug: x/nested\nname: nested-skill\nContent')

      const result = await resolverModule.resolveSource(parent)
      assert.equal(result.name, 'nested-skill')
    })

    it('skips .git directories during scan', async () => {
      const parent = join(tempDir, 'with-git')
      mkdirSync(join(parent, '.git'), { recursive: true })
      mkdirSync(join(parent, 'real'), { recursive: true })
      writeFileSync(join(parent, 'real', 'SKILL.md'), '# slug: r/real\nname: real-skill\nContent')

      const result = await resolverModule.resolveSource(parent)
      assert.equal(result.name, 'real-skill')
    })

    it('respects maxDepth in scan', async () => {
      const parent = join(tempDir, 'deep-parent')
      const tooDeep = join(parent, 'a', 'b', 'c', 'd')
      mkdirSync(tooDeep, { recursive: true })
      writeFileSync(join(tooDeep, 'SKILL.md'), '# slug: d/deep\nname: deep-skill\nContent')

      await assert.rejects(
        () => resolverModule.resolveSource(parent),
        /No SKILL.md found/,
      )
    })

    it('handles scan read errors gracefully', async () => {
      const parent = join(tempDir, 'bad-scan')
      mkdirSync(parent, { recursive: true })
      symlinkSync('/nonexistent-target', join(parent, 'SKILL.md'))

      await assert.rejects(
        () => resolverModule.resolveSource(parent),
        /No SKILL.md found/,
      )
    })

    it('handles unreadable directory during scan', async () => {
      const { chmodSync } = await import('node:fs')
      const parent = join(tempDir, 'partial-scan')
      mkdirSync(join(parent, 'good'), { recursive: true })
      mkdirSync(join(parent, 'locked'), { recursive: true })
      chmodSync(join(parent, 'locked'), 0o000)
      writeFileSync(join(parent, 'good', 'SKILL.md'), '# slug: s/good\nname: good\nContent')

      const result = await resolverModule.resolveSource(parent)
      assert.equal(result.name, 'good')

      chmodSync(join(parent, 'locked'), 0o755)
    })

    it('includes files list in result, excluding .git', async () => {
      const skillDir = join(tempDir, 'multi-file')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'SKILL.md'), '# slug: m/multi\nname: multi\nContent')
      writeFileSync(join(skillDir, 'helper.js'), 'x')
      writeFileSync(join(skillDir, 'config.json'), '{}')

      const result = await resolverModule.resolveSource(skillDir)
      assert.ok(result.files.includes('SKILL.md'))
      assert.ok(result.files.includes('helper.js'))
      assert.ok(result.files.includes('config.json'))
      assert.ok(!result.files.includes('.git'))
    })
  })

  describe('parseMetadata edge cases', () => {
    it('uses name from name field over slug-derived name', async () => {
      const d = join(tempDir, 'meta1')
      mkdirSync(d, { recursive: true })
      writeFileSync(join(d, 'SKILL.md'), '# slug: owner/name\nname: my-name\n# owner: me\nContent')
      const r = await resolverModule.resolveSource(d)
      assert.equal(r.name, 'my-name')
      assert.equal(r.slug, 'owner/name')
      assert.equal(r.owner, 'me')
    })

    it('derives name from slug when no explicit name', async () => {
      const d = join(tempDir, 'meta2')
      mkdirSync(d, { recursive: true })
      writeFileSync(join(d, 'SKILL.md'), '# slug: owner/name\nContent')
      const r = await resolverModule.resolveSource(d)
      assert.equal(r.name, 'name')
      assert.equal(r.slug, 'owner/name')
      assert.equal(r.owner, 'local')
    })

    it('defaults to unknown when no slug or name', async () => {
      const d = join(tempDir, 'meta3')
      mkdirSync(d, { recursive: true })
      writeFileSync(join(d, 'SKILL.md'), 'Some content without metadata')
      const r = await resolverModule.resolveSource(d)
      assert.equal(r.name, 'unknown')
      assert.equal(r.slug, 'unknown')
      assert.equal(r.owner, 'local')
    })
  })

  describe('resolveGitHub', () => {
    it('throws for invalid GitHub ref', async () => {
      await freshImport()
      await assert.rejects(
        () => resolverModule.resolveSource('a'),
        /Invalid source/,
      )
    })

    it('throws when GitHub clone fails', async () => {
      await freshImport()
      await assert.rejects(
        () => resolverModule.resolveSource('nonexistent-owner/nonexistent-repo'),
        /Failed to clone/,
      )
    })


  })
})
