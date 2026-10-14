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
| agent_count | docs/commands/agents.md:51 | 90 |
| agent_count | docs/commands/agents.md:75 | 90 |
| agent_count | docs/commands/agents.md:83 | 90 |
| agent_count | docs/commands/doctor.md:29 | 90 |
| agent_count | docs/commands/doctor.md:64 | 90 |
| agent_count | docs/commands/doctor.md:81 | 90 |
| agent_count | docs/comparison.md:15 | 90 |
| agent_count | docs/comparison.md:58 | 90 |
| verified_count | docs/faq.md:13 | 65 |
| agent_count | docs/faq.md:13 | 90 |
| agent_count | docs/faq.md:21 | 90 |
| agent_count | docs/glossary.md:41 | 90 |
| verified_count | docs/glossary.md:41 | 65 |
| agent_count | docs/guides/getting-started.md:22 | 90 |
| verified_count | docs/guides/getting-started.md:22 | 65 |
| verified_count | docs/index.md:32 | 65 |
| agent_count | docs/index.md:63 | 90 |
| verified_count | docs/index.md:63 | 65 |
| agent_count | docs/migration-from-skills.md:14 | 90 |
| agent_count | docs/migration-from-skills.md:59 | 90 |
| agent_count | docs/reference.md:223 | 90 |
| agent_count | package.json:4 | 90 |
| agent_count | README.md:9 | 90 |
| verified_count | README.md:9 | 65 |
| verified_count | README.md:55 | 65 |
| agent_count | README.md:91 | 90 |
| agent_count | SKILL.md:5 | 90 |
| verified_count | SKILL.md:5 | 65 |
| agent_count | SKILL.md:10 | 90 |
| verified_count | SKILL.md:10 | 65 |
| agent_count | SKILL.md:86 | 90 |
| verified_count | SKILL.md:86 | 65 |
