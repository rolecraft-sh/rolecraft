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

## Matrix

| token | path | current_value |
| --- | --- | --- |
| agent_count | apps.json:18 | 90 |
| agent_count | apps.json:19 | 90 |
| agent_count | apps.json:40 | 90 |
| agent_count | docs/agents.md:102 | 90 |
| agent_count | docs/commands/agents.md:47 | 90 |
| agent_count | docs/commands/agents.md:71 | 90 |
| agent_count | docs/commands/agents.md:79 | 90 |
| agent_count | docs/commands/doctor.md:25 | 90 |
| agent_count | docs/commands/doctor.md:60 | 90 |
| agent_count | docs/commands/doctor.md:77 | 90 |
| agent_count | docs/comparison.md:10 | 90 |
| agent_count | docs/guides/getting-started.md:18 | 90 |
| verified_count | docs/guides/getting-started.md:18 | 34 |
| agent_count | docs/index.md:7 | 90 |
| verified_count | docs/index.md:7 | 34 |
| agent_count | docs/index.md:38 | 90 |
| verified_count | docs/index.md:38 | 34 |
| agent_count | docs/migration-from-skills.md:10 | 90 |
| agent_count | docs/migration-from-skills.md:54 | 90 |
| agent_count | docs/reference.md:218 | 90 |
| agent_count | package.json:4 | 90 |
| agent_count | README.md:9 | 90 |
| verified_count | README.md:9 | 34 |
| verified_count | README.md:54 | 34 |
| agent_count | README.md:90 | 90 |
| agent_count | SKILL.md:5 | 90 |
| verified_count | SKILL.md:5 | 34 |
| agent_count | SKILL.md:10 | 90 |
| verified_count | SKILL.md:10 | 34 |
| agent_count | SKILL.md:86 | 90 |
| verified_count | SKILL.md:86 | 34 |
