import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { detectAgents } from './agent-detection.js'

test('detects an installed agent by its skills directory', (t) => {
  const tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-agent-detect-'))
  const origHome = process.env.HOME
  process.env.HOME = tempDir
  t.after(() => {
    process.env.HOME = origHome
    rmSync(tempDir, { recursive: true, force: true })
  })

  mkdirSync(join(tempDir, '.agents', 'skills'), { recursive: true })

  const found = detectAgents()
  assert.ok(
    found.some((a) => a.flag === 'agents'),
    `expected 'agents' to be detected, got ${JSON.stringify(found.map((a) => a.flag))}`,
  )
})
