# Manifest Token Matrix

This matrix records where each manifest-derived numeric value lives in the
rolecraft docs (`path`) and its current value (`current_value`).

Running `npm run generate:docs` (or `docs:build`/`docs:dev`) makes the script read
this table, compute the fresh value for every token from the manifest, replace the
old value at each recorded location, and update the `current_value` column.

When a new agent is added, instead of manually bumping `87` to `88`, just edit the
manifest and run the script — it updates every location automatically.

> **Note:** line numbers in the `path` column can go stale if lines are added or
> removed in a tracked file. The script verifies that the target line actually
> contains the `current_value` value; on a mismatch it fails loudly instead of
> silently corrupting the docs.

## Token sources

| token | source |
| --- | --- |
| `agent_count` | `src/agents/manifest.js` → total agent count |
| `verified_count` | `src/agents/manifest.js` → verified agent count |
| `community_count` | `src/agents/manifest.js` → community agent count |
| `legacy_count` | `src/agents/manifest.js` → legacy agent count |
| `experimental_count` | `src/agents/manifest.js` → experimental agent count |
| `mcp_agent_count` | `src/agents/manifest.js` → agents with MCP support |
| `test_count` | `src/**/*.test.js` + `bin/**/*.test.js` → total test cases |
| `unpacked_size` | `npm pack --dry-run` → unpacked size (kB) |
| `package_size` | `npm pack --dry-run` → package size (kB) |

## Matrix

| token | path | current_value |
| --- | --- | --- |
| agent_count | apps.json:18 | 87 |
| agent_count | apps.json:19 | 87 |
| agent_count | apps.json:40 | 87 |
| unpacked_size | benchmark/RESULTS.md:42 | 397.4 kB |
| test_count | CONTRIBUTING.md:12 | 1004 |
| agent_count | docs/agents.md:99 | 87 |
| agent_count | docs/commands/agents.md:47 | 87 |
| agent_count | docs/commands/agents.md:71 | 87 |
| agent_count | docs/commands/agents.md:79 | 87 |
| agent_count | docs/commands/doctor.md:25 | 87 |
| agent_count | docs/commands/doctor.md:60 | 87 |
| agent_count | docs/commands/doctor.md:77 | 87 |
| unpacked_size | docs/comparison.md:10 | 397.4 kB |
| agent_count | docs/comparison.md:11 | 87 |
| agent_count | docs/guides/getting-started.md:18 | 87 |
| verified_count | docs/guides/getting-started.md:18 | 27 |
| agent_count | docs/index.md:7 | 87 |
| verified_count | docs/index.md:7 | 27 |
| unpacked_size | docs/index.md:26 | 397.4 kB |
| agent_count | docs/index.md:38 | 87 |
| verified_count | docs/index.md:38 | 27 |
| unpacked_size | docs/migration-from-skills.md:10 | 397.4 kB |
| agent_count | docs/migration-from-skills.md:11 | 87 |
| agent_count | docs/migration-from-skills.md:55 | 87 |
| agent_count | docs/reference.md:161 | 87 |
| agent_count | package.json:4 | 87 |
| agent_count | README.md:9 | 87 |
| verified_count | README.md:9 | 27 |
| unpacked_size | README.md:54 | 397.4 kB |
| verified_count | README.md:54 | 27 |
| unpacked_size | README.md:88 | 397.4 kB |
| agent_count | README.md:90 | 87 |
| test_count | README.md:162 | 1004 |
| agent_count | SKILL.md:5 | 87 |
| verified_count | SKILL.md:5 | 27 |
| agent_count | SKILL.md:10 | 87 |
| verified_count | SKILL.md:10 | 27 |
| agent_count | SKILL.md:86 | 87 |
| verified_count | SKILL.md:86 | 27 |
