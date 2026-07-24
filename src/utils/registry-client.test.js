import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

let client

before(async () => {
  client = await import('./registry-client.js')
})

after(() => {
  client.setRegistryFetch(globalThis.fetch)
})

function mockFetch(status, body) {
  client.setRegistryFetch(() =>
    Promise.resolve({
      status,
      ok: status >= 200 && status < 300,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    }),
  )
}

function mockSequentialFetch(responses) {
  let idx = 0
  client.setRegistryFetch(() => {
    const resp = responses[idx]
    if (resp) idx++
    return Promise.resolve({
      status: resp?.status || 200,
      ok: resp?.status ? resp.status >= 200 && resp.status < 300 : true,
      json: () => Promise.resolve(resp?.body || {}),
      text: () => Promise.resolve(JSON.stringify(resp?.body || {})),
    })
  })
}

const sampleIndex = {
  updated: '2026-07-23T15:00:00.000Z',
  skills: [
    {
      slug: 'react-rules',
      name: 'React Best Practices',
      description: 'React code conventions',
      repo: 'acme/react-rules',
      author: 'acme',
      versions: ['v1.0.0'],
      latest: 'v1.0.0',
      installs: 42,
      stars: 10,
    },
    {
      slug: 'testing-guide',
      name: 'Testing Guide',
      description: 'Testing best practices',
      repo: 'acme/testing-guide',
      author: 'acme',
      versions: ['v1.0.0', 'v1.1.0'],
      latest: 'v1.1.0',
    },
  ],
}

function base64Encode(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
}

describe('registry-client', () => {
  beforeEach(() => {
    client.clearCache()
    client.setRegistryFetch(globalThis.fetch)
  })

  after(() => {
    client.setRegistryFetch(globalThis.fetch)
  })

  describe('fetchIndex', () => {
    it('fetches and caches the registry index', async () => {
      mockFetch(200, {
        type: 'file',
        content: base64Encode(sampleIndex),
      })

      const result = await client.fetchIndex()
      assert.equal(result.skills.length, 2)
      assert.equal(result.skills[0].slug, 'react-rules')

      const cached = await client.fetchIndex()
      assert.equal(cached.skills.length, 2)
    })

    it('throws on non-ok response', async () => {
      mockFetch(404, { message: 'Not Found' })

      await assert.rejects(() => client.fetchIndex(), /Registry API error/)
    })

    it('throws on rate limit', async () => {
      mockFetch(403, { message: 'API rate limit exceeded' })

      await assert.rejects(() => client.fetchIndex(), /rate limit/)
    })

    it('throws on invalid file type', async () => {
      mockFetch(200, {
        type: 'symlink',
        content: base64Encode(sampleIndex),
      })

      await assert.rejects(() => client.fetchIndex(), /not a valid file/)
    })
  })

  describe('searchRegistry', () => {
    it('searches by slug', async () => {
      mockFetch(200, {
        type: 'file',
        content: base64Encode(sampleIndex),
      })

      const results = await client.searchRegistry('react')
      assert.equal(results.length, 1)
      assert.equal(results[0].slug, 'react-rules')
    })

    it('searches by name', async () => {
      mockFetch(200, {
        type: 'file',
        content: base64Encode(sampleIndex),
      })

      const results = await client.searchRegistry('testing')
      assert.equal(results.length, 1)
      assert.equal(results[0].slug, 'testing-guide')
    })

    it('searches by description', async () => {
      mockFetch(200, {
        type: 'file',
        content: base64Encode(sampleIndex),
      })

      const results = await client.searchRegistry('code conventions')
      assert.equal(results.length, 1)
    })

    it('returns empty for no matches', async () => {
      mockFetch(200, {
        type: 'file',
        content: base64Encode(sampleIndex),
      })

      const results = await client.searchRegistry('nonexistent')
      assert.equal(results.length, 0)
    })
  })

  describe('resolveSlug', () => {
    it('resolves an existing slug', async () => {
      mockFetch(200, {
        type: 'file',
        content: base64Encode(sampleIndex),
      })

      const result = await client.resolveSlug('react-rules')
      assert.equal(result.repo, 'acme/react-rules')
      assert.equal(result.latest, 'v1.0.0')
    })

    it('throws for unknown slug', async () => {
      mockFetch(200, {
        type: 'file',
        content: base64Encode(sampleIndex),
      })

      await assert.rejects(
        () => client.resolveSlug('unknown'),
        /not found in registry/,
      )
    })
  })

  describe('createPublishPR', () => {
    it('throws without token', async () => {
      const origToken = process.env.GITHUB_TOKEN
      delete process.env.GITHUB_TOKEN
      delete process.env.GH_TOKEN

      await assert.rejects(
        () =>
          client.createPublishPR({
            slug: 'my-skill',
            name: 'My Skill',
            repo: 'user/my-skill',
          }),
        /GITHUB_TOKEN/,
      )

      if (origToken) process.env.GITHUB_TOKEN = origToken
    })

    it('creates PR with correct flow', async () => {
      const origToken = process.env.GITHUB_TOKEN
      process.env.GITHUB_TOKEN = 'test-token'

      try {
        const responses = [
          {
            // GET /user
            status: 200,
            body: { login: 'testuser' },
          },
          {
            // GET index.json
            status: 200,
            body: {
              type: 'file',
              content: base64Encode(sampleIndex),
              sha: 'abc123',
            },
          },
          {
            // POST /forks
            status: 202,
            body: {},
          },
          {
            // POST /git/refs (create branch)
            status: 201,
            body: { ref: 'refs/heads/publish/my-skill-1.0.0' },
          },
          {
            // PUT /contents/index.json
            status: 200,
            body: { content: {} },
          },
          {
            // POST /pulls
            status: 201,
            body: {
              html_url: 'https://github.com/rolecraft-sh/registry/pull/1',
              number: 1,
            },
          },
        ]

        mockSequentialFetch(responses)

        const result = await client.createPublishPR({
          slug: 'my-skill',
          name: 'My Skill',
          repo: 'user/my-skill',
          description: 'A test skill',
          version: 'v1.0.0',
        })

        assert.equal(result.number, 1)
        assert.ok(result.url.includes('pull/1'))
      } finally {
        if (origToken) process.env.GITHUB_TOKEN = origToken
        else delete process.env.GITHUB_TOKEN
      }
    })

    it('updates existing slug versions', async () => {
      const origToken = process.env.GITHUB_TOKEN
      process.env.GITHUB_TOKEN = 'test-token'

      try {
        const responses = [
          { status: 200, body: { login: 'testuser' } },
          {
            status: 200,
            body: {
              type: 'file',
              content: base64Encode(sampleIndex),
              sha: 'abc123',
            },
          },
          { status: 202, body: {} },
          { status: 201, body: {} },
          { status: 200, body: {} },
          {
            status: 201,
            body: { html_url: 'https://github.com/pull/2', number: 2 },
          },
        ]

        mockSequentialFetch(responses)

        const result = await client.createPublishPR({
          slug: 'testing-guide',
          name: 'Testing Guide',
          repo: 'acme/testing-guide',
          version: 'v2.0.0',
        })

        assert.equal(result.number, 2)
      } finally {
        if (origToken) process.env.GITHUB_TOKEN = origToken
        else delete process.env.GITHUB_TOKEN
      }
    })
  })

  describe('checkUpdates', () => {
    it('detects available updates', async () => {
      mockFetch(200, {
        type: 'file',
        content: base64Encode(sampleIndex),
      })

      const updates = await client.checkUpdates([
        { slug: 'testing-guide', name: 'Testing Guide', version: 'v1.0.0' },
        { slug: 'react-rules', name: 'React Rules', version: 'v1.0.0' },
      ])

      assert.equal(updates.length, 1)
      assert.equal(updates[0].slug, 'testing-guide')
      assert.equal(updates[0].current, 'v1.0.0')
      assert.equal(updates[0].latest, 'v1.1.0')
    })

    it('returns empty when all up to date', async () => {
      mockFetch(200, {
        type: 'file',
        content: base64Encode(sampleIndex),
      })

      const updates = await client.checkUpdates([
        { slug: 'react-rules', name: 'React Rules', version: 'v1.0.0' },
      ])

      assert.equal(updates.length, 0)
    })
  })
})
