# Benchmark Results

> Run `npm run benchmark` to reproduce on your machine and regenerate the SVG chart.
>
> **Environment:** Node.js v24.18.0, macOS (darwin, arm64)
> **Fixture (local):** SKILL.md + 1 JS file (2 files, 78 bytes)
> **Fixture (GitHub):** [`sametcelikbicak/coverage-guard`](https://github.com/sametcelikbicak/coverage-guard)
> **Iterations:** 10 per tool per scenario
> **Date:** 2026-09-11

<p align="center">
  <img src="https://raw.githubusercontent.com/rolecraft-sh/rolecraft/main/benchmark/comparison.svg" alt="Benchmark comparison chart" width="800">
</p>

## Local path install

| Tool               | avg          | min         | max          | p50          | vs rolecraft |
| ------------------ | ------------ | ----------- | ------------ | ------------ | ------------ |
| **rolecraft**      | **10.91 ms** | **5.70 ms** | **26.09 ms** | **7.63 ms**  | **1.00x**    |
| skills (Vercel)    | 4452.66 ms   | 3888.73 ms  | 5301.21 ms   | 4443.95 ms   | **408.24x**  |
| @agentskill.sh/cli | —            | —           | —            | —            | N/A          |

> `@agentskill.sh/cli` is marketplace-only and does not support local paths.

## GitHub install (`sametcelikbicak/coverage-guard`)

| Tool               | avg            | min            | max            | p50            | vs rolecraft |
| ------------------ | -------------- | -------------- | -------------- | -------------- | ------------ |
| **rolecraft**      | **2798.58 ms** | **2228.26 ms** | **3418.14 ms** | **2807.17 ms** | **1.00x**    |
| skills (Vercel)    | 8590.53 ms     | 7466.56 ms     | 11932.52 ms    | 8232.37 ms     | **3.07x**    |
| @agentskill.sh/cli | —              | —              | —              | —              | **failed**   |

> `@agentskill.sh/cli` fetches the skill but exits with an error during the agent detection phase. The install does not complete successfully.

## Key takeaways

| Scenario             | rolecraft          | Vercel skills             | @agentskill.sh/cli |
| -------------------- | ------------------ | ------------------------- | ------------------ |
| Local skill install  | ✅ **10.91 ms**    | ✅ 4453 ms (408x slower)  | ❌ not supported   |
| GitHub skill install | ✅ **2.8 s**       | ✅ 8.6 s (3.1x slower)    | ❌ fails (bug)     |
| Zero dependencies    | ✅ **0**           | ❌ 1 dep                  | ❌ 2 deps          |
| Package size         | **373.1 kB**       | ~465 KB                   | ~84 KB             |