import { UserError } from './errors.js'

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
        throw new UserError(
          'GitHub API rate limit reached while accessing the registry.',
          {
            suggestion:
              'Set GITHUB_TOKEN to increase your rate limit. Create a token at: https://github.com/settings/tokens',
            code: 'REGISTRY_RATE_LIMIT',
          },
        )
      }
      if (body.message?.includes('Not Found')) {
        throw new UserError('Registry not found.', {
          suggestion:
            'The registry repository may not be initialized yet. Check https://github.com/rolecraft-sh/registry',
          code: 'REGISTRY_NOT_FOUND',
        })
      }
    }
    throw new UserError('Could not reach the skill registry.', {
      suggestion: 'Check your internet connection and try again.',
      detail: `Registry API returned HTTP ${res.status}`,
      code: 'REGISTRY_API_ERROR',
    })
  }

  const data = await res.json()
  if (data.type !== 'file' || !data.content) {
    throw new UserError('Registry index.json is corrupted.', {
      code: 'REGISTRY_CORRUPT',
    })
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
  { slug, name, repo, description, version, category },
  token,
) {
  const t = token || getToken()
  if (!t) {
    throw new UserError('GitHub token required to publish to the registry.', {
      suggestion:
        'Create a token at https://github.com/settings/tokens (scope: repo), then set: export GITHUB_TOKEN=ghp_xxx',
      code: 'PUBLISH_NO_TOKEN',
    })
  }

  const headers = authHeaders(t)
  const ver = version || 'v1.0.0'

  const userRes = await runFetch('https://api.github.com/user', { headers })
  if (!userRes.ok)
    throw new UserError(
      'GitHub authentication failed. Check your GITHUB_TOKEN.',
      { code: 'PUBLISH_AUTH_FAILED' },
    )
  const user = await userRes.json()
  const username = user.login

  const branchName = `publish/${slug}-${ver.replace(/^v/, '')}`

  const indexRes = await runFetch(
    `https://api.github.com/repos/${REGISTRY_OWNER}/${REGISTRY_REPO}/contents/index.json?ref=${REGISTRY_BRANCH}`,
    { headers },
  )
  if (!indexRes.ok) throw new Error('Failed to fetch current registry index')
  const fileData = await indexRes.json()
  const currentSha = fileData.sha

  const refRes = await runFetch(
    `https://api.github.com/repos/${REGISTRY_OWNER}/${REGISTRY_REPO}/git/refs/heads/${REGISTRY_BRANCH}`,
    { headers },
  )
  if (!refRes.ok) throw new Error('Failed to fetch upstream ref')
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
  if (category) entry.category = category

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

  let repoOwner = REGISTRY_OWNER
  let branchSha = upstreamSha
  let contentSha = currentSha

  const branchRes = await runFetch(
    `https://api.github.com/repos/${repoOwner}/${REGISTRY_REPO}/git/refs`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: branchSha,
      }),
    },
  )

  if (branchRes.status === 403) {
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

    repoOwner = username

    const forkRefRes = await runFetch(
      `https://api.github.com/repos/${repoOwner}/${REGISTRY_REPO}/git/refs/heads/${REGISTRY_BRANCH}`,
      { headers },
    )
    if (!forkRefRes.ok) {
      const errBody = await forkRefRes.text().catch(() => '')
      throw new Error(
        `Failed to fetch fork ref: ${forkRefRes.status}${errBody ? ` — ${errBody}` : ''}`,
      )
    }
    const forkRefData = await forkRefRes.json()
    branchSha = forkRefData.object.sha

    const forkContentRes = await runFetch(
      `https://api.github.com/repos/${repoOwner}/${REGISTRY_REPO}/contents/index.json?ref=${REGISTRY_BRANCH}`,
      { headers },
    )
    if (!forkContentRes.ok) {
      const errBody = await forkContentRes.text().catch(() => '')
      throw new Error(
        `Failed to fetch fork index.json: ${forkContentRes.status}${errBody ? ` — ${errBody}` : ''}`,
      )
    }
    const forkFileData = await forkContentRes.json()
    contentSha = forkFileData.sha

    const forkBranchRes = await runFetch(
      `https://api.github.com/repos/${repoOwner}/${REGISTRY_REPO}/git/refs`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: branchSha,
        }),
      },
    )
    if (!forkBranchRes.ok) {
      const errBody = await forkBranchRes.text().catch(() => '')
      throw new Error(
        `Failed to create branch in fork: ${forkBranchRes.status}${errBody ? ` — ${errBody}` : ''}`,
      )
    }
  } else if (!branchRes.ok) {
    const errBody = await branchRes.text().catch(() => '')
    throw new Error(
      `Failed to create branch: ${branchRes.status}${errBody ? ` — ${errBody}` : ''}`,
    )
  }

  const putRes = await runFetch(
    `https://api.github.com/repos/${repoOwner}/${REGISTRY_REPO}/contents/index.json`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `publish: ${slug} ${ver}`,
        content: Buffer.from(newContent).toString('base64'),
        sha: contentSha,
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

  const prHead =
    repoOwner === REGISTRY_OWNER ? branchName : `${username}:${branchName}`

  const prRes = await runFetch(
    `https://api.github.com/repos/${REGISTRY_OWNER}/${REGISTRY_REPO}/pulls`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `publish: ${name} (${slug})`,
        body: `Publishes **${name}** (\`${slug}\`) ${ver}\n\nRepo: \`${repo}\`\nAuthor: @${username}`,
        head: prHead,
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
