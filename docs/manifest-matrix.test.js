import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getTokenValues, parseMatrix } from '../scripts/generate-docs.js'

const REPO_ROOT = join(import.meta.dirname, '..')
const MATRIX = 'MANIFEST-MATRIX.md'

const readMatrix = () =>
  parseMatrix(readFileSync(join(REPO_ROOT, MATRIX), 'utf-8'))

const trackedFiles = () =>
  execFileSync(
    'git',
    ['ls-files', 'README.md', 'SKILL.md', 'docs/', '*.json'],
    {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    },
  )
    .split('\n')
    .filter((f) => /\.(md|json)$/.test(f))

/**
 * Find counts that only mean "an agent total" when read next to agent words.
 *
 * Deliberately narrow: a bare number in prose is not drift, and flagging every
 * one of them would bury the real failures. What actually drifted was always a
 * count sitting beside "agents" or "verified".
 */
function agentCountClaims(file, values) {
  const content = readFileSync(join(REPO_ROOT, file), 'utf-8')
  const found = []
  for (const [token, value] of Object.entries(values)) {
    if (token !== 'agent_count' && token !== 'verified_count') continue
    const re = new RegExp(
      `(?:\\b${value}\\b[^\\n]{0,40}\\b(?:agents?|verified)\\b` +
        `|\\b(?:agents?|verified)\\b[^\\n]{0,40}\\b${value}\\b)`,
      'gi',
    )
    for (const match of content.matchAll(re)) {
      const line = content.slice(0, match.index).split('\n').length
      found.push({
        token,
        value,
        line,
        text: match[0].trim().replace(/\s+/g, ' '),
      })
    }
  }
  return found
}

describe('MANIFEST-MATRIX.md', () => {
  const tokenValues = getTokenValues()

  it('tracks every manifest-derived count that appears in the docs', () => {
    const tracked = new Set(
      readMatrix().map((row) => `${row.file}:${row.line}`),
    )
    const untracked = []

    for (const file of trackedFiles()) {
      for (const claim of agentCountClaims(file, tokenValues)) {
        const location = `${file}:${claim.line}`
        if (tracked.has(location)) continue
        untracked.push(`${location}  ${claim.text}`)
      }
    }

    assert.deepEqual(
      untracked,
      [],
      `Manifest-derived counts appear outside MANIFEST-MATRIX.md:\n${untracked.join(
        '\n',
      )}\n\nAdd the location to the matrix, or reword the sentence if the number\nis not the manifest total.`,
    )
  })

  it('records the live value for every matrix row', () => {
    const stale = readMatrix().filter(
      (row) => row.value !== tokenValues[row.token] && tokenValues[row.token],
    )
    assert.deepEqual(
      stale.map((r) => `${r.token} ${r.file}:${r.line} = ${r.value}`),
      [],
      'Run `npm run generate:docs` to refresh the matrix and its targets.',
    )
  })
})
