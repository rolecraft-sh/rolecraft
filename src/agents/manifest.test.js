import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getAgentManifest,
  getAgentManifestByFlag,
  getAgentsBySupportLevel,
  getAgentsWithMcp,
  validateManifest,
  SUPPORT_LEVELS,
} from './manifest.js'
import { generateAgentsDocs } from '../../scripts/generate-agents-docs.js'
import {
  getTokenValues,
  parseMatrix,
  applyMatrix,
} from '../../scripts/generate-docs.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('agent manifest', () => {
  it('returns all agents with required fields', () => {
    const manifest = getAgentManifest()
    assert.ok(manifest.length > 0)
    for (const agent of manifest) {
      assert.ok(agent.flag, `missing flag for ${agent.name}`)
      assert.ok(agent.name, 'missing name')
      assert.ok(agent.skillInstallScope, `missing scope for ${agent.name}`)
      assert.ok(agent.supportLevel, `missing support level for ${agent.name}`)
      assert.ok(agent.label, `missing label for ${agent.name}`)
    }
  })

  it('includes opencode as verified', () => {
    const manifest = getAgentManifest()
    const opencode = manifest.find((a) => a.name === 'opencode')
    assert.ok(opencode)
    assert.equal(opencode.supportLevel, SUPPORT_LEVELS.VERIFIED)
    assert.equal(opencode.mcpSupport.supported, true)
  })

  it('includes claude-code as verified with MCP', () => {
    const manifest = getAgentManifest()
    const cc = manifest.find((a) => a.name === 'claude-code')
    assert.ok(cc)
    assert.equal(cc.supportLevel, SUPPORT_LEVELS.VERIFIED)
    assert.equal(cc.mcpSupport.supported, true)
    assert.ok(cc.docUrl)
  })

  it('includes oh-my-pi as verified with MCP and native paths', () => {
    const manifest = getAgentManifest()
    const omp = manifest.find((a) => a.name === 'oh-my-pi')
    assert.ok(omp)
    assert.equal(omp.flag, 'omp')
    assert.equal(omp.supportLevel, SUPPORT_LEVELS.VERIFIED)
    assert.equal(omp.skillInstallScope, 'global ~/.omp/agent/skills')
    assert.equal(omp.mcpSupport.supported, true)
    assert.equal(omp.mcpSupport.format, 'mcpServers')
    assert.equal(omp.instructionFormat, 'skill-md')
    assert.ok(omp.docUrl)
    assert.ok(omp.lastVerified)
  })

  it('flags shared-directory agents with aliasFor', () => {
    const shared = getAgentManifest().filter((a) => a.aliasFor)
    assert.ok(shared.length > 0)
    for (const agent of shared) {
      assert.equal(agent.skillInstallScope, 'global ~/.agents/skills')
      assert.ok(
        [SUPPORT_LEVELS.VERIFIED, SUPPORT_LEVELS.EXPERIMENTAL].includes(
          agent.supportLevel,
        ),
      )
    }
  })

  it('getAgentManifestByFlag returns correct agent', () => {
    const agent = getAgentManifestByFlag('claude')
    assert.ok(agent)
    assert.equal(agent.name, 'claude-code')
    assert.equal(agent.mcpSupport.supported, true)
  })

  it('getAgentManifestByFlag returns null for unknown flag', () => {
    assert.equal(getAgentManifestByFlag('nonexistent'), null)
  })

  it('getAgentsBySupportLevel groups correctly', () => {
    const groups = getAgentsBySupportLevel()
    assert.ok(groups[SUPPORT_LEVELS.VERIFIED].length > 0)
    assert.ok(groups[SUPPORT_LEVELS.COMMUNITY].length >= 0)
    assert.ok(groups[SUPPORT_LEVELS.EXPERIMENTAL].length > 0)

    const allCount = Object.values(groups).reduce((sum, g) => sum + g.length, 0)
    assert.equal(allCount, getAgentManifest().length)
  })

  it('getAgentsWithMcp returns only MCP-enabled agents', () => {
    const mcpAgents = getAgentsWithMcp()
    assert.ok(mcpAgents.length > 0)
    for (const agent of mcpAgents) {
      assert.equal(agent.mcpSupport.supported, true)
      assert.ok(agent.mcpSupport.format)
    }
  })

  it('validateManifest reports valid for current data', () => {
    const result = validateManifest()
    assert.ok(result.valid)
    assert.equal(result.agentCount, getAgentManifest().length)
    assert.equal(result.issues.length, 0)
  })

  it('docs/agents.md matches generated content from manifest', () => {
    const docsPath = join(__dirname, '..', '..', 'docs', 'agents.md')
    const current = readFileSync(docsPath, 'utf-8')
    const generated = generateAgentsDocs()
    if (current !== generated) {
      console.error('docs/agents.md is out of sync with manifest.')
      console.error('Run: node scripts/generate-agents-docs.js')
      const currentLines = current.split('\n')
      const generatedLines = generated.split('\n')
      for (
        let i = 0;
        i < Math.max(currentLines.length, generatedLines.length);
        i++
      ) {
        if (currentLines[i] !== generatedLines[i]) {
          console.error(`Line ${i + 1} differs:`)
          console.error(`  current:   ${currentLines[i]?.trimEnd()}`)
          console.error(`  generated: ${generatedLines[i]?.trimEnd()}`)
          break
        }
      }
    }
    assert.equal(current, generated)
  })

  it('matrix token values match the manifest and npm pack', () => {
    const manifest = getAgentManifest()
    const tokens = getTokenValues()
    assert.equal(tokens.agent_count, String(manifest.length))
    const groups = getAgentsBySupportLevel()
    assert.equal(
      tokens.verified_count,
      String(groups[SUPPORT_LEVELS.VERIFIED].length),
    )
    assert.equal(
      tokens.experimental_count,
      String(groups[SUPPORT_LEVELS.EXPERIMENTAL].length),
    )
    assert.equal(tokens.mcp_agent_count, String(getAgentsWithMcp().length))
    assert.match(tokens.unpacked_size, /^[\d.]+ kB$/)
  })

  it('manifest matrix documents every tracked location with current values', () => {
    const matrixPath = join(__dirname, '..', '..', 'MANIFEST-MATRIX.md')
    const md = readFileSync(matrixPath, 'utf-8')
    const rows = parseMatrix(md)
    assert.ok(rows.length > 0, 'matrix should have tracked rows')

    const tokens = getTokenValues()
    for (const row of rows) {
      // every documented value must match the current manifest-derived value
      assert.equal(
        row.value,
        tokens[row.token],
        `stale value for ${row.token} @ ${row.file}:${row.line}`,
      )
      // the location must actually contain that value
      const filePath = join(__dirname, '..', '..', row.file)
      const lines = readFileSync(filePath, 'utf-8').split('\n')
      const line = lines[row.line - 1]
      assert.ok(line, `missing line ${row.line} in ${row.file}`)
      if (/[\d.]+ kB/.test(row.value)) {
        assert.ok(
          line.includes(row.value),
          `${row.token} value not on ${row.file}:${row.line}`,
        )
      } else {
        const re = new RegExp(`(?<!\\w)${row.value}(?!\\w)`)
        assert.match(
          line,
          re,
          `${row.token} value not on ${row.file}:${row.line}`,
        )
      }
    }
  })

  it('applying the matrix while in sync is a no-op', () => {
    const matrixPath = join(__dirname, '..', '..', 'MANIFEST-MATRIX.md')
    const md = readFileSync(matrixPath, 'utf-8')
    const { changes } = applyMatrix(md, getTokenValues(), true)
    assert.equal(changes.length, 0)
  })

  it('applying the matrix updates a changed token point-accurately', () => {
    const matrixPath = join(__dirname, '..', '..', 'MANIFEST-MATRIX.md')
    const md = readFileSync(matrixPath, 'utf-8')
    const rows = parseMatrix(md)
    const tokens = getTokenValues()
    tokens.agent_count = '999'
    const { changes, updatedRows } = applyMatrix(md, tokens, true)
    assert.ok(changes.length > 0)
    assert.equal(
      updatedRows.filter((r) => r.token === 'agent_count' && r.value === '999')
        .length,
      rows.filter((r) => r.token === 'agent_count').length,
    )
    // unrelated tokens stay untouched
    for (const row of rows.filter((r) => r.token !== 'agent_count')) {
      assert.equal(
        updatedRows.find((u) => u.token === row.token && u.line === row.line)
          .value,
        row.value,
      )
    }
  })
})
