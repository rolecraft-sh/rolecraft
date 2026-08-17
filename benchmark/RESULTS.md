# Benchmark Results

> Run `npm run benchmark` to reproduce on your machine and regenerate the SVG chart.
>
> **Environment:** Node.js v24.18.0, macOS (darwin, arm64)
> **Fixture (local):** SKILL.md + 1 JS file (2 files, 78 bytes)
> **Fixture (GitHub):** [`rolecraft-sh/skills`](https://github.com/rolecraft-sh/skills)
> **Iterations:** 10 per tool per scenario
> **Date:** 2026-08-17

<p align="center">
  <img src="https://raw.githubusercontent.com/rolecraft-sh/rolecraft/main/benchmark/comparison.svg" alt="Benchmark comparison chart" width="800">
</p>

## Local path install

| Tool               | avg          | min         | max          | p50          | vs rolecraft |
| ------------------ | ------------ | ----------- | ------------ | ------------ | ------------ |
| **rolecraft**      | **10.23 ms** | **5.56 ms** | **16.95 ms** | **9.05 ms**  | **1.00x**    |
| skills (Vercel)    | 3893.83 ms   | 3574.97 ms  | 4527.98 ms   | 3868.26 ms   | **380.68x**  |
| @agentskill.sh/cli | —            | —           | —            | —            | N/A          |

> `@agentskill.sh/cli` is marketplace-only and does not support local paths.

## GitHub install (`rolecraft-sh/skills`)

| Tool               | avg            | min            | max            | p50            | vs rolecraft |
| ------------------ | -------------- | -------------- | -------------- | -------------- | ------------ |
| **rolecraft**      | **1578.82 ms** | **1436.98 ms** | **1773.16 ms** | **1574.09 ms** | **1.00x**    |
| skills (Vercel)    | 10949.90 ms    | 10235.08 ms    | 11554.33 ms    | 11065.96 ms    | **6.94x**    |
| @agentskill.sh/cli | —              | —              | —              | —              | **failed**   |

> `@agentskill.sh/cli` fetches the skill but exits with an error during the agent detection phase. The install does not complete successfully.

## Key takeaways

| Scenario             | rolecraft         | Vercel skills             | @agentskill.sh/cli |
| -------------------- | ----------------- | ------------------------- | ------------------ |
| Local skill install  | ✅ **10.23 ms**   | ✅ 3894 ms (381x slower)  | ❌ not supported   |
| GitHub skill install | ✅ **1.6 s**      | ✅ 10.9 s (6.9x slower)   | ❌ fails (bug)     |
| Zero dependencies    | ✅ **0**          | ❌ 1 dep                  | ❌ 2 deps          |
| Package size         | **107.3 kB**      | ~465 KB                   | ~84 KB             |