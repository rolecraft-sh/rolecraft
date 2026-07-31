#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getAgentManifest } from '../src/agents/manifest.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tokenizedFiles = [
  'README.md',
  'docs/comparison.md',
  'benchmark/RESULTS.md',
].map((f) => join(__dirname, '..', f))

function getAgentTokens() {
  const manifest = getAgentManifest()
  const groups = { verified: [], community: [], legacy: [], experimental: [] }
  for (const a of manifest) {
    if (groups[a.supportLevel]) groups[a.supportLevel].push(a)
  }
  const mcpAgents = manifest.filter((a) => a.mcpSupport.supported)
  return {
    AGENT_COUNT: String(manifest.length),
    VERIFIED_COUNT: String(groups.verified.length),
    COMMUNITY_COUNT: String(groups.community.length),
    LEGACY_COUNT: String(groups.legacy.length),
    EXPERIMENTAL_COUNT: String(groups.experimental.length),
    MCP_AGENT_COUNT: String(mcpAgents.length),
  }
}

let _packageSizeTokens = null

function getPackageSizeTokens() {
  if (_packageSizeTokens) return _packageSizeTokens
  try {
    const output = execSync('npm pack --dry-run 2>&1', {
      encoding: 'utf-8',
      cwd: join(__dirname, '..'),
    })
    const sizeMatch = output.match(/package size:\s*([\d.]+)\s*kB/)
    const unpackedMatch = output.match(/unpacked size:\s*([\d.]+)\s*kB/)
    _packageSizeTokens = {
      PACKAGE_SIZE: sizeMatch ? `${sizeMatch[1]} kB` : '?',
      UNPACKED_SIZE: unpackedMatch ? `${unpackedMatch[1]} kB` : '?',
    }
  } catch {
    _packageSizeTokens = { PACKAGE_SIZE: '?', UNPACKED_SIZE: '?' }
  }
  return _packageSizeTokens
}

/**
 * Replace {{TOKEN}} placeholders in a string with values from manifest + package size
 */
function replaceTokens(text) {
  const tokens = { ...getAgentTokens(), ...getPackageSizeTokens() }
  let result = text
  for (const [key, value] of Object.entries(tokens)) {
    result = result.replaceAll(`{{${key}}}`, value)
  }
  return result
}

/**
 * Generate README.md from template with token replacement
 */
export function generateReadme() {
  const template = readFileSync(tokenizedFiles[0], 'utf-8')
  return replaceTokens(template)
}

export function generateComparison() {
  const template = readFileSync(tokenizedFiles[1], 'utf-8')
  return replaceTokens(template)
}

export function generateBenchmark() {
  const template = readFileSync(tokenizedFiles[2], 'utf-8')
  return replaceTokens(template)
}

function main() {
  const files = [
    { path: tokenizedFiles[0], content: generateReadme(), label: 'README.md' },
    {
      path: tokenizedFiles[1],
      content: generateComparison(),
      label: 'docs/comparison.md',
    },
    {
      path: tokenizedFiles[2],
      content: generateBenchmark(),
      label: 'benchmark/RESULTS.md',
    },
  ]
  for (const file of files) {
    writeFileSync(file.path, file.content, 'utf-8')
    const sizeKb = (Buffer.byteLength(file.content, 'utf-8') / 1024).toFixed(1)
    console.log(`Generated ${file.label} (${sizeKb} KB)`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
