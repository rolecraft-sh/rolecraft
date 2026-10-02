#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getAgentManifest } from '../src/agents/manifest.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MATRIX_FILE = join(ROOT, 'MANIFEST-MATRIX.md')

/**
 * Compute the current (fresh) value for every known token from the agent
 * manifest. Used to update docs locations tracked in the matrix.
 */
export function getTokenValues() {
  const manifest = getAgentManifest()
  const groups = { verified: [], community: [], legacy: [], experimental: [] }
  for (const a of manifest) {
    if (groups[a.supportLevel]) groups[a.supportLevel].push(a)
  }
  const mcpAgents = manifest.filter((a) => a.mcpSupport.supported)
  return {
    agent_count: String(manifest.length),
    verified_count: String(groups.verified.length),
    community_count: String(groups.community.length),
    legacy_count: String(groups.legacy.length),
    experimental_count: String(groups.experimental.length),
    mcp_agent_count: String(mcpAgents.length),
  }
}

const TOKEN_NAME_RE = /^[a-z_]+$/

/**
 * Parse the matrix rows from MANIFEST-MATRIX.md.
 * Returns an array of { token, file, line, value } for the matrix table.
 */
export function parseMatrix(md) {
  const rows = []
  for (const line of md.split('\n')) {
    const m = line.match(
      /^\|\s*([a-z_]+)\s*\|\s*([\w./-]+):(\d+)\s*\|\s*(.+?)\s*\|\s*$/,
    )
    if (!m) continue
    const token = m[1]
    const file = m[2]
    const lineNum = Number(m[3])
    const value = m[4].trim()
    if (!TOKEN_NAME_RE.test(token)) continue
    rows.push({ token, file, line: lineNum, value })
  }
  return rows
}

/**
 * Format the matrix markdown with updated values. Rebuilds the matrix table
 * from the parsed rows so values are always in sync and alignment is stable.
 */
export function renderMatrix(rows) {
  const header = `# Manifest Token Matrix

This matrix records where each manifest-derived numeric value lives in the
rolecraft docs (\`path\`) and its current value (\`current_value\`).

Running \`npm run generate:docs\` (or \`docs:build\`/\`docs:dev\`) makes the script read
this table, compute the fresh value for every token from the manifest, replace the
old value at each recorded location, and update the \`current_value\` column.

When a new agent is added, instead of manually bumping \`87\` to \`88\`, just edit the
manifest and run the script — it updates every location automatically.

> **Note:** line numbers in the \`path\` column can go stale if lines are added or
> removed in a tracked file. The script verifies that the target line actually
> contains the \`current_value\` value; on a mismatch it fails loudly instead of
> silently corrupting the docs.

## Token sources

| token | source |
| --- | --- |
| \`agent_count\` | \`src/agents/manifest.js\` → total agent count |
| \`verified_count\` | \`src/agents/manifest.js\` → verified agent count |
| \`community_count\` | \`src/agents/manifest.js\` → community agent count |
| \`legacy_count\` | \`src/agents/manifest.js\` → legacy agent count |
| \`experimental_count\` | \`src/agents/manifest.js\` → experimental agent count |
| \`mcp_agent_count\` | \`src/agents/manifest.js\` → agents with MCP support |

## Matrix

| token | path | current_value |
| --- | --- | --- |
`
  const body = rows
    .map((r) => `| ${r.token} | ${r.file}:${r.line} | ${r.value} |`)
    .join('\n')
  return `${header}${body}\n`
}

/**
 * Replace value at a recorded source line (1-indexed) with newValue.
 *
 * The recorded line is a hint, not a guarantee. Two things routinely move it:
 * `generate:docs` regenerates docs/agents.md before this runs, which inserts a
 * row per agent and shifts every tracked line below it, and apps.json's count
 * is written by that same first step, so the old value is already gone by the
 * time we get here. Both used to abort the whole run, which is why adding an
 * agent needed a hand edit.
 *
 * So: try the recorded line, then search outward nearest-first for one still
 * holding the old value, and treat a line already carrying the new value as
 * done. Returns the new content and the line actually written, so the matrix
 * can record where the value ended up rather than keeping a stale number.
 */
function replaceInLine(content, lineNum, oldValue, newValue, token, file) {
  const lines = content.split('\n')

  // Unit-style values ("434.5 kB") are matched as literal substrings (word
  // boundaries don't apply to decimals/units); numeric counts are matched as
  // whole words so we never touch a neighboring number (e.g. 87 vs 27).
  const isUnitValue = /[\d.]+ kB/.test(oldValue)
  const valueRe = (v, flags) =>
    isUnitValue ? null : new RegExp(`(?<!\\w)${escapeRegex(v)}(?!\\w)`, flags)
  const countIn = (line) =>
    isUnitValue
      ? line.split(oldValue).length - 1
      : (line.match(valueRe(oldValue, 'g')) || []).length
  const hasIn = (line, v) =>
    isUnitValue ? line.includes(v) : valueRe(v, '').test(line)

  const write = (idx) => {
    const occurrences = countIn(lines[idx])
    if (occurrences === 0) return false
    if (occurrences > 1) {
      throw new Error(
        `[${token}] ${file}:${idx + 1} — "${oldValue}" occurs ${occurrences} times on this line. Specify a more precise location in the matrix.`,
      )
    }
    lines[idx] = isUnitValue
      ? lines[idx].replace(oldValue, newValue)
      : lines[idx].replace(valueRe(oldValue, ''), newValue)
    return true
  }

  const start = lineNum - 1
  if (start < 0 || start >= lines.length) {
    throw new Error(
      `[${token}] ${file}:${lineNum} — line out of range. Update the matrix.`,
    )
  }

  // Already current — a sibling generator wrote the fresh value first.
  if (countIn(lines[start]) === 0 && hasIn(lines[start], newValue)) {
    return { content, line: lineNum }
  }

  if (write(start)) return { content: lines.join('\n'), line: lineNum }

  const WINDOW = 200
  for (let d = 1; d <= WINDOW; d++) {
    for (const idx of [start - d, start + d]) {
      if (idx < 0 || idx >= lines.length) continue
      if (write(idx)) return { content: lines.join('\n'), line: idx + 1 }
    }
  }

  // Nothing still holds the old value anywhere near the recorded line, so this
  // location was both shifted and already rewritten. Find where the new value
  // ended up and record that instead.
  for (let d = 1; d <= WINDOW; d++) {
    for (const idx of [start - d, start + d]) {
      if (idx < 0 || idx >= lines.length) continue
      if (hasIn(lines[idx], newValue)) return { content, line: idx + 1 }
    }
  }

  throw new Error(
    `[${token}] ${file}:${lineNum} — could not find "${oldValue}" or "${newValue}" within ±${WINDOW} lines. Update the matrix.`,
  )
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Apply every matrix row: replace the old value with the fresh token value at
 * the recorded location. Mutates the files and returns the updated matrix rows.
 * When dryRun is true, nothing is written and changes are printed.
 */
export function applyMatrix(matrixMd, tokenValues, dryRun = false) {
  const rows = parseMatrix(matrixMd)
  const updatedRows = []
  const changes = []

  // Group rows by file so each file is read once and written once.
  const byFile = new Map()
  for (const row of rows) {
    if (!byFile.has(row.file)) byFile.set(row.file, [])
    byFile.get(row.file).push(row)
  }

  for (const [file, fileRows] of byFile) {
    const filePath = join(ROOT, file)
    let content = readFileSync(filePath, 'utf-8')
    let modified = false

    for (const row of fileRows) {
      const newValue = tokenValues[row.token]
      if (newValue === undefined) {
        throw new Error(
          `[${row.token}] unknown token. Add it to getTokenValues().`,
        )
      }
      let recordedLine = row.line
      if (newValue !== row.value) {
        const result = replaceInLine(
          content,
          row.line,
          row.value,
          newValue,
          row.token,
          file,
        )
        // Take the line even when nothing was written: a row can be already up
        // to date yet sitting at a new offset, and recording the stale number
        // would re-resolve it on every future run.
        recordedLine = result.line
        if (result.content !== content) {
          content = result.content
          modified = true
          changes.push(
            `${file}:${recordedLine}  ${row.token}: ${row.value} → ${newValue}`,
          )
        }
      }
      // Record where the value actually lives, not where it used to: rows
      // shifted by a regeneration would otherwise be re-resolved every run.
      updatedRows.push({ ...row, line: recordedLine, value: newValue })
    }

    if (modified && !dryRun) {
      writeFileSync(filePath, content, 'utf-8')
    }
  }

  return { updatedRows, changes }
}

/**
 * Update MANIFEST-MATRIX.md and all tracked docs locations from the manifest.
 * Returns the list of changes. When dryRun is true nothing is written.
 */
export function generateAll(dryRun = false) {
  const matrixMd = readFileSync(MATRIX_FILE, 'utf-8')
  const tokenValues = getTokenValues()
  const { updatedRows, changes } = applyMatrix(matrixMd, tokenValues, dryRun)
  if (!dryRun) {
    writeFileSync(
      MATRIX_FILE,
      renderMatrix(updatedRows.sort(sortRows)),
      'utf-8',
    )
  }
  return { changes, updatedRows }
}

function sortRows(a, b) {
  if (a.file !== b.file) return a.file.localeCompare(b.file)
  return a.line - b.line
}

function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || args.includes('--dryRun')
  const { changes } = generateAll(dryRun)

  if (changes.length === 0) {
    console.log('All values are up to date. No changes were made.')
    return
  }

  if (dryRun) {
    console.log('(dry-run) Values that would be updated:')
  } else {
    console.log('Updated:')
  }
  for (const change of changes) {
    console.log(`  ${change}`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
