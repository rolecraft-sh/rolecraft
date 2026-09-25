import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { apiSearch, setFetch } from './search.js'

after(() => {
  setFetch(globalThis.fetch)
})

describe('api search', () => {
  it('maps GitHub repository results to the public return shape', async () => {
    const requests = []
    setFetch(async (url) => {
      requests.push(url)
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            items: [
              {
                full_name: 'owner/skill-repo',
                description: 'A useful skill',
                stargazers_count: 42,
                language: 'JavaScript',
                topics: ['agents'],
              },
            ],
          }
        },
      }
    })

    const result = await apiSearch('useful skill')

    assert.equal(requests.length, 1)
    assert.match(requests[0], /useful%20skill\+filename:SKILL\.md/)
    assert.deepEqual(result, {
      results: [
        {
          full_name: 'owner/skill-repo',
          description: 'A useful skill',
          stargazers_count: 42,
          language: 'JavaScript',
          topics: ['agents'],
        },
      ],
      source: 'github',
      fromLookup: false,
    })
  })

  it('maps skills.sh results and their install source', async () => {
    setFetch(async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          skills: [
            {
              source: 'owner/repo',
              skillId: 'reviewer',
              name: 'Reviewer',
              description: 'Reviews code',
              installs: 8,
            },
          ],
        }
      },
    }))

    const result = await apiSearch('review', { skillsSh: true })

    assert.deepEqual(result.results[0], {
      source: 'owner/repo',
      skillId: 'reviewer',
      name: 'Reviewer',
      description: 'Reviews code',
      installs: 8,
      installSource: 'owner/repo/reviewer',
    })
    assert.equal(result.source, 'skills.sh')
  })

  it('reports GitHub rate limits as an error', async () => {
    setFetch(async () => ({ ok: false, status: 403 }))

    await assert.rejects(
      () => apiSearch('anything'),
      /GitHub API rate limit reached\./,
    )
  })
})
