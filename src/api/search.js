import { resolveSource } from '../utils/resolver.js'

let runFetch = globalThis.fetch

export function setFetch(fn) {
  runFetch = fn
}

function isGitHubRef(source) {
  return /^[\w.-]+\/[\w.-]+$/.test(source) && !source.startsWith('/') && !source.startsWith('.')
}

async function searchGitHub(query, filenameFilter = true) {
  const q = filenameFilter
    ? `${encodeURIComponent(query)}+filename:SKILL.md`
    : encodeURIComponent(query)
  const url = `https://api.github.com/search/repositories?q=${q}&per_page=20&sort=stars`

  const response = await runFetch(url, {
    headers: { Accept: 'application/vnd.github.v3+json' },
    signal: AbortSignal.timeout(10000),
  })

  if (response.status === 403) return { rateLimited: true }
  if (!response.ok) return { error: `GitHub API error: ${response.status}` }
  return await response.json()
}

async function searchSkillsSh(query) {
  const url = `https://skills.sh/api/search?q=${encodeURIComponent(query)}`
  const response = await runFetch(url, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) return { error: `skills.sh API error: ${response.status}` }
  const data = await response.json()
  return { items: data.skills || [] }
}

async function lookupGithubRepo(ref) {
  const url = `https://api.github.com/repos/${ref}`
  try {
    const response = await runFetch(url, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return null
    return await response.json()
  } catch { return null }
}

async function searchOrLookup(query) {
  if (isGitHubRef(query)) {
    const repo = await lookupGithubRepo(query)
    if (repo) {
      const items = [{ full_name: repo.full_name, description: repo.description, stargazers_count: repo.stargazers_count, language: repo.language }]
      const data = await searchGitHub(query, true)
      if (data.items && data.items.length > 0) return data
      return { items, fromLookup: true }
    }
  }
  return await searchGitHub(query, true)
}

export async function apiSearch(query, options = {}) {
  if (options.skillsSh) {
    const data = await searchSkillsSh(query)
    if (data.error) throw new Error(data.error)
    if (data.items.length === 0) return { results: [], source: 'skills.sh' }
    return {
      results: data.items.map(s => ({
        source: s.source,
        skillId: s.skillId,
        name: s.name,
        description: s.description,
        installs: s.installs || 0,
        installSource: `${s.source}/${s.skillId}`,
      })),
      source: 'skills.sh',
    }
  }

  let data = await searchOrLookup(query)
  if (data.rateLimited) throw new Error('GitHub API rate limit reached.')
  if (data.error) throw new Error(data.error)

  if (data.items.length === 0) {
    data = await searchGitHub(query, false)
    if (data.rateLimited) throw new Error('GitHub API rate limit reached.')
  }

  return {
    results: (data.items || []).map(r => ({
      full_name: r.full_name,
      description: r.description,
      stargazers_count: r.stargazers_count,
      language: r.language,
      topics: r.topics,
    })),
    source: 'github',
    fromLookup: data.fromLookup || false,
  }
}

export async function apiResolve(source) {
  return await resolveSource(source)
}