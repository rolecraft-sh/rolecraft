# Benchmark Results

> Run `npm run benchmark` to reproduce on your machine and regenerate the SVG chart.
>
> **Environment:** Node.js v24.18.0, macOS (darwin, x64)
> **Fixture (local):** SKILL.md + 1 JS file (2 files, 78 bytes)
> **Fixture (GitHub):** [`sametcelikbicak/coverage-guard`](https://github.com/sametcelikbicak/coverage-guard)
> **Iterations:** 10 per tool per scenario
> **Date:** 2026-10-09

## What these numbers do and do not measure

The ratio below is not a like-for-like comparison of install logic, and the
gap is worth roughly two orders of magnitude:

- **`npx skills` is invoked as `npx --yes skills add …` on every iteration.**
  That re-resolves and re-downloads the package from the registry each time, so
  its column includes **npm package acquisition**, not skill installation. With
  the package already cached locally it is substantially faster.
- **rolecraft is measured in-process.** Its column calls `installSkill()`
  directly, so it excludes Node startup (~115 ms floor, ~290 ms as shipped) and
  process spawn.

Two runs on the same machine on the same day produced local ratios of **356x**
and **266x** — a 34% spread from nothing but run-to-run variance and npm cache
state. The local scenario is small enough that a few milliseconds of noise
dominates the ratio. Read the absolute column values, and re-run before quoting
a figure.

The install work itself is the part this project controls: single-digit to
~20 ms for a local skill. What `npx skills` spends that time on once
acquisition is excluded is not measured here — adding that measurement would
need a second run with the package pre-cached.

<p align="center">
  <img src="https://raw.githubusercontent.com/rolecraft-sh/rolecraft/main/benchmark/comparison.svg" alt="Benchmark comparison chart" width="800">
</p>

## Local path install

| Tool               | avg            | min            | max            | p50            | vs rolecraft |
| ------------------ | -------------- | -------------- | -------------- | -------------- | ------------ |
| **rolecraft**      | **17.56 ms**   | **7.65 ms**    | **38.65 ms**   | **12.56 ms**   | **1.00x**    |
| skills (Vercel)    | 4665.86 ms     | 4288.63 ms     | 4914.45 ms     | 4677.49 ms     | **265.74x**  |
| @agentskill.sh/cli | —              | —              | —              | —              | N/A          |

> `@agentskill.sh/cli` is marketplace-only and does not support local paths.

## GitHub install (`sametcelikbicak/coverage-guard`)

| Tool               | avg            | min            | max            | p50            | vs rolecraft |
| ------------------ | -------------- | -------------- | -------------- | -------------- | ------------ |
| **rolecraft**      | **2553.22 ms** | **2207.98 ms** | **3065.89 ms** | **2587.09 ms** | **1.00x**    |
| skills (Vercel)    | 8219.69 ms     | 6981.81 ms     | 8909.28 ms     | 8429.06 ms     | **3.22x**    |
| @agentskill.sh/cli | 5432.83 ms     | 4594.18 ms     | 6822.82 ms     | 5501.85 ms     | **2.13x**    |

> `@agentskill.sh/cli` completed this run. Earlier runs of this benchmark
> recorded it as failing during agent detection, so treat its row as
> version-dependent rather than settled.

## Key takeaways

| Scenario             | rolecraft          | Vercel skills             | @agentskill.sh/cli |
| -------------------- | ------------------ | ------------------------- | ------------------ |
| Local skill install  | ✅ **17.6 ms**     | ✅ 4666 ms                | ❌ not supported   |
| GitHub skill install | ✅ **2.6 s**       | ✅ 8.2 s                  | ✅ 5.4 s           |
| Zero dependencies    | ✅ **0**           | ❌ 1 dep                  | ❌ 2 deps          |