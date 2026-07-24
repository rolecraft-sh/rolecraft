const REGISTRY_OWNER = 'rolecraft-sh'
const REGISTRY_REPO = 'registry'
const REGISTRY_BRANCH = 'main'
const CACHE_TTL = 5 * 60 * 1000

let runFetch = globalThis.fetch
let cachedIndex = null
let cacheTime = 0

export function setRegistryFetch(fn) {
  runFetch = fn
}

export function clearCache() {
  cachedIndex = null
  cacheTime = 0
}

function getToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
}

function authHeaders(token) {
  const h = {
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }
  const t = token || getToken()
  if (t) h.Authorization = `Bearer ${t}`
  return h
}

export async function fetchIndex(token) {
  const now = Date.now()
  if (cachedIndex && now - cacheTime < CACHE_TTL) return cachedIndex

  const t = token || getToken()
  const url = `https://api.github.com/repos/${REGISTRY_OWNER}/${REGISTRY_REPO}/contents/index.json?ref=${REGISTRY_BRANCH}`

  const res = await runFetch(url, { headers: authHeaders(t) })
  if (!res.ok) {
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}))
      if (body.message?.includes('rate limit')) {
        throw new Error(
          'GitHub API rate limit reached. Set GITHUB_TOKEN to increase limit.',
        )
      }
      if (body.message?.includes('Not Found')) {
        throw new Error(
          `Registry not found: ${REGISTRY_OWNER}/${REGISTRY_REPO}`,
        )
      }
    }
    throw new Error(`Registry API error: ${res.status} — ${res.statusText}`)
  }

  const data = await res.json()
  if (data.type !== 'file' || !data.content) {
    throw new Error('Registry index.json is not a valid file')
  }

  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  const index = JSON.parse(content)

  cachedIndex = index
  cacheTime = now
  return index
}

export async function searchRegistry(query) {
  const index = await fetchIndex()
  const q = query.toLowerCase()

  return index.skills.filter((s) => {
    if (s.slug?.toLowerCase().includes(q)) return true
    if (s.name?.toLowerCase().includes(q)) return true
    if (s.description?.toLowerCase().includes(q)) return true
    return false
  })
}

export async function resolveSlug(slug) {
  const index = await fetchIndex()
  const skill = index.skills.find((s) => s.slug === slug)
  if (!skill) {
    throw new Error(`Skill "${slug}" not found in registry`)
  }
  return skill
}

export async function createPublishPR(
  { slug, name, repo, description, version },
  token,
) {
  const t = token || getToken()
  if (!t) {
    throw new Error(
      'GITHUB_TOKEN or GH_TOKEN environment variable is required to publish.\n' +
        '  Create a token at: https://github.com/settings/tokens (scope: repo)\n' +
        '  Then set: export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx',
    )
  }

  const headers = authHeaders(t)
  const ver = version || 'v1.0.0'

  const userRes = await runFetch('https://api.github.com/user', { headers })
  if (!userRes.ok)
    throw new Error('GitHub authentication failed. Check your GITHUB_TOKEN.')
  const user = await userRes.json()
  const username = user.login

  const getRes = await runFetch(
    `https://api.github.com/repos/${REGISTRY_OWNER}/${REGISTRY_REPO}/contents/index.json?ref=${REGISTRY_BRANCH}`,
    { headers },
  )
  if (!getRes.ok) throw new Error('Failed to fetch current registry index')
  const fileData = await getRes.json()
  const currentSha = fileData.sha

  const refRes = await runFetch(
    `https://api.github.com/repos/${REGISTRY_OWNER}/${REGISTRY_REPO}/git/refs/heads/${REGISTRY_BRANCH}`,
    { headers },
  )
  if (!refRes.ok) throw new Error('Failed to fetch upstream branch ref')
  const refData = await refRes.json()
  const upstreamSha = refData.object.sha
  const currentContent = Buffer.from(fileData.content, 'base64').toString(
    'utf-8',
  )
  const index = JSON.parse(currentContent)

  const existing = index.skills.findIndex((s) => s.slug === slug)
  const entry = {
    slug,
    name,
    description: description || '',
    repo,
    author: username,
    versions: [ver],
    latest: ver,
  }

  if (existing >= 0) {
    const old = index.skills[existing]
    const allVersions = [...new Set([...old.versions, ver])]
    entry.versions = allVersions
    entry.latest = ver
    index.skills[existing] = { ...old, ...entry }
  } else {
    index.skills.push(entry)
  }

  index.updated = new Date().toISOString()
  const newContent = `${JSON.stringify(index, null, 2)}\n`
  const branchName = `publish/${slug}-${ver.replace(/^v/, '')}`

  const forkRes = await runFetch(
    `https://api.github.com/repos/${REGISTRY_OWNER}/${REGISTRY_REPO}/forks`,
    { method: 'POST', headers },
  )
  if (!forkRes.ok && forkRes.status !== 202) {
    const errBody = await forkRes.text().catch(() => '')
    throw new Error(
      `Failed to fork registry: ${forkRes.status}${errBody ? ` — ${errBody}` : ''}`,
    )
  }

  const branchRes = await runFetch(
    `https://api.github.com/repos/${username}/${REGISTRY_REPO}/git/refs`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: upstreamSha,
      }),
    },
  )
  if (!branchRes.ok) {
    const errBody = await branchRes.text().catch(() => '')
    throw new Error(
      `Failed to create branch: ${branchRes.status}${errBody ? ` — ${errBody}` : ''}`,
    )
  }

  const putRes = await runFetch(
    `https://api.github.com/repos/${username}/${REGISTRY_REPO}/contents/index.json`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `publish: ${slug} ${ver}`,
        content: Buffer.from(newContent).toString('base64'),
        sha: currentSha,
        branch: branchName,
      }),
    },
  )
  if (!putRes.ok) {
    const errBody = await putRes.text().catch(() => '')
    throw new Error(
      `Failed to update index.json: ${putRes.status}${errBody ? ` — ${errBody}` : ''}`,
    )
  }

  const prRes = await runFetch(
    `https://api.github.com/repos/${REGISTRY_OWNER}/${REGISTRY_REPO}/pulls`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `publish: ${name} (${slug})`,
        body: `Publishes **${name}** (\`${slug}\`) ${ver}\n\nRepo: \`${repo}\`\nAuthor: @${username}`,
        head: `${username}:${branchName}`,
        base: REGISTRY_BRANCH,
      }),
    },
  )
  if (!prRes.ok) {
    const errBody = await prRes.text().catch(() => '')
    throw new Error(
      `Failed to create PR: ${prRes.status}${errBody ? ` — ${errBody}` : ''}`,
    )
  }

  const pr = await prRes.json()
  return { url: pr.html_url, number: pr.number }
}

export async function checkUpdates(skills) {
  const index = await fetchIndex()
  const updates = []

  for (const local of skills) {
    const registrySkill = index.skills.find((s) => s.slug === local.slug)
    if (!registrySkill) continue

    if (registrySkill.latest && registrySkill.latest !== local.version) {
      updates.push({
        slug: local.slug,
        name: local.name,
        current: local.version,
        latest: registrySkill.latest,
      })
    }
  }

  return updates
}
