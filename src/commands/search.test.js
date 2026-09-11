import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let searchModule

before(async () => {
  searchModule = await import('./search.js')
})

function capture(name) {
  const orig = console[name]
  const logs = []
  console[name] = (...args) => {
    if (args.length) logs.push(String(args[0]))
  }
  return {
    logs,
    restore: () => {
      console[name] = orig
    },
  }
}

function mockFetch(status, body) {
  searchModule.setFetch(() =>
    Promise.resolve({
      status,
      ok: status >= 200 && status < 300,
      json: () => Promise.resolve(body),
    }),
  )
}

function mockSequentialFetch(responses) {
  let idx = 0
  searchModule.setFetch(() => {
    const resp = responses[idx]
    if (resp) idx++
    return Promise.resolve({
      status: resp?.status || 200,
      ok: resp?.status ? resp.status >= 200 && resp.status < 300 : true,
      json: () => Promise.resolve(resp?.body || {}),
    })
  })
}

describe('search command', () => {
  after(() => {
    searchModule.setFetch(globalThis.fetch)
    searchModule.setPromptUser(undefined)
  })

  describe('formatRepo', () => {
    it('formats a repo with all fields', () => {
      const result = searchModule.formatRepo({
        full_name: 'user/skill',
        description: 'A great skill',
        stargazers_count: 42,
        language: 'JavaScript',
      })
      assert.ok(result.includes('user/skill'))
      assert.ok(result.includes('A great skill'))
      assert.ok(result.includes('42'))
      assert.ok(result.includes('JavaScript'))
    })

    it('handles missing fields', () => {
      const result = searchModule.formatRepo({
        full_name: 'user/skill',
        description: null,
        stargazers_count: null,
        language: null,
      })
      assert.ok(result.includes('No description'))
      assert.ok(result.includes('N/A'))
    })

    it('handles empty strings and zero values', () => {
      const result = searchModule.formatRepo({
        full_name: 'user/skill',
        description: '',
        stargazers_count: 0,
        language: '',
      })
      assert.ok(result.includes('No description'))
      assert.ok(result.includes('⭐ 0'))
      assert.ok(result.includes('N/A'))
    })
  })

  it('shows results when items found', async () => {
    mockFetch(200, {
      items: [
        {
          full_name: 'user1/skill1',
          description: 'A code review skill',
          stargazers_count: 42,
          language: 'JavaScript',
        },
        {
          full_name: 'user2/skill2',
          description: null,
          stargazers_count: 5,
          language: null,
        },
      ],
    })

    const { logs, restore } = capture('log')
    await searchModule.searchCommand('code-review')
    restore()

    assert.ok(logs.some((l) => l.includes('Search results')))
    assert.ok(logs.some((l) => l.includes('user1/skill1')))
    assert.ok(logs.some((l) => l.includes('user2/skill2')))
    assert.ok(logs.some((l) => l.includes('A code review skill')))
    assert.ok(logs.some((l) => l.includes('No description')))
    assert.ok(logs.some((l) => l.includes('42')))
    assert.ok(logs.some((l) => l.includes('N/A')))
  })

  it('shows no results message when empty', async () => {
    mockFetch(200, { items: [] })

    const { logs, restore } = capture('log')
    await searchModule.searchCommand('nonexistent-skill')
    restore()

    assert.ok(logs.some((l) => l.includes('No skills found')))
  })

  it('handles 403 rate limit gracefully', async () => {
    mockFetch(403, {})

    const { logs, restore } = capture('log')
    await searchModule.searchCommand('test')
    restore()

    assert.ok(logs.some((l) => l.includes('rate limit')))
  })

  it('throws on non-ok response', async () => {
    mockFetch(500, {})

    await assert.rejects(
      () => searchModule.searchCommand('test'),
      /GitHub API error: 500/,
    )
  })

  it('throws on network error', async () => {
    searchModule.setFetch(() => Promise.reject(new Error('network error')))

    await assert.rejects(
      () => searchModule.searchCommand('test'),
      /Failed to search GitHub/,
    )
  })

  it('shows repo from lookup when owner/repo query has no SKILL.md search results', async () => {
    mockSequentialFetch([
      {
        status: 200,
        body: {
          full_name: 'owner/skill-repo',
          description: 'A skill repo',
          stargazers_count: 10,
          language: 'TypeScript',
        },
      },
      { status: 200, body: { items: [] } },
    ])

    const { logs, restore } = capture('log')
    await searchModule.searchCommand('owner/skill-repo')
    restore()

    assert.ok(logs.some((l) => l.includes('owner/skill-repo')))
    assert.ok(logs.some((l) => l.includes('A skill repo')))
    assert.ok(logs.some((l) => l.includes('10')))
  })

  it('falls back to broader search when lookup fails', async () => {
    mockSequentialFetch([
      { status: 404, body: {} },
      { status: 200, body: { items: [] } },
      { status: 200, body: { items: [] } },
    ])

    const { logs, restore } = capture('log')
    await searchModule.searchCommand('owner/skill-repo')
    restore()

    assert.ok(logs.some((l) => l.includes('No skills found')))
  })

  it('handles network error in lookup catch block', async () => {
    let callCount = 0
    searchModule.setFetch(() => {
      callCount++
      if (callCount === 1) return Promise.reject(new Error('network failure'))
      return Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      })
    })

    const { logs, restore } = capture('log')
    await searchModule.searchCommand('owner/skill-repo')
    restore()

    assert.ok(logs.some((l) => l.includes('No skills found')))
  })

  it('throws on network error in broader search fallback', async () => {
    let callCount = 0
    searchModule.setFetch(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ items: [] }),
        })
      }
      return Promise.reject(new Error('network error'))
    })

    await assert.rejects(
      () => searchModule.searchCommand('some-query'),
      /Failed to search GitHub/,
    )
  })

  it('handles rate limit in broader search fallback', async () => {
    let callCount = 0
    searchModule.setFetch(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ items: [] }),
        })
      }
      return Promise.resolve({
        status: 403,
        ok: false,
        json: () => Promise.resolve({}),
      })
    })

    const { logs, restore } = capture('log')
    await searchModule.searchCommand('some-query')
    restore()

    assert.ok(logs.some((l) => l.includes('rate limit')))
  })

  it('displays results when interactive is explicitly false', async () => {
    mockFetch(200, {
      items: [
        {
          full_name: 'org/repo',
          description: 'A repo',
          stargazers_count: 10,
          language: 'Go',
        },
      ],
    })

    const { logs, restore } = capture('log')
    await searchModule.searchCommand('go-skill', { interactive: false })
    restore()

    assert.ok(logs.some((l) => l.includes('org/repo')))
    assert.ok(logs.some((l) => l.includes('A repo')))
    assert.ok(logs.some((l) => l.includes('10')))
    assert.ok(logs.some((l) => l.includes('1 result(s) found')))
  })

  describe('interactive mode', () => {
    afterEach(() => {
      searchModule.setFetch(globalThis.fetch)
      searchModule.setPromptUser(undefined)
    })

    it('aborts on q', async () => {
      searchModule.setPromptUser(() => Promise.resolve('q'))
      mockFetch(200, {
        items: [
          {
            full_name: 'user1/skill1',
            description: 'desc',
            stargazers_count: 1,
            language: 'JS',
          },
        ],
      })

      const { logs, restore } = capture('log')
      await searchModule.searchCommand('test', { interactive: true })
      restore()

      assert.ok(logs.some((l) => l.includes('Aborted')))
    })

    it('shows invalid choice message', async () => {
      searchModule.setPromptUser(() => Promise.resolve('99'))
      mockFetch(200, {
        items: [
          {
            full_name: 'user1/skill1',
            description: 'desc',
            stargazers_count: 1,
            language: 'JS',
          },
        ],
      })

      const { logs, restore } = capture('log')
      await searchModule.searchCommand('test', { interactive: true })
      restore()

      assert.ok(logs.some((l) => l.includes('Invalid choice')))
    })

    it('shows numbered list before prompt', async () => {
      searchModule.setPromptUser(() => Promise.resolve('q'))
      mockFetch(200, {
        items: [
          {
            full_name: 'user1/skill1',
            description: 'desc',
            stargazers_count: 1,
            language: 'JS',
          },
        ],
      })

      const { logs, restore } = capture('log')
      await searchModule.searchCommand('test', { interactive: true })
      restore()

      assert.ok(logs.some((l) => l.includes('user1/skill1')))
      assert.ok(logs.some((l) => l.includes('1')))
    })

    it('installs selected skill from interactive search', async () => {
      const testDir = mkdtempSync(join(tmpdir(), 'rolecraft-search-install-'))
      const origHome = process.env.HOME
      process.env.HOME = testDir
      await mkdir(join(testDir, '.agents'), { recursive: true })

      const skillDir = join(testDir, 'interactive-install-skill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(
        join(skillDir, 'SKILL.md'),
        '# slug: test/interactive-install\nname: interactive-skill\nContent',
      )

      searchModule.setPromptUser(() => Promise.resolve('1'))
      mockFetch(200, {
        items: [
          {
            full_name: skillDir,
            description: 'A test skill',
            stargazers_count: 1,
            language: 'JS',
          },
        ],
      })

      const { logs, restore } = capture('log')
      await searchModule.searchCommand('test', { interactive: true })
      restore()

      process.env.HOME = origHome
      await rm(testDir, { recursive: true, force: true })

      assert.ok(logs.some((l) => l.includes('Installed')))
      assert.ok(logs.some((l) => l.includes('interactive-skill')))
    })

    it('handles install failure in interactive search', async () => {
      const testDir = mkdtempSync(join(tmpdir(), 'rolecraft-search-fail-'))
      mkdirSync(join(testDir, 'empty-dir'), { recursive: true })

      searchModule.setPromptUser(() => Promise.resolve('1'))
      mockFetch(200, {
        items: [
          {
            full_name: join(testDir, 'empty-dir'),
            description: 'Broken',
            stargazers_count: 0,
            language: 'N/A',
          },
        ],
      })

      const errCapture = capture('error')
      const logCapture = capture('log')
      await searchModule.searchCommand('test', { interactive: true })
      logCapture.restore()
      errCapture.restore()
      await rm(testDir, { recursive: true, force: true })

      assert.ok(errCapture.logs.some((l) => l.includes('Failed to install')))
    })

    it('uses promptSelect when output is not a TTY', async () => {
      const origIsTTY = process.stdout.isTTY
      process.stdout.isTTY = false

      try {
        searchModule.setPromptUser(() => Promise.resolve('q'))
        mockFetch(200, {
          items: [
            {
              full_name: 'user/skill1',
              description: 'A test',
              stargazers_count: 5,
              language: 'JS',
            },
          ],
        })

        const { logs, restore } = capture('log')
        await searchModule.searchCommand('test', { interactive: true })
        restore()

        assert.ok(logs.some((l) => l.includes('Aborted')))
      } finally {
        process.stdout.isTTY = origIsTTY
      }
    })
  })

  describe('skills.sh integration (experimental)', () => {
    afterEach(() => {
      searchModule.setFetch(globalThis.fetch)
    })

    it('formats a skills.sh item', () => {
      const result = searchModule.formatSkillsShItem({
        skillId: 'my-skill',
        name: 'My Skill',
        installs: 12345,
        source: 'user/repo',
      })
      assert.ok(result.includes('user/repo/my-skill'))
      assert.ok(result.includes('My Skill'))
      assert.ok(result.includes('12345'))
      assert.ok(result.includes('skills.sh'))
    })

    it('handles missing fields in skills.sh item', () => {
      const result = searchModule.formatSkillsShItem({
        skillId: 'test-skill',
      })
      assert.ok(result.includes('No description'))
      assert.ok(result.includes('0'))
    })

    it('shows results from skills.sh', async () => {
      mockFetch(200, {
        skills: [
          {
            skillId: 'skill-one',
            name: 'Skill One',
            installs: 100,
            source: 'user1/repo',
          },
          {
            skillId: 'skill-two',
            name: 'Skill Two',
            installs: 50,
            source: 'user2/repo',
          },
        ],
      })

      const { logs, restore } = capture('log')
      await searchModule.searchCommand('test', { skillsSh: true })
      restore()

      assert.ok(logs.some((l) => l.includes('Experimental')))
      assert.ok(logs.some((l) => l.includes('skill-one')))
      assert.ok(logs.some((l) => l.includes('skill-two')))
      assert.ok(logs.some((l) => l.includes('100')))
      assert.ok(logs.some((l) => l.includes('2 result(s) found')))
    })

    it('shows no results message when skills.sh returns empty', async () => {
      mockFetch(200, { skills: [] })

      const { logs, restore } = capture('log')
      await searchModule.searchCommand('nonexistent', { skillsSh: true })
      restore()

      assert.ok(logs.some((l) => l.includes('No skills found')))
    })

    it('throws on skills.sh network error', async () => {
      searchModule.setFetch(() => Promise.reject(new Error('network error')))

      await assert.rejects(
        () => searchModule.searchCommand('test', { skillsSh: true }),
        /Failed to search skills/,
      )
    })

    it('throws on skills.sh non-ok response', async () => {
      mockFetch(500, {})

      await assert.rejects(
        () => searchModule.searchCommand('test', { skillsSh: true }),
        /skills.sh API error: 500/,
      )
    })
  })
})
