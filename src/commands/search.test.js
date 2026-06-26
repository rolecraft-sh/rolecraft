import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

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
  return { logs, restore: () => { console[name] = orig } }
}

function mockFetch(status, body) {
  searchModule.setFetch(() => Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  }))
}

describe('search command', () => {
  after(() => {
    searchModule.setFetch(globalThis.fetch)
  })

  it('shows results when items found', async () => {
    mockFetch(200, {
      items: [
        { full_name: 'user1/skill1', description: 'A code review skill', stargazers_count: 42, language: 'JavaScript' },
        { full_name: 'user2/skill2', description: null, stargazers_count: 5, language: null },
      ],
    })

    const { logs, restore } = capture('log')
    await searchModule.searchCommand('code-review')
    restore()

    assert.ok(logs.some(l => l.includes('Search results')))
    assert.ok(logs.some(l => l.includes('user1/skill1')))
    assert.ok(logs.some(l => l.includes('user2/skill2')))
    assert.ok(logs.some(l => l.includes('A code review skill')))
    assert.ok(logs.some(l => l.includes('No description')))
    assert.ok(logs.some(l => l.includes('42')))
    assert.ok(logs.some(l => l.includes('N/A')))
  })

  it('shows no results message when empty', async () => {
    mockFetch(200, { items: [] })

    const { logs, restore } = capture('log')
    await searchModule.searchCommand('nonexistent-skill')
    restore()

    assert.ok(logs.some(l => l.includes('No skills found')))
  })

  it('handles 403 rate limit gracefully', async () => {
    mockFetch(403, {})

    const { logs, restore } = capture('log')
    await searchModule.searchCommand('test')
    restore()

    assert.ok(logs.some(l => l.includes('rate limit')))
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
})
