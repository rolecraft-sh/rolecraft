import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { resolveSource } from '../src/utils/resolver.js'
import { installSkill } from '../src/utils/installer.js'
import { getAgentManifest } from '../src/agents.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_PATH = resolve(ROOT, 'benchmark/results.json')

const ITERATIONS = 10
const GITHUB_SOURCE = 'rolecraft-sh/skills'

function createFixture(dir) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---
slug: bench-skill
name: Benchmark Skill
description: A test skill for installation benchmarking
---
`,
  )
  writeFileSync(join(dir, 'test.js'), 'export const foo = "bar"\n')
}

function formatMs(ms) {
  return `${ms.toFixed(2)} ms`
}

function cleanAgents() {
  for (const name of [
    'bench-skill',
    'task-decomposer',
    'rolecraft-sh-skills',
  ]) {
    const p = join(process.env.HOME, '.agents', 'skills', name)
    try {
      rmSync(p, { recursive: true, force: true })
    } catch {}
  }
}

async function bench(label, fn, baselineAvg) {
  const times = []
  for (let i = 0; i < ITERATIONS; i++) {
    cleanAgents()
    const start = performance.now()
    await fn()
    const elapsed = performance.now() - start
    times.push(elapsed)
  }
  const sorted = [...times].sort((a, b) => a - b)
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const p50 = sorted[Math.floor(sorted.length * 0.5)]
  const ratio = baselineAvg ? avg / baselineAvg : 1
  console.log(
    `  ${label.padEnd(25)} avg ${formatMs(avg).padStart(9)}  min ${formatMs(min).padStart(9)}  ` +
      `max ${formatMs(max).padStart(9)}  p50 ${formatMs(p50).padStart(9)}  ${ratio.toFixed(2)}x`,
  )
  return { avg, min, max, p50, ratio }
}

function header(label) {
  console.log(`  ── ${label} ──`)
  console.log(
    `  ${'Tool'.padEnd(25)} ${'avg'.padStart(9)} ${'min'.padStart(9)} ${'max'.padStart(9)} ${'p50'.padStart(9)} ${'vs rolecraft'.padStart(10)}`,
  )
  console.log(
    `  ${'─'.repeat(25)} ${'─'.repeat(9)} ${'─'.repeat(9)} ${'─'.repeat(9)} ${'─'.repeat(9)} ${'─'.repeat(10)}`,
  )
}

async function main() {
  const fixtureDir = mkdtempSync(join(tmpdir(), 'rc-bench-fixture-'))
  createFixture(fixtureDir)

  console.log(
    `\n  ⚡ Install benchmark (${ITERATIONS} runs each, lower is better)\n`,
  )
  console.log(
    `  Source: local folder (SKILL.md + 1 JS file) & ${GITHUB_SOURCE}\n`,
  )

  // ── local install ──
  header('Local path install')

  const rcLocal = await bench('rolecraft', async () => {
    const resolved = await resolveSource(fixtureDir)
    await installSkill(resolved, ['project'], 'copy')
  })

  const vercelLocal = await bench(
    'skills (Vercel)',
    async () => {
      execSync(`npx --yes skills add ${fixtureDir} --yes --copy 2>/dev/null`, {
        stdio: 'pipe',
        timeout: 30000,
        cwd: '/tmp',
      })
    },
    rcLocal.avg,
  )

  console.log(
    `  ${'@agentskill.sh/cli'.padEnd(25)}  ${'─'.repeat(9)}  ${'─'.repeat(9)}  ${'─'.repeat(9)}  ${'─'.repeat(9)}  ${'N/A'.padStart(10)}`,
  )
  console.log(`  ${'→ not supported (marketplace-only)'.padStart(70)}\n`)

  // ── GitHub install ──
  header(`GitHub install (${GITHUB_SOURCE})`)

  const rcGh = await bench('rolecraft', async () => {
    const resolved = await resolveSource(GITHUB_SOURCE)
    await installSkill(resolved, ['project'], 'copy')
  })

  const vercelGh = await bench(
    'skills (Vercel)',
    async () => {
      execSync(
        `npx --yes skills add ${GITHUB_SOURCE} --yes --copy 2>/dev/null`,
        { stdio: 'pipe', timeout: 60000, cwd: '/tmp' },
      )
    },
    rcGh.avg,
  )

  await bench(
    '@agentskill.sh/cli',
    async () => {
      execSync(
        `echo "1" | npx --yes @agentskill.sh/cli install ${GITHUB_SOURCE} 2>/dev/null`,
        { stdio: 'pipe', timeout: 120000, cwd: '/tmp' },
      )
    },
    rcGh.avg,
  )

  console.log()

  // Write results.json
  const manifest = getAgentManifest()
  const agentCount = manifest.length

  const results = {
    date: new Date().toISOString().slice(0, 10),
    node: process.version,
    os: `${process.platform} (${process.arch})`,
    iterations: ITERATIONS,
    local: {
      rolecraft: rcLocal,
      vercel: vercelLocal,
      agentskill: null,
      localRatio: Number.parseFloat(vercelLocal.ratio.toFixed(2)),
    },
    github: {
      rolecraft: rcGh,
      vercel: vercelGh,
      agentskill: null,
      githubRatio: Number.parseFloat(vercelGh.ratio.toFixed(2)),
    },
    agents: {
      rolecraft: agentCount,
    },
  }

  writeFileSync(DATA_PATH, `${JSON.stringify(results, null, 2)}\n`)
  console.log(`  📊 benchmark/results.json written`)

  rmSync(fixtureDir, { recursive: true, force: true })
}

main().catch(console.error)
