import { addMcpServer, removeMcpServer, updateMcpServer, listMcpServers, getSupportedMcpAgents, resolveMcpSource } from '../utils/mcp.js'
import { scanMcpServer } from '../utils/security.js'

let runFetch = globalThis.fetch

export function setFetch(fn) {
  runFetch = fn
}

async function fetchNpmLatestVersion(packageName) {
  const encodedName = encodeURIComponent(packageName).replace(/^%40/, '@')
  const url = `https://registry.npmjs.org/${encodedName}/latest`
  const response = await runFetch(url, { signal: AbortSignal.timeout(8000) })
  if (!response.ok) return null
  const data = await response.json()
  return data.version || null
}

export async function apiMcpInstall(source, options = {}) {
  const resolved = resolveMcpSource(source)
  const scanResult = scanMcpServer(resolved)

  if (scanResult.issues.length > 0) {
    const level = scanResult.score >= 90 ? 'safe' : scanResult.score >= 70 ? 'review' : 'danger'
    if (level === 'danger' && !options.yes) {
      throw new Error(`Security score low (${scanResult.score}). Use yes:true to force.`)
    }
  }

  const targets = options.agents && options.agents.length > 0
    ? options.agents
    : getSupportedMcpAgents()

  const name = options.name || resolved.packageName || resolved.repo || resolved.path?.split('/').pop() || 'mcp-server'

  const results = []
  for (const agent of targets) {
    const success = await addMcpServer(agent, name, resolved, source)
    results.push({ agent, name, success })
  }

  return {
    name,
    source,
    resolved: { command: resolved.command, args: resolved.args },
    results,
    scanResult,
  }
}

export async function apiMcpList(options = {}) {
  const targets = options.agents && options.agents.length > 0
    ? options.agents
    : getSupportedMcpAgents()

  const all = []
  for (const agent of targets) {
    const servers = await listMcpServers(agent)
    for (const s of servers) all.push({ agent, name: s.name, command: s.command, args: s.args })
  }
  return { servers: all, total: all.length }
}

export async function apiMcpUpdate(source, options = {}) {
  const resolved = resolveMcpSource(source)
  const targets = options.agents && options.agents.length > 0
    ? options.agents
    : getSupportedMcpAgents()

  const name = options.name || resolved.packageName || resolved.repo || resolved.path?.split('/').pop() || 'mcp-server'
  const results = []

  for (const agent of targets) {
    const success = await updateMcpServer(agent, name, resolved, source)
    results.push({ agent, name, success })
  }

  return { name, source, resolved: { command: resolved.command, args: resolved.args }, results }
}

export async function apiMcpRemove(name, options = {}) {
  const targets = options.agents && options.agents.length > 0
    ? options.agents
    : getSupportedMcpAgents()

  const results = []
  for (const agent of targets) {
    const success = await removeMcpServer(agent, name)
    results.push({ agent, name, success })
  }

  return { name, results }
}

export async function apiMcpCheck() {
  const { readMcpLock } = await import('../utils/mcp-lock.js')
  const lock = await readMcpLock()
  const servers = Object.entries(lock.servers || {})

  if (servers.length === 0) return { servers: [], updatesAvailable: 0 }

  const results = []
  let updatesAvailable = 0

  for (const [name, entry] of servers) {
    const source = entry.source || ''
    const agents_list = (entry.agents || []).join(', ')

    if (!source.startsWith('npm:')) {
      results.push({ name, status: 'skipped', reason: 'non-npm source' })
      continue
    }

    const pkg = source.slice(4)
    const atIdx = pkg.lastIndexOf('@')
    const packageName = atIdx > 0 ? pkg.slice(0, atIdx) : pkg
    const installedVersion = atIdx > 0 ? pkg.slice(atIdx + 1) : null

    try {
      const latestVersion = await fetchNpmLatestVersion(packageName)
      if (!latestVersion) {
        results.push({ name, status: 'error', reason: 'could not check (registry unreachable)' })
        continue
      }
      if (installedVersion && installedVersion !== latestVersion) {
        results.push({ name, status: 'update_available', installedVersion, latestVersion, agents: agents_list, versionPinned: true })
        updatesAvailable++
      } else if (installedVersion) {
        results.push({ name, status: 'up_to_date', version: installedVersion, agents: agents_list, versionPinned: true })
      } else {
        results.push({ name, status: 'up_to_date', version: latestVersion, agents: agents_list, versionPinned: false })
      }
    } catch {
      results.push({ name, status: 'error', reason: 'check failed' })
    }
  }

  return { servers: results, updatesAvailable, total: results.length }
}

async function searchMcpGitHub(query) {
  const q = query ? `topic:mcp-server+${encodeURIComponent(query)}` : 'topic:mcp-server'
  const url = `https://api.github.com/search/repositories?q=${q}&per_page=20&sort=stars`
  const response = await runFetch(url, { headers: { Accept: 'application/vnd.github.v3+json' }, signal: AbortSignal.timeout(10000) })
  if (response.status === 403) return { rateLimited: true }
  if (!response.ok) return { error: `GitHub API error: ${response.status}` }
  return await response.json()
}

async function searchMcpNpm(query) {
  const q = query ? `keywords:mcp+${encodeURIComponent(query)}` : 'keywords:mcp'
  const url = `https://registry.npmjs.org/-/v1/search?text=${q}&size=20`
  const response = await runFetch(url, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) return { error: `npm API error: ${response.status}` }
  const data = await response.json()
  return { objects: data.objects || [], total: data.total || 0 }
}

export async function apiMcpSearch(query, options = {}) {
  if (options.npm) {
    const results = await searchMcpNpm(query)
    if (results.error) throw new Error(results.error)
    const items = (results.objects || []).map(o => ({
      name: o.package.name,
      description: o.package.description,
      keywords: o.package.keywords,
      version: o.package.version,
      installSource: `npm:${o.package.name}`,
    }))
    return { results: items, source: 'npm', total: items.length }
  }

  const results = await searchMcpGitHub(query)
  if (results.rateLimited) throw new Error('GitHub API rate limit reached.')
  if (results.error) throw new Error(results.error)

  const items = (results.items || []).map(r => ({
    name: r.full_name,
    description: r.description,
    stargazers_count: r.stargazers_count,
    language: r.language,
    topics: r.topics,
    installSource: `gh:${r.full_name}`,
  }))

  return { results: items, source: 'github', total: items.length }
}

