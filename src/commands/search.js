let runFetch = globalThis.fetch

export function setFetch(fn) {
  runFetch = fn
}

export async function searchCommand(query) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+filename:SKILL.md&per_page=20&sort=stars`

  let response
  try {
    response = await runFetch(url, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    throw new Error('Failed to search GitHub. Check your internet connection.')
  }

  if (response.status === 403) {
    console.log('\n⚠️  GitHub API rate limit reached. Try again later or use a local source.\n')
    return
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.items.length === 0) {
    console.log(`\nNo skills found for "${query}".`)
    return
  }

  console.log(`\n🔍 Search results for "${query}":\n`)
  for (const repo of data.items) {
    const desc = repo.description || 'No description'
    console.log(`   ${repo.full_name}`)
    console.log(`   ├─ ${desc}`)
    console.log(`   ├─ ⭐ ${repo.stargazers_count}  📝 ${repo.language || 'N/A'}`)
    console.log(`   └─ rolecraft install ${repo.full_name}`)
    console.log()
  }
  console.log(`${data.items.length} result(s) found.`)
}
