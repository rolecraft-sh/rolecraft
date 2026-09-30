import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from 'node:fs'
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
  resolverModule.setHttpsGet((_url, opts, cb) => {
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
      writeFileSync(
        join(absDir, 'SKILL.md'),
        '# slug: test/dot\nname: dot-path\nContent',
      )

      const result = await resolverModule.resolveSource(`./${relDir}`)
      assert.equal(result.name, 'dot-path')
      assert.equal(result.sourceType, 'local')
      await rm(absDir, { recursive: true, force: true })
    })

    it('recognises absolute path', async () => {
      await freshImport()
      const skillDir = join(tempDir, 'abs-skill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(
        join(skillDir, 'SKILL.md'),
        '# slug: test/abs\nname: abs-skill\nContent',
      )

      const result = await resolverModule.resolveSource(skillDir)
      assert.equal(result.name, 'abs-skill')
    })

    it('resolves a git SSH URL', async () => {
      await freshImport()
      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'git' && args[0] === 'clone') {
          const d = args[4]
          mkdirSync(d, { recursive: true })
          writeFileSync(
            join(d, 'SKILL.md'),
            '# slug: test/git-skill\nname: git-skill\nContent',
          )
        }
        return { status: 0, stdout: '', stderr: '' }
      })
      const result = await resolverModule.resolveSource(
        'git@github.com:owner/repo.git',
      )
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
      writeFileSync(
        join(skillDir, 'SKILL.md'),
        '# slug: a/b\nname: file-skill\n# owner: someone\nData',
      )

      const result = await resolverModule.resolveSource(
        join(skillDir, 'SKILL.md'),
      )
      assert.equal(result.name, 'file-skill')
      assert.equal(result.slug, 'a/b')
      assert.equal(result.owner, 'someone')
      assert.equal(result.sourceType, 'local')
    })

    it('resolves a directory containing SKILL.md', async () => {
      const skillDir = join(tempDir, 'dir-skill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(
        join(skillDir, 'SKILL.md'),
        '# slug: c/d\nname: dir-skill\nContent',
      )

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
      writeFileSync(
        join(skillDir, 'SKILL.md'),
        '# slug: t/tilde\nname: tilde-skill\nContent',
      )

      const result = await resolverModule.resolveSource('~/tilde-skill')
      assert.equal(result.name, 'tilde-skill')
      process.env.HOME = origHome
    })

    it('scans subdirectories recursively', async () => {
      const parent = join(tempDir, 'parent')
      const nested = join(parent, 'sub', 'deep')
      mkdirSync(nested, { recursive: true })
      writeFileSync(
        join(nested, 'SKILL.md'),
        '# slug: x/nested\nname: nested-skill\nContent',
      )

      const result = await resolverModule.resolveSource(parent)
      assert.equal(result.name, 'nested-skill')
    })

    it('skips .git directories during scan', async () => {
      const parent = join(tempDir, 'with-git')
      mkdirSync(join(parent, '.git'), { recursive: true })
      mkdirSync(join(parent, 'real'), { recursive: true })
      writeFileSync(
        join(parent, 'real', 'SKILL.md'),
        '# slug: r/real\nname: real-skill\nContent',
      )

      const result = await resolverModule.resolveSource(parent)
      assert.equal(result.name, 'real-skill')
    })

    it('respects maxDepth in scan', async () => {
      const parent = join(tempDir, 'deep-parent')
      const tooDeep = join(parent, 'a', 'b', 'c', 'd')
      mkdirSync(tooDeep, { recursive: true })
      writeFileSync(
        join(tooDeep, 'SKILL.md'),
        '# slug: d/deep\nname: deep-skill\nContent',
      )

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
      writeFileSync(
        join(parent, 'good', 'SKILL.md'),
        '# slug: s/good\nname: good\nContent',
      )

      const result = await resolverModule.resolveSource(parent)
      assert.equal(result.name, 'good')

      chmodSync(join(parent, 'locked'), 0o755)
    })

    it('includes files list in result, excluding .git', async () => {
      const skillDir = join(tempDir, 'multi-file')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(
        join(skillDir, 'SKILL.md'),
        '# slug: m/multi\nname: multi\nContent',
      )
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
      writeFileSync(
        join(d, 'SKILL.md'),
        '# slug: owner/name\nname: my-name\n# owner: me\nContent',
      )
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
      writeFileSync(
        join(d, 'SKILL.md'),
        `---
name: my-skill
slug: my-org/my-skill
owner: my-org
description: A test skill
---

Content here
`,
      )
      const r = await resolverModule.resolveSource(d)
      assert.equal(r.name, 'my-skill')
      assert.equal(r.slug, 'my-org/my-skill')
      assert.equal(r.owner, 'my-org')
      assert.equal(r.description, 'A test skill')
    })

    it('parses YAML frontmatter without slug/owner (falls back to defaults)', async () => {
      const d = join(tempDir, 'meta5')
      mkdirSync(d, { recursive: true })
      writeFileSync(
        join(d, 'SKILL.md'),
        `---
name: simple-skill
---

Just content
`,
      )
      const r = await resolverModule.resolveSource(d)
      assert.equal(r.name, 'simple-skill')
      assert.equal(r.slug, 'simple-skill')
      assert.equal(r.owner, 'local')
      assert.equal(r.description, undefined)
    })

    it('parses metadata.category from YAML frontmatter', async () => {
      const d = join(tempDir, 'meta6')
      mkdirSync(d, { recursive: true })
      writeFileSync(
        join(d, 'SKILL.md'),
        `---
name: cat-skill
slug: cat-skill
metadata:
  category: development
---

Content
`,
      )
      const r = await resolverModule.resolveSource(d)
      assert.equal(r.category, 'development')
    })

    it('returns undefined category when not in frontmatter', async () => {
      const d = join(tempDir, 'meta7')
      mkdirSync(d, { recursive: true })
      writeFileSync(
        join(d, 'SKILL.md'),
        `---
name: no-cat
slug: no-cat
---

Content
`,
      )
      const r = await resolverModule.resolveSource(d)
      assert.equal(r.category, undefined)
    })
  })

  describe('resolveSkills', () => {
    it('returns all skills from a multi-skill local source', async () => {
      const multiDir = join(tempDir, 'multi-skill')
      const engDir = join(multiDir, 'skills', 'engineering', 'skill-a')
      const prodDir = join(multiDir, 'skills', 'productivity', 'skill-b')
      mkdirSync(engDir, { recursive: true })
      mkdirSync(prodDir, { recursive: true })
      writeFileSync(
        join(engDir, 'SKILL.md'),
        '---\nname: skill-a\nslug: eng/skill-a\nowner: tester\ndescription: First skill\n---\nContent A',
      )
      writeFileSync(
        join(prodDir, 'SKILL.md'),
        '---\nname: skill-b\nslug: prod/skill-b\nowner: tester\ndescription: Second skill\n---\nContent B',
      )
      writeFileSync(join(engDir, 'helper.js'), 'x')

      const result = await resolverModule.resolveSkills(multiDir)

      assert.equal(result.length, 2)
      assert.ok(result.some((s) => s.name === 'skill-a'))
      assert.ok(result.some((s) => s.name === 'skill-b'))
      const skillA = result.find((s) => s.name === 'skill-a')
      assert.ok(skillA.files.includes('SKILL.md'))
      assert.ok(skillA.files.includes('helper.js'))
      assert.equal(skillA.owner, 'tester')
      assert.equal(skillA.sourceType, 'local')
    })

    it('resolveSkills from single-skill source returns array of 1', async () => {
      const singleDir = join(tempDir, 'single-resolve-skills')
      mkdirSync(singleDir, { recursive: true })
      writeFileSync(
        join(singleDir, 'SKILL.md'),
        '---\nname: solo\ndescription: A lone skill\n---\nContent',
      )

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
          writeFileSync(
            join(d, 'skills', 'alpha', 'SKILL.md'),
            '---\nname: alpha\nslug: gh/alpha\ndescription: Alpha\n---\nA',
          )
          writeFileSync(
            join(d, 'skills', 'beta', 'SKILL.md'),
            '---\nname: beta\nslug: gh/beta\ndescription: Beta\n---\nB',
          )
        }
        return { status: 0, stdout: '', stderr: '' }
      })

      const result = await resolverModule.resolveSkills('user/multi-repo')

      assert.equal(result.length, 2)
      assert.ok(result.some((s) => s.name === 'alpha'))
      assert.ok(result.some((s) => s.name === 'beta'))
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
        () =>
          resolverModule.resolveSource('nonexistent-owner/nonexistent-repo'),
        /Could not download/,
      )
    })

    it('resolves a GitHub repo successfully', async () => {
      await freshImport()
      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'git' && args[0] === 'clone') {
          const d = args[4]
          writeFileSync(
            join(d, 'SKILL.md'),
            '# slug: test/skill\nname: test-skill\nContent',
          )
          writeFileSync(join(d, 'helper.js'), 'x')
          try {
            symlinkSync('/nonexistent-target', join(d, 'broken.txt'))
          } catch {}
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
          const data = Buffer.from(
            JSON.stringify({
              'dist-tags': { latest: '1.0.0' },
              versions: {
                '1.0.0': {
                  dist: {
                    tarball:
                      'https://registry.npmjs.org/test-pkg/-/test-pkg-1.0.0.tgz',
                  },
                },
              },
            }),
          )
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

    function redirectResponse(location) {
      return {
        ok: false,
        status: 302,
        headers: new Headers(location ? { location } : {}),
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
          writeFileSync(
            join(packageDir, 'SKILL.md'),
            '# slug: test/npm-skill\nname: npm-skill\nContent',
          )
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
          writeFileSync(
            join(packageDir, 'SKILL.md'),
            '---\nname: my-skill\nslug: org/skill\n---\nContent',
          )
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
          writeFileSync(
            join(packageDir, 'SKILL.md'),
            '# slug: s/skill\nname: scoped-skill\nContent',
          )
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
          writeFileSync(
            join(extractDir, 'package', 'README.md'),
            'no skill here',
          )
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
        /Could not fetch npm package/,
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
        /Could not process npm package/,
      )
      restoreFetch()
    })

    it('rejects npm tarball redirects to hosts outside the allow list', async () => {
      await freshImport()
      mockHttps(resolverModule)
      const originalFetch = globalThis.fetch
      const calls = []
      let tarInvoked = false
      resolverModule.setSpawnSync((cmd) => {
        if (cmd === 'tar') tarInvoked = true
        return { status: 0, stdout: '', stderr: '' }
      })
      globalThis.fetch = async (url, options) => {
        calls.push({ url, options })
        return redirectResponse('https://evil.example.com/package.tgz')
      }

      try {
        await assert.rejects(
          () => resolverModule.resolveSource('npm:test-pkg'),
          (err) =>
            err.userCode === 'NPM_TARBALL_HOST_NOT_ALLOWED' &&
            // The refusal names the host that was actually refused, rather than
            // hiding it behind "the package may be corrupted".
            err.message.includes('evil.example.com'),
        )
        assert.equal(tarInvoked, false)
        assert.deepEqual(
          calls.map((call) => call.url),
          ['https://registry.npmjs.org/test-pkg/-/test-pkg-1.0.0.tgz'],
        )
        assert.equal(calls[0].options.redirect, 'manual')
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('follows npm tarball redirects that stay on the allowed host', async () => {
      await freshImport()
      mockHttps(resolverModule)
      const originalFetch = globalThis.fetch
      const calls = []
      globalThis.fetch = async (url, options) => {
        calls.push({ url, options })
        if (calls.length === 1)
          return redirectResponse('/redirected/package.tgz')
        if (calls.length === 2) return redirectResponse('/final/package.tgz')
        const readable = Readable.from([Buffer.from('fake-tarball')])
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          body: Readable.toWeb(readable),
        }
      }
      resolverModule.setSpawnSync((cmd, args) => {
        if (cmd === 'tar' && args[0] === '-xzf') {
          const extractDir = args[3]
          const packageDir = join(extractDir, 'package')
          mkdirSync(packageDir, { recursive: true })
          writeFileSync(
            join(packageDir, 'SKILL.md'),
            '# slug: test/npm-skill\nname: npm-skill\nContent',
          )
        }
        return { status: 0, stdout: '', stderr: '' }
      })

      try {
        const result = await resolverModule.resolveSource('npm:test-pkg')
        assert.equal(result.name, 'npm-skill')
        assert.deepEqual(
          calls.map((call) => call.url),
          [
            'https://registry.npmjs.org/test-pkg/-/test-pkg-1.0.0.tgz',
            'https://registry.npmjs.org/redirected/package.tgz',
            'https://registry.npmjs.org/final/package.tgz',
          ],
        )
        assert.ok(calls.every((call) => call.options.redirect === 'manual'))
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('rejects unsafe, malformed, and unbounded npm tarball redirects before extraction', async () => {
      const cases = [
        [
          'http://registry.npmjs.org/package.tgz',
          'NPM_TARBALL_HOST_NOT_ALLOWED',
        ],
        [
          'https://registry.npmjs.org:8443/package.tgz',
          'NPM_TARBALL_HOST_NOT_ALLOWED',
        ],
        ['http://[::1', 'NPM_TARBALL_REDIRECT_INVALID'],
        [null, 'NPM_TARBALL_REDIRECT_INVALID'],
      ]

      for (const [location, userCode] of cases) {
        await freshImport()
        mockHttps(resolverModule)
        const originalFetch = globalThis.fetch
        let tarInvoked = false
        resolverModule.setSpawnSync((cmd) => {
          if (cmd === 'tar') tarInvoked = true
          return { status: 0, stdout: '', stderr: '' }
        })
        globalThis.fetch = async () => redirectResponse(location)
        try {
          await assert.rejects(
            () => resolverModule.resolveSource('npm:test-pkg'),
            (err) => err.userCode === userCode,
          )
          assert.equal(tarInvoked, false)
        } finally {
          globalThis.fetch = originalFetch
        }
      }

      await freshImport()
      mockHttps(resolverModule)
      const originalFetch = globalThis.fetch
      let calls = 0
      globalThis.fetch = async () => {
        calls++
        return redirectResponse('/loop/package.tgz')
      }
      try {
        await assert.rejects(
          () => resolverModule.resolveSource('npm:test-pkg'),
          (err) => err.userCode === 'NPM_TARBALL_REDIRECT_LIMIT',
        )
        assert.equal(calls, 4)
      } finally {
        globalThis.fetch = originalFetch
      }
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
          res.emit(
            'data',
            Buffer.from(
              JSON.stringify({
                'dist-tags': {},
                versions: {},
              }),
            ),
          )
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
          res.emit(
            'data',
            Buffer.from(
              JSON.stringify({
                'dist-tags': { latest: '2.0.0' },
                versions: {},
              }),
            ),
          )
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
          writeFileSync(
            join(packageDir, 'SKILL.md'),
            '# slug: s/skill\nname: scoped-version-skill\nContent',
          )
        }
        return { status: 0, stdout: '', stderr: '' }
      })
      await withMockFetch(async () => {
        const result = await resolverModule.resolveSource(
          'npm:@scope/test-pkg@1.0.0',
        )
        assert.equal(result.name, 'scoped-version-skill')
        assert.equal(result.sourceType, 'npm')
      })
    })
    describe('tarball redirects', () => {
      const TARBALL = 'https://registry.npmjs.org/test-pkg/-/test-pkg-1.0.0.tgz'
      const EVIL = 'https://evil.example.com/payload.tgz'

      let savedFetch = null
      let tarCalls = []

      function tarballResponse() {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          body: Readable.toWeb(Readable.from([Buffer.from('fake-tarball')])),
        }
      }

      function redirectTo(location) {
        return {
          ok: false,
          status: 302,
          headers: new Headers(location ? { location } : {}),
          body: Readable.toWeb(Readable.from([])),
        }
      }

      const isRedirectStatus = (status) => status >= 300 && status < 400

      // Response-shaped objects keyed by URL, recording every request actually
      // made so a test can prove an off-host hop was never even attempted.
      function stubFetch(routes) {
        const calls = []
        savedFetch = globalThis.fetch

        const respond = async (url) => {
          const handler = routes[url]
          if (!handler) throw new Error(`unexpected fetch to ${url}`)
          return handler()
        }

        globalThis.fetch = async (url, options) => {
          calls.push({ url, options })

          // Stands in for the behaviour that made this exploitable: a fetch that
          // is not told to stop follows Location itself, so a caller which drops
          // the guard quietly ends up downloading from the redirect target. Only
          // `redirect: 'manual'` hands that decision back to the caller.
          let target = url
          let res = await respond(target)

          for (
            let hop = 0;
            hop < 10 &&
            options?.redirect !== 'manual' &&
            isRedirectStatus(res.status) &&
            res.headers.get('location');
            hop++
          ) {
            target = new URL(res.headers.get('location'), target).toString()
            calls.push({ url: target, options })
            res = await respond(target)
          }

          return res
        }

        return calls
      }

      // Records every tar invocation. A refused download must never reach
      // extraction, and `tar -tf` would still mean a body was written.
      function stubTar() {
        tarCalls = []
        resolverModule.setSpawnSync((cmd, args) => {
          if (cmd === 'tar') tarCalls.push(args.slice())
          if (cmd === 'tar' && args[0] === '-xzf') {
            const packageDir = join(args[3], 'package')
            mkdirSync(packageDir, { recursive: true })
            writeFileSync(
              join(packageDir, 'SKILL.md'),
              '# slug: s/redirected\nname: redirected\nContent',
            )
          }
          return { status: 0, stdout: '', stderr: '' }
        })
      }

      afterEach(() => {
        if (savedFetch) globalThis.fetch = savedFetch
        savedFetch = null
      })

      it('refuses a tarball redirect to a host outside the registry', async () => {
        await freshImport()
        mockHttps(resolverModule)
        stubTar()

        const calls = stubFetch({
          [TARBALL]: () => redirectTo(EVIL),
          [EVIL]: () => tarballResponse(),
        })

        await assert.rejects(
          () => resolverModule.resolveSource('npm:test-pkg'),
          (err) => {
            assert.equal(err.userCode, 'NPM_TARBALL_HOST_NOT_ALLOWED')
            assert.match(
              err.message,
              /Download not allowed from https:\/\/evil\.example\.com/,
            )
            return true
          },
        )

        // The off-host URL must never have been requested, and nothing extracted.
        assert.deepEqual(
          calls.map((c) => c.url),
          [TARBALL],
        )
        assert.deepEqual(tarCalls, [])
      })

      it('refuses a protocol-relative redirect that leaves the registry', async () => {
        // "//evil.example.com/x" is a well-formed relative redirect that resolves
        // to an attacker origin. A guard that read the hostname off the literal
        // Location string, or resolved it without a base, would let this through.
        await freshImport()
        mockHttps(resolverModule)
        stubTar()

        const calls = stubFetch({
          [TARBALL]: () => redirectTo('//evil.example.com/payload.tgz'),
        })

        await assert.rejects(
          () => resolverModule.resolveSource('npm:test-pkg'),
          /Download not allowed from https:\/\/evil\.example\.com/,
        )
        assert.equal(calls.length, 1)
        assert.deepEqual(tarCalls, [])
      })

      it('refuses a redirect that downgrades the registry to http', async () => {
        await freshImport()
        mockHttps(resolverModule)
        stubTar()

        const calls = stubFetch({
          [TARBALL]: () =>
            redirectTo('http://registry.npmjs.org/test-pkg/-/other.tgz'),
        })

        await assert.rejects(
          () => resolverModule.resolveSource('npm:test-pkg'),
          /Download not allowed from http:\/\/registry\.npmjs\.org/,
        )
        assert.equal(calls.length, 1)
        assert.deepEqual(tarCalls, [])
      })

      it('follows a redirect that stays on the registry', async () => {
        await freshImport()
        mockHttps(resolverModule)
        stubTar()

        const mirrored = 'https://registry.npmjs.org/test-pkg/-/mirror.tgz'
        const calls = stubFetch({
          [TARBALL]: () => redirectTo(mirrored),
          [mirrored]: () => tarballResponse(),
        })

        const result = await resolverModule.resolveSource('npm:test-pkg')

        assert.equal(result.name, 'redirected')
        assert.deepEqual(
          calls.map((c) => c.url),
          [TARBALL, mirrored],
        )
        // The guard only means anything if fetch is told not to follow itself.
        assert.deepEqual(
          calls.map((c) => c.options.redirect),
          ['manual', 'manual'],
        )
      })

      it('resolves a relative redirect against the registry URL', async () => {
        await freshImport()
        mockHttps(resolverModule)
        stubTar()

        const relative = 'https://registry.npmjs.org/test-pkg/-/rel.tgz'
        const calls = stubFetch({
          [TARBALL]: () => redirectTo('./rel.tgz'),
          [relative]: () => tarballResponse(),
        })

        const result = await resolverModule.resolveSource('npm:test-pkg')

        assert.equal(result.name, 'redirected')
        assert.deepEqual(
          calls.map((c) => c.url),
          [TARBALL, relative],
        )
      })

      it('stops after too many tarball redirects', async () => {
        await freshImport()
        mockHttps(resolverModule)
        stubTar()

        // Every hop stays on the registry, so only the bound can stop this.
        const loop = 'https://registry.npmjs.org/test-pkg/-/loop'
        const calls = stubFetch({
          [TARBALL]: () => redirectTo(loop),
          [loop]: () => redirectTo(loop),
        })

        await assert.rejects(
          () => resolverModule.resolveSource('npm:test-pkg'),
          /Too many redirects while downloading test-pkg@1\.0\.0/,
        )
        // Three redirects are allowed, so four requests, and no fifth is made.
        assert.equal(calls.length, 4)
        assert.deepEqual(tarCalls, [])
      })

      it('rejects a tarball redirect with no Location header', async () => {
        await freshImport()
        mockHttps(resolverModule)
        stubTar()

        const calls = stubFetch({ [TARBALL]: () => redirectTo(null) })

        await assert.rejects(
          () => resolverModule.resolveSource('npm:test-pkg'),
          /did not include a Location header/,
        )
        assert.equal(calls.length, 1)
        assert.deepEqual(tarCalls, [])
      })

      it('rejects a tarball redirect to a malformed URL', async () => {
        await freshImport()
        mockHttps(resolverModule)
        stubTar()

        const calls = stubFetch({ [TARBALL]: () => redirectTo('http://[::1') })

        await assert.rejects(
          () => resolverModule.resolveSource('npm:test-pkg'),
          /pointed at an invalid URL/,
        )
        assert.equal(calls.length, 1)
        assert.deepEqual(tarCalls, [])
      })

      it('still wraps a non-redirect download failure as before', async () => {
        // Passing refused hosts through must not swallow the generic wrapper
        // that genuine extraction failures rely on.
        await freshImport()
        mockHttps(resolverModule)
        stubTar()

        const saved = globalThis.fetch
        globalThis.fetch = async () => ({ ok: false, status: 500 })
        try {
          await assert.rejects(
            () => resolverModule.resolveSource('npm:test-pkg'),
            (err) => {
              assert.equal(err.userCode, 'NPM_DOWNLOAD_FAILED')
              assert.match(err.message, /Could not process npm package/)
              assert.match(err.detail, /HTTP 500/)
              return true
            },
          )
        } finally {
          globalThis.fetch = saved
        }
      })
    })
  })

  describe('isGitUrl', () => {
    it('detects GitLab HTTPS URL', async () => {
      await freshImport()
      resolverModule.setSpawnSync(() => {
        throw new Error('mock')
      })
      await assert.rejects(
        () => resolverModule.resolveSource('https://gitlab.com/owner/repo'),
        /Failed to clone/,
      )
    })

    it('detects Bitbucket HTTPS URL', async () => {
      await freshImport()
      resolverModule.setSpawnSync(() => {
        throw new Error('mock')
      })
      await assert.rejects(
        () => resolverModule.resolveSource('https://bitbucket.com/owner/repo'),
        /Failed to clone/,
      )
    })

    it('detects SSH git URL', async () => {
      await freshImport()
      resolverModule.setSpawnSync(() => {
        throw new Error('mock')
      })
      await assert.rejects(
        () => resolverModule.resolveSource('git@github.com:owner/repo.git'),
        /Failed to clone/,
      )
    })

    it('detects generic HTTPS git URL', async () => {
      await freshImport()
      resolverModule.setSpawnSync(() => {
        throw new Error('mock')
      })
      await assert.rejects(
        () =>
          resolverModule.resolveSource('https://example.com/owner/repo.git'),
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
