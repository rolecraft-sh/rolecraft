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
  generateReadme,
  generateComparison,
  generateBenchmark,
} from '../../scripts/generate-readme.js'

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

  it('README.md matches generated content from manifest tokens', () => {
    const filePath = join(__dirname, '..', '..', 'README.md')
    const current = readFileSync(filePath, 'utf-8')
    const generated = generateReadme()
    if (current !== generated) {
      console.error('README.md is out of sync with manifest data.')
      console.error('Run: node scripts/generate-readme.js')
    }
    assert.equal(current, generated)
  })

  it('docs/comparison.md matches generated content from manifest tokens', () => {
    const filePath = join(__dirname, '..', '..', 'docs', 'comparison.md')
    const current = readFileSync(filePath, 'utf-8')
    const generated = generateComparison()
    if (current !== generated) {
      console.error('docs/comparison.md is out of sync with manifest data.')
      console.error('Run: node scripts/generate-readme.js')
    }
    assert.equal(current, generated)
  })

  it('benchmark/RESULTS.md matches generated content from manifest tokens', () => {
    const filePath = join(__dirname, '..', '..', 'benchmark', 'RESULTS.md')
    const current = readFileSync(filePath, 'utf-8')
    const generated = generateBenchmark()
    if (current !== generated) {
      console.error('benchmark/RESULTS.md is out of sync with manifest data.')
      console.error('Run: node scripts/generate-readme.js')
    }
    assert.equal(current, generated)
  })
})
