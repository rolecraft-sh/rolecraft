import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

let api, client

before(async () => {
  api = await import('./registry.js')
  client = await import('../utils/registry-client.js')
})

after(() => {
  client.setRegistryFetch(globalThis.fetch)
})

function mockFetch(body) {
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64')
  client.setRegistryFetch(() =>
    Promise.resolve({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ type: 'file', content: encoded }),
    }),
  )
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

describe('registry API', () => {
  beforeEach(() => {
    client.clearCache()
    client.setRegistryFetch(globalThis.fetch)
  })

  after(() => client.setRegistryFetch(globalThis.fetch))

  describe('apiRegistryList', () => {
    it('returns all skills', async () => {
      mockFetch(sampleIndex)

      const list = await api.apiRegistryList()
      assert.equal(list.length, 2)
      assert.ok(list.some((s) => s.slug === 'react-rules'))
    })

    it('returns empty when registry is empty', async () => {
      mockFetch({ updated: '2026-07-23T15:00:00.000Z', skills: [] })

      const list = await api.apiRegistryList()
      assert.equal(list.length, 0)
    })
  })

  describe('apiRegistryInfo', () => {
    it('returns skill details', async () => {
      mockFetch(sampleIndex)

      const skill = await api.apiRegistryInfo('react-rules')
      assert.equal(skill.slug, 'react-rules')
      assert.equal(skill.repo, 'acme/react-rules')
    })

    it('throws for unknown slug', async () => {
      mockFetch(sampleIndex)

      await assert.rejects(
        () => api.apiRegistryInfo('nonexistent'),
        /not found in registry/,
      )
    })
  })

  describe('searchRegistry', () => {
    it('searches by slug', async () => {
      mockFetch(sampleIndex)

      const results = await api.searchRegistry('react')
      assert.equal(results.length, 1)
      assert.equal(results[0].slug, 'react-rules')
    })

    it('is case-insensitive', async () => {
      mockFetch(sampleIndex)

      const results = await api.searchRegistry('REACT')
      assert.equal(results.length, 1)
    })

    it('returns empty for no matches', async () => {
      mockFetch(sampleIndex)

      const results = await api.searchRegistry('xyz')
      assert.equal(results.length, 0)
    })
  })

  describe('resolveSlug', () => {
    it('returns full skill entry', async () => {
      mockFetch(sampleIndex)

      const skill = await api.resolveSlug('testing-guide')
      assert.equal(skill.latest, 'v1.1.0')
    })
  })

  describe('checkUpdates', () => {
    it('detects outdated skills', async () => {
      mockFetch(sampleIndex)

      const updates = await api.checkUpdates([
        { slug: 'testing-guide', name: 'Testing Guide', version: 'v1.0.0' },
      ])
      assert.equal(updates.length, 1)
      assert.equal(updates[0].latest, 'v1.1.0')
    })

    it('returns empty when current', async () => {
      mockFetch(sampleIndex)

      const updates = await api.checkUpdates([
        { slug: 'react-rules', name: 'React', version: 'v1.0.0' },
      ])
      assert.equal(updates.length, 0)
    })
  })
})
