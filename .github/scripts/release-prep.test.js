/**
 * Tests for release-prep.sh (#369).
 *
 * The script rewrites CHANGELOG.md and package.json for every release, and it
 * only ever ran after a signed tag was already pushed, so a mistake in it
 * surfaced as a broken release rather than a failing check. These tests run it
 * against a throwaway git repo so that happens before a tag exists.
 *
 * Runs on both ubuntu-latest and macos-latest in CI on purpose: the script leans
 * on sed/grep, and those differ between GNU and BSD userlands.
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'release-prep.sh')
const REPO = 'rolecraft-sh/rolecraft'

const fixtures = []

after(() => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true })
})

// Isolate from the developer's own git config, which can carry signing keys,
// hooks and templates that would change the result between machines.
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
  GITHUB_REPOSITORY: REPO,
}

const V1_DATE = '2026-01-01T00:00:00Z'
const V2_DATE = '2026-02-01T00:00:00Z'

function git(dir, args, env = GIT_ENV) {
  return execFileSync('git', args, { cwd: dir, env, encoding: 'utf-8' })
}

// Puts a failing `gh` on PATH. gh prints its error body to stdout, and the
// script only redirects stderr, so without a stub the fixture would hit the
// real GitHub API — a network dependency in a test, and a source of CI flakes.
// The stub also lets the failure path be asserted instead of assumed.
function stubGh(dir) {
  const bin = join(dir, 'fake-bin')
  mkdirSync(bin, { recursive: true })
  const gh = join(bin, 'gh')
  writeFileSync(
    gh,
    [
      '#!/usr/bin/env bash',
      'echo \'{"message":"API rate limit exceeded","documentation_url":"https://docs.github.com/rest","status":"403"}\'',
      'exit 1',
      '',
    ].join('\n'),
  )
  chmodSync(gh, 0o755)
  return { ...GIT_ENV, PATH: `${bin}:${process.env.PATH}` }
}

function commit(dir, { message, login, date }) {
  const email = login
    ? `12345+${login}@users.noreply.github.com`
    : 'someone@example.com'
  // The committer date is what `git tag --sort=-creatordate` orders on, and the
  // script picks the previous tag with `sed -n '2p'`. Tags sharing a date make
  // that lookup non-deterministic, which silently yields an empty log range.
  const env = { ...GIT_ENV, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }
  git(
    dir,
    [
      '-c',
      `user.name=${login ?? 'Someone'}`,
      '-c',
      `user.email=${email}`,
      'commit',
      '--allow-empty',
      '--no-gpg-sign',
      '--no-verify',
      '-m',
      message,
    ],
    env,
  )
}

// Builds a repo with one prior release and commits spanning every category the
// script buckets, then runs the script against the new tag.
function makeFixture({ changelog = null, previousTag = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'rolecraft-release-prep-'))
  fixtures.push(dir)

  git(dir, ['init', '-q', '-b', 'main'])
  writeFileSync(
    join(dir, 'package.json'),
    `${JSON.stringify({ name: 'x', version: '1.0.0' }, null, 2)}\n`,
  )
  if (changelog) writeFileSync(join(dir, 'CHANGELOG.md'), changelog)

  commit(dir, {
    message: 'feat: initial skill support (#100)',
    login: 'alice',
    date: V1_DATE,
  })
  if (previousTag) git(dir, ['tag', 'v1.0.0'])

  commit(dir, {
    message: 'feat: add a thing (#101)',
    login: 'alice',
    date: V2_DATE,
  })
  commit(dir, {
    message: 'fix: correct a thing (#102)',
    login: 'bob',
    date: V2_DATE,
  })
  commit(dir, {
    message: 'docs: explain a thing',
    login: 'carol',
    date: V2_DATE,
  })
  commit(dir, {
    message: 'chore(deps): bump a dependency',
    login: 'dependabot[bot]',
    date: V2_DATE,
  })
  commit(dir, { message: 'chore: tidy a thing', login: 'alice', date: V2_DATE })
  commit(dir, {
    message: 'a thing with no conventional prefix (#103)',
    login: 'bob',
    date: V2_DATE,
  })
  // A real address cannot be recovered from the commit, so this is the only
  // commit that reaches the API lookup.
  commit(dir, {
    message: 'chore: internal housekeeping',
    login: null,
    date: V2_DATE,
  })

  // The script runs after the release tag exists in production, so it has to
  // exist here too or `git log <range>` finds nothing.
  git(dir, ['tag', 'v2.0.0'])

  const env = stubGh(dir)
  execFileSync('bash', [SCRIPT, 'v2.0.0'], { cwd: dir, env })

  return {
    changelog: readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8'),
    pkg: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')),
  }
}

test('release-prep.sh is syntactically valid', () => {
  // Option 1 in #369. Cheap, and it keeps a broken script from taking the whole
  // fixture suite down with a parse error instead of a real assertion.
  assert.doesNotThrow(() =>
    execFileSync('bash', ['-n', SCRIPT], { env: GIT_ENV, encoding: 'utf-8' }),
  )
})

test('buckets commits by conventional-commit type and credits authors', () => {
  const { changelog, pkg } = makeFixture()

  assert.equal(pkg.version, '2.0.0')
  assert.match(changelog, /^## \[v2\.0\.0\] - \d{4}-\d{2}-\d{2}$/m)

  // Sections, in the order the script emits them.
  const sections = [...changelog.matchAll(/^### (.+)$/gm)].map((m) => m[1])
  assert.deepEqual(sections, [
    'Added',
    'Fixed',
    'Changed',
    'Documentation',
    'Other',
  ])

  // An author with a recoverable noreply login is credited by @mention, and the
  // PR the subject already names is referenced once, at the end of the line.
  assert.match(
    changelog,
    /^- add a thing by @alice in \[#101]\(https:\/\/github\.com\/rolecraft-sh\/rolecraft\/pull\/101\)$/m,
  )

  // The type prefix is dropped from the line, and the PR reference is not
  // repeated once the credit is appended.
  assert.doesNotMatch(changelog, /^- fix: correct a thing/m)
  assert.doesNotMatch(changelog, /^- add a thing \(#101\)/m)

  // Uncategorized subjects keep their whole subject.
  assert.match(
    changelog,
    /^- a thing with no conventional prefix by @bob in \[#103]\(.*pull\/103\)$/m,
  )

  // A bot still appears in the changelog — it is a real change — it just gets
  // no @mention, because a bot avatar next to a human's reads as noise.
  assert.match(changelog, /^- bump a dependency$/m)
  assert.doesNotMatch(changelog, /bump a dependency by @/)

  // An unresolvable author is listed without a credit...
  assert.match(changelog, /^- internal housekeeping$/m)
  // ...and gh's error body must not leak in, since gh prints it to stdout and
  // the script only redirects stderr.
  assert.doesNotMatch(changelog, /"documentation_url"|API rate limit exceeded/)
})

test('creates a changelog when the repo has none yet', () => {
  const { changelog, pkg } = makeFixture({
    changelog: null,
    previousTag: false,
  })

  assert.equal(pkg.version, '2.0.0')
  assert.match(changelog, /^# Changelog\n/)
  assert.match(changelog, /## \[v2\.0\.0]/)
})

test('inserts a new entry below the changelog header, above the previous one', () => {
  const existing =
    '# Changelog\n\nAll notable changes.\n\n## [v1.0.0] - 2026-01-01\n\n### Added\n\n- initial skill support by @alice in [#100](https://github.com/rolecraft-sh/rolecraft/pull/100)\n'
  const { changelog } = makeFixture({ changelog: existing })

  assert.ok(changelog.startsWith('# Changelog\n\nAll notable changes.\n\n'))
  const newEntry = changelog.indexOf('## [v2.0.0]')
  const oldEntry = changelog.indexOf('## [v1.0.0]')
  assert.ok(
    newEntry > 0 && oldEntry > newEntry,
    'new entry must sit above the old one',
  )
  assert.match(changelog, /- initial skill support by @alice in \[#100]/)
})
