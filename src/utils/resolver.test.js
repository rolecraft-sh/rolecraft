import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtempSync, mkdirSync, writeFileSync, symlinkSync,
} from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import { execSync, spawnSync } from 'node:child_process'

let tempDir, resolverModule

async function freshImport() {
  resolverModule = await import('./resolver.js')
  resolverModule.setExecSync(execSync)
  resolverModule.setSpawnSync(spawnSync)
  resolverModule.setHttpsGet((url, opts, cb) => {
    if (typeof opts === 'function') {
      cb = opts
    }
    const req = new EventEmitter()
    process.nextTick(() => {
      const res = new EventEmitter()
      res.statusCode = 200
      res.headers = {}
      res.resume = () => {}
      cb(res)
      process.nextTick(() => res.emit('end'))
    })
    return req
  })
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

    it('resolves a git SSH URL', async () => {
      await freshImport()
      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'git' && args[0] === 'clone') {
          const d = args[4]
          mkdirSync(d, { recursive: true })
          writeFileSync(join(d, 'SKILL.md'), '# slug: test/git-skill\nname: git-skill\nContent')
        }
        return { status: 0, stdout: '', stderr: '' }
      })
      const result = await resolverModule.resolveSource('git@github.com:owner/repo.git')
      assert.equal(result.name, 'git-skill')
      assert.equal(result.slug, 'test/git-skill')
      assert.equal(result.owner, 'remote')
      assert.equal(result.sourceType, 'git')
      assert.equal(result.sourcePath, 'git@github.com:owner/repo.git')
      assert.ok(result.files.includes('SKILL.md'))
    })

    it('throws when no SKILL.md found in git repo', async () => {
      await freshImport()
      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'git' && args[0] === 'clone') {
          const d = args[4]
          mkdirSync(d, { recursive: true })
          // Don't create SKILL.md
        }
        return { status: 0, stdout: '', stderr: '' }
      })
      await assert.rejects(
        () => resolverModule.resolveSource('git@github.com:owner/empty.git'),
        /No SKILL.md found/,
      )
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

    it('parses YAML frontmatter with --- delimiters', async () => {
      const d = join(tempDir, 'meta4')
      mkdirSync(d, { recursive: true })
      writeFileSync(join(d, 'SKILL.md'), `---
name: my-skill
slug: my-org/my-skill
owner: my-org
description: A test skill
---

Content here
`)
      const r = await resolverModule.resolveSource(d)
      assert.equal(r.name, 'my-skill')
      assert.equal(r.slug, 'my-org/my-skill')
      assert.equal(r.owner, 'my-org')
      assert.equal(r.description, 'A test skill')
    })

    it('parses YAML frontmatter without slug/owner (falls back to defaults)', async () => {
      const d = join(tempDir, 'meta5')
      mkdirSync(d, { recursive: true })
      writeFileSync(join(d, 'SKILL.md'), `---
name: simple-skill
---

Just content
`)
      const r = await resolverModule.resolveSource(d)
      assert.equal(r.name, 'simple-skill')
      assert.equal(r.slug, 'simple-skill')
      assert.equal(r.owner, 'local')
      assert.equal(r.description, undefined)
    })
  })

  describe('resolveSkills', () => {
    it('returns all skills from a multi-skill local source', async () => {
      const multiDir = join(tempDir, 'multi-skill')
      const engDir = join(multiDir, 'skills', 'engineering', 'skill-a')
      const prodDir = join(multiDir, 'skills', 'productivity', 'skill-b')
      mkdirSync(engDir, { recursive: true })
      mkdirSync(prodDir, { recursive: true })
      writeFileSync(join(engDir, 'SKILL.md'), '---\nname: skill-a\nslug: eng/skill-a\nowner: tester\ndescription: First skill\n---\nContent A')
      writeFileSync(join(prodDir, 'SKILL.md'), '---\nname: skill-b\nslug: prod/skill-b\nowner: tester\ndescription: Second skill\n---\nContent B')
      writeFileSync(join(engDir, 'helper.js'), 'x')

      const result = await resolverModule.resolveSkills(multiDir)

      assert.equal(result.length, 2)
      assert.ok(result.some(s => s.name === 'skill-a'))
      assert.ok(result.some(s => s.name === 'skill-b'))
      const skillA = result.find(s => s.name === 'skill-a')
      assert.ok(skillA.files.includes('SKILL.md'))
      assert.ok(skillA.files.includes('helper.js'))
      assert.equal(skillA.owner, 'tester')
      assert.equal(skillA.sourceType, 'local')
    })

    it('resolveSkills from single-skill source returns array of 1', async () => {
      const singleDir = join(tempDir, 'single-resolve-skills')
      mkdirSync(singleDir, { recursive: true })
      writeFileSync(join(singleDir, 'SKILL.md'), '---\nname: solo\ndescription: A lone skill\n---\nContent')

      const result = await resolverModule.resolveSkills(singleDir)

      assert.equal(result.length, 1)
      assert.equal(result[0].name, 'solo')
      assert.equal(result[0].sourceType, 'local')
    })

    it('resolveSkills from GitHub returns all skills', async () => {
      await freshImport()
      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'git' && args[0] === 'clone') {
          const d = args[4]
          mkdirSync(join(d, 'skills', 'alpha'), { recursive: true })
          mkdirSync(join(d, 'skills', 'beta'), { recursive: true })
          writeFileSync(join(d, 'skills', 'alpha', 'SKILL.md'), '---\nname: alpha\nslug: gh/alpha\ndescription: Alpha\n---\nA')
          writeFileSync(join(d, 'skills', 'beta', 'SKILL.md'), '---\nname: beta\nslug: gh/beta\ndescription: Beta\n---\nB')
        }
        return { status: 0, stdout: '', stderr: '' }
      })

      const result = await resolverModule.resolveSkills('user/multi-repo')

      assert.equal(result.length, 2)
      assert.ok(result.some(s => s.name === 'alpha'))
      assert.ok(result.some(s => s.name === 'beta'))
      for (const s of result) {
        assert.equal(s.owner, 'user')
        assert.equal(s.sourceType, 'github')
      }
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

    it('resolves a GitHub repo successfully', async () => {
      await freshImport()
      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'git' && args[0] === 'clone') {
          const d = args[4]
          mkdirSync(d, { recursive: true })
          writeFileSync(join(d, 'SKILL.md'), '# slug: test/skill\nname: test-skill\nContent')
          writeFileSync(join(d, 'helper.js'), 'x')
          try { symlinkSync('/nonexistent-target', join(d, 'broken.txt')) } catch {}
        }
        return { status: 0, stdout: '', stderr: '' }
      })

      const result = await resolverModule.resolveSource('user/repo')

      assert.equal(result.name, 'test-skill')
      assert.equal(result.slug, 'test/skill')
      assert.equal(result.owner, 'user')
      assert.equal(result.sourceType, 'github')
      assert.equal(result.sourcePath, 'user/repo')
      assert.ok(result.files.includes('SKILL.md'))
      assert.ok(result.files.includes('helper.js'))
      assert.ok(result.fileContents)
    })

    it('throws when no SKILL.md found in cloned repo', async () => {
      await freshImport()
      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'git' && args[0] === 'clone') {
          const d = args[4]
          mkdirSync(d, { recursive: true })
          writeFileSync(join(d, 'README.md'), 'no skill here')
        }
        return { status: 0, stdout: '', stderr: '' }
      })

      await assert.rejects(
        () => resolverModule.resolveSource('user/no-skill'),
        /No SKILL.md found/,
      )
    })


  })

  describe('resolveNpm', () => {
    let origFetch

    function mockHttps(resolver) {
      resolver.setHttpsGet((...args) => {
        const cb = args[args.length - 1]
        const req = new EventEmitter()

        process.nextTick(() => {
          const res = new EventEmitter()
          res.statusCode = 200
          res.headers = {}
          res.resume = () => {}

          cb(res)

          // Single call: metadata fetch
          const data = Buffer.from(JSON.stringify({
            'dist-tags': { latest: '1.0.0' },
            versions: {
              '1.0.0': {
                dist: { tarball: 'https://registry.npmjs.org/test-pkg/-/test-pkg-1.0.0.tgz' },
              },
            },
          }))
          res.emit('data', data)
          res.emit('end')
        })

        return req
      })
    }

    function mockFetch() {
      origFetch = globalThis.fetch
      globalThis.fetch = async () => {
        const readable = Readable.from([Buffer.from('fake-tarball')])
        return {
          ok: true,
          status: 200,
          body: Readable.toWeb(readable),
        }
      }
    }

    function restoreFetch() {
      if (origFetch) globalThis.fetch = origFetch
    }

    async function withMockFetch(fn) {
      mockFetch()
      try {
        await fn()
      } finally {
        restoreFetch()
      }
    }

    it('resolves an npm package', async () => {
      await freshImport()
      mockHttps(resolverModule)

      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'tar' && args[0] === '-xzf') {
          const extractDir = args[3]
          const packageDir = join(extractDir, 'package')
          mkdirSync(packageDir, { recursive: true })
          writeFileSync(join(packageDir, 'SKILL.md'), '# slug: test/npm-skill\nname: npm-skill\nContent')
          writeFileSync(join(packageDir, 'helper.js'), 'x')
        }
        return { status: 0, stdout: '', stderr: '' }
      })

      await withMockFetch(async () => {
        const result = await resolverModule.resolveSource('npm:test-pkg')

        assert.equal(result.name, 'npm-skill')
        assert.equal(result.slug, 'test/npm-skill')
        assert.equal(result.owner, 'test-pkg')
        assert.equal(result.sourceType, 'npm')
        assert.equal(result.sourcePath, 'npm:test-pkg')
        assert.ok(result.files.includes('SKILL.md'))
        assert.ok(result.files.includes('helper.js'))
        assert.ok(result.fileContents)
      })
    })

    it('resolves an npm package with version', async () => {
      await freshImport()
      mockHttps(resolverModule)

      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'tar' && args[0] === '-xzf') {
          const extractDir = args[3]
          const packageDir = join(extractDir, 'package')
          mkdirSync(packageDir, { recursive: true })
          writeFileSync(join(packageDir, 'SKILL.md'), '---\nname: my-skill\nslug: org/skill\n---\nContent')
        }
        return { status: 0, stdout: '', stderr: '' }
      })

      await withMockFetch(async () => {
        const result = await resolverModule.resolveSource('npm:test-pkg@1.0.0')

        assert.equal(result.name, 'my-skill')
        assert.equal(result.slug, 'org/skill')
        assert.equal(result.sourceType, 'npm')
      })
    })

    it('resolves scoped npm package', async () => {
      await freshImport()
      mockHttps(resolverModule)

      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'tar' && args[0] === '-xzf') {
          const extractDir = args[3]
          const packageDir = join(extractDir, 'package')
          mkdirSync(packageDir, { recursive: true })
          writeFileSync(join(packageDir, 'SKILL.md'), '# slug: s/skill\nname: scoped-skill\nContent')
        }
        return { status: 0, stdout: '', stderr: '' }
      })

      await withMockFetch(async () => {
        const result = await resolverModule.resolveSource('npm:@scope/test-pkg')

        assert.equal(result.name, 'scoped-skill')
        assert.equal(result.sourceType, 'npm')
      })
    })

    it('throws when no SKILL.md found in npm package', async () => {
      await freshImport()
      mockHttps(resolverModule)

      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'tar' && args[0] === '-xzf') {
          const extractDir = args[3]
          mkdirSync(join(extractDir, 'package'), { recursive: true })
          writeFileSync(join(extractDir, 'package', 'README.md'), 'no skill here')
        }
        return { status: 0, stdout: '', stderr: '' }
      })

      await withMockFetch(async () => {
        await assert.rejects(
          () => resolverModule.resolveSource('npm:test-pkg'),
          /No SKILL.md found/,
        )
      })
    })

    it('throws for invalid npm ref', async () => {
      await freshImport()
      mockHttps(resolverModule)

      await assert.rejects(
        () => resolverModule.resolveSource('npm:'),
        /Invalid npm reference/,
      )
    })

    it('throws when npm registry returns non-200', async () => {
      await freshImport()
      resolverModule.setHttpsGet((...args) => {
        const cb = args[args.length - 1]
        const req = new EventEmitter()
        process.nextTick(() => {
          const res = new EventEmitter()
          res.statusCode = 404
          res.headers = {}
          res.resume = () => {}
          cb(res)
          res.emit('end')
        })
        return req
      })
      await assert.rejects(
        () => resolverModule.resolveSource('npm:test-pkg'),
        /Failed to fetch npm package/,
      )
    })

    it('throws when tarball download returns non-200', async () => {
      await freshImport()
      mockHttps(resolverModule)
      mockFetch()
      globalThis.fetch = async () => ({
        ok: false,
        status: 500,
      })
      await assert.rejects(
        () => resolverModule.resolveSource('npm:test-pkg'),
        /Failed to download/,
      )
      restoreFetch()
    })

    it('throws when dist-tags.latest is missing', async () => {
      await freshImport()
      resolverModule.setHttpsGet((...args) => {
        const cb = args[args.length - 1]
        const req = new EventEmitter()
        process.nextTick(() => {
          const res = new EventEmitter()
          res.statusCode = 200
          res.headers = {}
          res.resume = () => {}
          cb(res)
          res.emit('data', Buffer.from(JSON.stringify({
            'dist-tags': {},
            versions: {},
          })))
          res.emit('end')
        })
        return req
      })
      await assert.rejects(
        () => resolverModule.resolveSource('npm:test-pkg'),
        /No "latest" tag found/,
      )
    })

    it('throws when version not found in versions', async () => {
      await freshImport()
      resolverModule.setHttpsGet((...args) => {
        const cb = args[args.length - 1]
        const req = new EventEmitter()
        process.nextTick(() => {
          const res = new EventEmitter()
          res.statusCode = 200
          res.headers = {}
          res.resume = () => {}
          cb(res)
          res.emit('data', Buffer.from(JSON.stringify({
            'dist-tags': { latest: '2.0.0' },
            versions: {},
          })))
          res.emit('end')
        })
        return req
      })
      await assert.rejects(
        () => resolverModule.resolveSource('npm:test-pkg'),
        /Version "2.0.0" not found/,
      )
    })

    it('resolves scoped npm package with version', async () => {
      await freshImport()
      mockHttps(resolverModule)
      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'tar' && args[0] === '-xzf') {
          const extractDir = args[3]
          const packageDir = join(extractDir, 'package')
          mkdirSync(packageDir, { recursive: true })
          writeFileSync(join(packageDir, 'SKILL.md'), '# slug: s/skill\nname: scoped-version-skill\nContent')
        }
        return { status: 0, stdout: '', stderr: '' }
      })
      await withMockFetch(async () => {
        const result = await resolverModule.resolveSource('npm:@scope/test-pkg@1.0.0')
        assert.equal(result.name, 'scoped-version-skill')
        assert.equal(result.sourceType, 'npm')
      })
    })
  })

  describe('isGitUrl', () => {
    it('detects GitLab HTTPS URL', async () => {
      await freshImport()
      resolverModule.setSpawnSync(() => { throw new Error('mock') })
      await assert.rejects(
        () => resolverModule.resolveSource('https://gitlab.com/owner/repo'),
        /Failed to clone/,
      )
    })

    it('detects Bitbucket HTTPS URL', async () => {
      await freshImport()
      resolverModule.setSpawnSync(() => { throw new Error('mock') })
      await assert.rejects(
        () => resolverModule.resolveSource('https://bitbucket.com/owner/repo'),
        /Failed to clone/,
      )
    })

    it('detects SSH git URL', async () => {
      await freshImport()
      resolverModule.setSpawnSync(() => { throw new Error('mock') })
      await assert.rejects(
        () => resolverModule.resolveSource('git@github.com:owner/repo.git'),
        /Failed to clone/,
      )
    })

    it('detects generic HTTPS git URL', async () => {
      await freshImport()
      resolverModule.setSpawnSync(() => { throw new Error('mock') })
      await assert.rejects(
        () => resolverModule.resolveSource('https://example.com/owner/repo.git'),
        /Failed to clone/,
      )
    })

    it('rejects invalid URL as not a git URL', async () => {
      await freshImport()
      await assert.rejects(
        () => resolverModule.resolveSource('not-a-git-url'),
        /Invalid source/,
      )
    })
  })

  describe('normalizeGitUrl', () => {
    it('converts SSH URL to HTTPS', async () => {
      await freshImport()
      let cloneUrl
      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'git' && args[0] === 'clone') {
          cloneUrl = args[3]
        }
        throw new Error('mock')
      })
      await assert.rejects(
        () => resolverModule.resolveSource('git@github.com:owner/repo.git'),
        /Failed to clone/,
      )
      assert.equal(cloneUrl, 'https://github.com/owner/repo.git')
    })

    it('passes HTTPS URL through unchanged', async () => {
      await freshImport()
      let cloneUrl
      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'git' && args[0] === 'clone') {
          cloneUrl = args[3]
        }
        throw new Error('mock')
      })
      await assert.rejects(
        () => resolverModule.resolveSource('https://gitlab.com/owner/repo'),
        /Failed to clone/,
      )
      assert.equal(cloneUrl, 'https://gitlab.com/owner/repo')
    })
  })
})
