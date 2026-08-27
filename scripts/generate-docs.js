#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getAgentManifest } from '../src/agents/manifest.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MATRIX_FILE = join(ROOT, 'MANIFEST-MATRIX.md')

let _packageSizeTokens = null

function getPackageSizeTokens() {
  if (_packageSizeTokens) return _packageSizeTokens
  // Use `npm pack --dry-run --json`: sizes are emitted as clean JSON on stdout
  // (the noisy tarball listing goes to stderr), avoiding the intermittent
  // truncation flakiness of piping the merged `npm pack` output. Retry once for
  // transient failures and throw on persistent failure rather than writing a
  // "?" into the docs (which would silently corrupt them).
  const kB = (bytes) => `${(bytes / 1000).toFixed(1)} kB`
  let lastError = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const output = execSync('npm pack --dry-run --json 2>/dev/null', {
        encoding: 'utf-8',
        cwd: ROOT,
      })
      const [entry] = JSON.parse(output)
      if (entry && typeof entry.size === 'number' && entry.unpackedSize) {
        _packageSizeTokens = {
          package_size: kB(entry.size),
          unpacked_size: kB(entry.unpackedSize),
        }
        return _packageSizeTokens
      }
      lastError = new Error('npm pack --dry-run --json output missing sizes')
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(
    `Could not determine package sizes. Run \`npm pack --dry-run --json\` manually to debug. ${lastError?.message ?? ''}`,
  )
}

/**
 * Compute the current (fresh) value for every known token from the manifest
 * and npm package sizes. Used to update docs locations tracked in the matrix.
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
    ...getPackageSizeTokens(),
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
| \`unpacked_size\` | \`npm pack --dry-run\` → unpacked size (kB) |
| \`package_size\` | \`npm pack --dry-run\` → package size (kB) |

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
 * Replace value on a specific source line (1-indexed) with newValue.
 * Verifies the line actually contains the expected old value to avoid silently
 * corrupting docs when line numbers go stale. Returns the new file content.
 */
function replaceInLine(content, lineNum, oldValue, newValue, token, file) {
  const lines = content.split('\n')
  const idx = lineNum - 1
  if (!lines[idx]) {
    throw new Error(
      `[${token}] ${file}:${lineNum} — line not found. Update the matrix.`,
    )
  }
  const target = lines[idx]

  // Unit-style values ("434.5 kB") are matched as literal substrings (word
  // boundaries don't apply to decimals/units); numeric counts are matched as
  // whole words so we never touch a neighboring number (e.g. 87 vs 27).
  const isUnitValue = /[\d.]+ kB/.test(oldValue)
  const countOccurrences = () => {
    if (isUnitValue) return target.split(oldValue).length - 1
    const re = new RegExp(`(?<!\\w)${escapeRegex(oldValue)}(?!\\w)`, 'g')
    return (target.match(re) || []).length
  }
  const replaceFirst = () => {
    if (isUnitValue) return target.replace(oldValue, newValue)
    const re = new RegExp(`(?<!\\w)${escapeRegex(oldValue)}(?!\\w)`)
    return target.replace(re, newValue)
  }

  const occurrences = countOccurrences()
  if (occurrences === 0) {
    throw new Error(
      `[${token}] ${file}:${lineNum} — expected value not found (old: ${oldValue}). Line number may be stale; update MANIFEST-MATRIX.md.`,
    )
  }
  if (occurrences > 1) {
    throw new Error(
      `[${token}] ${file}:${lineNum} — "${oldValue}" occurs ${occurrences} times on this line. Specify a more precise location in the matrix.`,
    )
  }

  lines[idx] = replaceFirst()
  return lines.join('\n')
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
      if (newValue !== row.value) {
        const updated = replaceInLine(
          content,
          row.line,
          row.value,
          newValue,
          row.token,
          file,
        )
        if (updated !== content) {
          content = updated
          modified = true
          changes.push(
            `${file}:${row.line}  ${row.token}: ${row.value} → ${newValue}`,
          )
        }
      }
      updatedRows.push({ ...row, value: newValue })
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
