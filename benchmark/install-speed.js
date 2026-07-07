import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { install } from '../src/utils/installer.js'

const ITERATIONS = 50

function formatMs(ms) {
  return ms.toFixed(2).padStart(7) + ' ms'
}

async function run() {
  const tmpDir = mkdtempSync(join(tmpdir(), 'rolecraft-bench-'))

  const times = []
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now()
    await install(
      join(import.meta.dirname, '..', 'test', 'fixtures', 'test-skill'),
      { homeDir: tmpDir },
    )
    const elapsed = performance.now() - start
    times.push(elapsed)
  }

  times.sort((a, b) => a - b)
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = times[0]
  const max = times[times.length - 1]
  const p50 = times[Math.floor(times.length * 0.5)]
  const p95 = times[Math.floor(times.length * 0.95)]
  const p99 = times[Math.floor(times.length * 0.99)]

  console.log(`\n  rolecraft install benchmark (${ITERATIONS} runs)\n`)
  console.log(`  avg    ${formatMs(avg)}`)
  console.log(`  min    ${formatMs(min)}`)
  console.log(`  max    ${formatMs(max)}`)
  console.log(`  p50    ${formatMs(p50)}`)
  console.log(`  p95    ${formatMs(p95)}`)
  console.log(`  p99    ${formatMs(p99)}\n`)
}

run().catch(console.error)
