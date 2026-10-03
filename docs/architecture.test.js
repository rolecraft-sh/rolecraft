import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const REPO_ROOT = join(import.meta.dirname, '..')
const DOC = join(REPO_ROOT, 'docs', 'architecture.md')

function moduleNames(...dirs) {
  const names = new Set()
  for (const dir of dirs) {
    for (const entry of readdirSync(join(REPO_ROOT, dir))) {
      if (!entry.endsWith('.js') || entry.endsWith('.test.js')) continue
      names.add(entry)
    }
  }
  return names
}

describe('docs/architecture.md', () => {
  it('lists every module under src/api, src/commands and src/utils', () => {
    const content = readFileSync(DOC, 'utf-8')
    const missing = [
      ...moduleNames('src/api', 'src/commands', 'src/utils'),
    ].filter((name) => !content.includes(name))

    assert.deepEqual(
      missing,
      [],
      `docs/architecture.md omits: ${missing.join(', ')}. Add the module to the project structure tree.`,
    )
  })

  it('documents src/agents.js and the agents manifest', () => {
    const content = readFileSync(DOC, 'utf-8')

    assert.ok(content.includes('agents.js'), 'agents.js is not documented')
    assert.ok(
      content.includes('manifest.js'),
      'agents/manifest.js is not documented',
    )
  })

  it('does not describe rolecraft ci as a frozen install', () => {
    const content = readFileSync(DOC, 'utf-8')

    assert.ok(
      !content.includes('frozen lockfile install'),
      'ci is not a frozen lockfile install — it re-resolves sources live and has no --frozen mode',
    )
  })

  it('does not claim the scanner reads every file in the skill', () => {
    const content = readFileSync(DOC, 'utf-8')

    assert.ok(
      !content.includes('on all skill files'),
      'nested files are neither installed nor scanned — see #325',
    )
  })
})
