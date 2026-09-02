#!/usr/bin/env node
/**
 * Run `node --test` with the spec reporter and count the total tests.
 * Writes the count to .test-count-cache.json so generate-docs can read it
 * without re-running tests.
 */
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CACHE_FILE = join(ROOT, '.test-count-cache.json')

try {
  // Run tests with spec reporter, capture output
  // Note: tests may fail (exit code != 0), we still want the count
  let output = ''
  try {
    output = execSync('node --test --test-concurrency=1 2>&1', {
      encoding: 'utf-8',
      cwd: ROOT,
      timeout: 300_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (execError) {
    // Tests may fail but still produce valid output with test count
    output = execError.stdout || ''
  }

  // Parse "ℹ tests NNN" from the spec reporter output
  const match = output.match(/ℹ tests (\d+)/)
  if (match) {
    const count = Number(match[1])
    writeFileSync(
      CACHE_FILE,
      `${JSON.stringify({ count, timestamp: Date.now() })}\n`,
    )
    console.error(`Cached test count: ${count}`)
  } else {
    console.error('Could not parse test count from output')
    process.exit(1)
  }
} catch (error) {
  console.error('Failed to count tests:', error.message)
  process.exit(1)
}
