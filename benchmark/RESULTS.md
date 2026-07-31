# Benchmark Results

> Run `npm run benchmark` to reproduce on your machine and regenerate the SVG chart.
>
> **Environment:** Node.js v24.18.0, macOS (darwin, arm64)
> **Fixture (local):** SKILL.md + 1 JS file (2 files, 78 bytes)
> **Fixture (GitHub):** [`rolecraft-sh/skills`](https://github.com/rolecraft-sh/skills)
> **Iterations:** 10 per tool per scenario
> **Date:** 2026-07-28

<p align="center">
  <img src="https://raw.githubusercontent.com/rolecraft-sh/rolecraft/main/benchmark/comparison.svg" alt="Benchmark comparison chart" width="800">
</p>

## Local path install

| Tool               | avg          | min         | max          | p50          | vs rolecraft |
| ------------------ | ------------ | ----------- | ------------ | ------------ | ------------ |
| **rolecraft**      | **15.34 ms** | **4.33 ms** | **57.00 ms** | **12.83 ms** | **1.00x**    |
| skills (Vercel)    | 4622.61 ms   | 4036.72 ms  | 7761.70 ms   | 4303.50 ms   | **301.40x**  |
| @agentskill.sh/cli | —            | —           | —            | —            | N/A          |

> `@agentskill.sh/cli` is marketplace-only and does not support local paths.

## GitHub install (`rolecraft-sh/skills`)

| Tool               | avg            | min            | max            | p50            | vs rolecraft |
| ------------------ | -------------- | -------------- | -------------- | -------------- | ------------ |
| **rolecraft**      | **1366.86 ms** | **1301.34 ms** | **1506.12 ms** | **1357.13 ms** | **1.00x**    |
| skills (Vercel)    | 13327.47 ms    | 11773.34 ms    | 17290.04 ms    | 12524.37 ms    | **9.75x**    |
| @agentskill.sh/cli | —              | —              | —              | —              | **failed**   |

> `@agentskill.sh/cli` fetches the skill but exits with an error during the agent detection phase. The install does not complete successfully.

## Key takeaways

| Scenario             | rolecraft       | Vercel skills            | @agentskill.sh/cli |
| -------------------- | --------------- | ------------------------ | ------------------ |
| Local skill install  | ✅ **15.34 ms** | ✅ 4623 ms (301x slower) | ❌ not supported   |
| GitHub skill install | ✅ **1.4 s**    | ✅ 13.3 s (9.8x slower)  | ❌ fails (bug)     |
| Zero dependencies    | ✅ **0**        | ❌ 1 dep                 | ❌ 2 deps          |
| Package size         | **87.4 kB**     | ~465 KB                  | ~84 KB             |
