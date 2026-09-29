#!/usr/bin/env node
/**
 * Add contributor attribution to existing GitHub release notes.
 *
 * GitHub renders the Contributors avatar list from the @mentions in a release
 * body, so a release whose notes never mention anyone never shows one. This
 * backfills ` by @login in #PR` onto every entry of every published release,
 * matching each line back to its commit through the `(#123)` reference the
 * squash-merge subjects already carry.
 *
 * Reads commit authors from the compare API, so it reflects what GitHub
 * recorded at merge time rather than whatever the local clone has.
 *
 * Usage:
 *   node scripts/backfill-release-contributors.mjs            # rewrite releases
 *   node scripts/backfill-release-contributors.mjs --dry-run  # print only
 */

import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REPO = process.env.GITHUB_REPOSITORY || 'rolecraft-sh/rolecraft'
const DRY_RUN = process.argv.includes('--dry-run')

function gh(args) {
  return execFileSync('gh', args, {
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  })
}

const api = (path) => JSON.parse(gh(['api', path]))

/** Oldest first, so each release is paired with the one before it. */
function byVersion(a, b) {
  const parse = (tag) => tag.replace(/^v/, '').split('.').map(Number)
  const [x, y] = [parse(a), parse(b)]
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

const isBot = (login) => !login || login.endsWith('[bot]')

/**
 * Map PR number to the GitHub login that authored it.
 *
 * Squash-merged subjects end in `(#123)`, which is the only stable link
 * between a changelog line and a commit — the line text has had its
 * conventional-commit prefix stripped by release-prep.sh, but the PR
 * reference survives.
 */
function collectAuthors(previousTag, tag) {
  const { commits } = api(`repos/${REPO}/compare/${previousTag}...${tag}`)
  const byPr = new Map()

  for (const commit of commits) {
    const login = commit.author?.login
    if (isBot(login)) continue

    const pr = commit.commit.message.match(/\(#(\d+)\)/)
    if (pr) byPr.set(pr[1], login)
  }

  return byPr
}

/**
 * Append attribution to every line that names a PR we have an author for.
 *
 * The PR reference moves to the end of the line rather than being repeated:
 * the subject already ends in `(#123)`, so crediting `... by @who in #123`
 * alongside it would say the same thing twice. It becomes a link, since
 * `#123` does not autolink in a release body.
 *
 * Lines that already carry a ` by @` are left alone, so re-running is a no-op.
 */
function attributeBody(body, byPr) {
  return body
    .split('\n')
    .map((line) => {
      if (!line.startsWith('- ')) return line
      if (/ by @/.test(line)) return line

      const pr = line.match(/\(#(\d+)\)/)
      if (!pr) return line

      const login = byPr.get(pr[1])
      if (!login) return line

      return `${line.replace(/\s*\(#\d+\)$/, '')} by @${login} in [#${pr[1]}](https://github.com/${REPO}/pull/${pr[1]})`
    })
    .join('\n')
}

const releases = api(`repos/${REPO}/releases?per_page=100`).sort((a, b) =>
  byVersion(a.tag_name, b.tag_name),
)

let changed = 0

for (let i = 1; i < releases.length; i++) {
  const previousTag = releases[i - 1].tag_name
  const release = releases[i]
  const tag = release.tag_name

  // The first release has no predecessor, so there is no delta to credit.
  if (release.body === undefined) continue

  const byPr = collectAuthors(previousTag, tag)
  const next = attributeBody(release.body, byPr)

  if (next === release.body) {
    console.log(`skip   ${tag}  (nothing to attribute)`)
    continue
  }

  const added = next.split('\n').filter((l) => / by @/.test(l)).length
  const before = release.body.split('\n').filter((l) => / by @/.test(l)).length

  if (DRY_RUN) {
    console.log(
      `dry    ${tag}  (+${added - before} entries, ${byPr.size} PR authors)`,
    )
    for (const line of next
      .split('\n')
      .filter((l) => l.startsWith('- ') && / by @/.test(l))) {
      console.log(`         ${line}`)
    }
    continue
  }

  const file = join(tmpdir(), `release-notes-${tag}.md`)
  writeFileSync(file, next, 'utf-8')
  gh(['release', 'edit', tag, '--repo', REPO, '--notes-file', file])
  changed++
  console.log(`update ${tag}  (+${added - before} entries)`)
}

console.log(
  `\n${DRY_RUN ? 'Dry run: nothing was written' : `Updated ${changed} release(s)`}`,
)
