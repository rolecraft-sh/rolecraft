# Benchmark Results

> Run `node benchmark/install-speed.js` to reproduce on your machine.
>
> **Environment:** Node.js v22.18.0, macOS
> **Fixture (local):** SKILL.md + 1 JS file (2 files, 78 bytes)
> **Fixture (GitHub):** [`sametcelikbicak/task-decomposer`](https://github.com/sametcelikbicak/task-decomposer)
> **Iterations:** 10 per tool per scenario

<p align="center">
  <img src="https://raw.githubusercontent.com/rolecraft-sh/rolecraft/main/benchmark/comparison.svg" alt="Benchmark comparison chart" width="800">
</p>

## Local path install

| Tool | avg | min | max | p50 | vs rolecraft |
|------|-----|-----|-----|-----|-------------|
| **rolecraft** | **9.83 ms** | **5.16 ms** | **15.23 ms** | **9.60 ms** | **1.00x** |
| skills (Vercel) | 4263.29 ms | 3964.79 ms | 4960.78 ms | 4267.36 ms | **433.78x** |
| @agentskill.sh/cli | — | — | — | — | N/A |

> `@agentskill.sh/cli` is marketplace-only and does not support local paths.

## GitHub install (`sametcelikbicak/task-decomposer`)

| Tool | avg | min | max | p50 | vs rolecraft |
|------|-----|-----|-----|-----|-------------|
| **rolecraft** | **4186.74 ms** | **3499.20 ms** | **4843.22 ms** | **4380.64 ms** | **1.00x** |
| skills (Vercel) | 10024.51 ms | 8668.28 ms | 11556.99 ms | 9986.56 ms | **2.39x** |
| @agentskill.sh/cli | — | — | — | — | **failed** |

> `@agentskill.sh/cli` fetches the skill but exits with `Error: Unknown agent: antigravity-cli` during the agent detection phase. The install does not complete successfully.

## Key takeaways

| Scenario | rolecraft | Vercel skills | @agentskill.sh/cli |
|----------|-----------|---------------|-------------------|
| Local skill install | ✅ **9.83 ms** | ✅ 4263 ms (434x slower) | ❌ not supported |
| GitHub skill install | ✅ **4.2 s** | ✅ 10.0 s (2.4x slower) | ❌ fails (bug) |
| Zero dependencies | ✅ **0** | ❌ 1 dep | ❌ 2 deps |
| Package size | **~4 KB** | ~465 KB | ~84 KB |
