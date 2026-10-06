import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
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
import AGENTS_DATA from '../agents.js'
import {
  getTokenValues,
  parseMatrix,
  applyMatrix,
  renderMatrix,
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

  it('validateManifest catches duplicate registry keys', () => {
    const [agent] = getAgentManifest()
    const result = validateManifest([agent, { ...agent }])

    assert.equal(result.valid, false)
    assert.ok(result.issues.some((i) => i.issue.includes('duplicate flag')))
    assert.ok(result.issues.some((i) => i.issue.includes('duplicate name')))
  })

  it('validateManifest requires verified-agent metadata', () => {
    const result = validateManifest([
      {
        flag: 'example',
        name: 'example',
        label: '~/.example/skills/',
        supportLevel: SUPPORT_LEVELS.VERIFIED,
      },
    ])

    assert.equal(result.valid, false)
    assert.ok(
      result.issues.some((i) =>
        i.issue.includes('missing lastVerified for verified agent'),
      ),
    )
    assert.ok(
      result.issues.some((i) =>
        i.issue.includes('missing docUrl for verified agent'),
      ),
    )
    assert.ok(
      result.issues.some((i) =>
        i.issue.includes('missing skillInstallScope for verified agent'),
      ),
    )
    assert.ok(
      result.issues.some((i) =>
        i.issue.includes('missing instructionFormat for verified agent'),
      ),
    )
  })

  // A verified entry is a claim that we read the vendor's page. The path is
  // the load-bearing half of that claim, so pin the ones that were corrected
  // against their docs rather than letting a later edit drift back silently.
  it('records the documented path for agents whose paths were corrected', () => {
    const expected = {
      antigravity: {
        dir: join(homedir(), '.gemini', 'config', 'skills'),
        docUrl: 'https://antigravity.google/docs/skills',
      },
      'antigravity-cli': {
        dir: join(homedir(), '.gemini', 'antigravity-cli', 'skills'),
        docUrl: 'https://antigravity.google/docs/skills',
      },
      grok: {
        dir: join(homedir(), '.grok', 'skills'),
        docUrl: 'https://docs.x.ai/build/features/skills-plugins-marketplaces',
      },
      muse: {
        dir: join(homedir(), '.config', 'muse', 'skills'),
        docUrl:
          'https://meta-models.github.io/muse-code-sdk/next/guides/extend/skills/',
      },
      posit: {
        dir: join(homedir(), '.posit', 'assistant', 'skills'),
        docUrl: 'http://assistant.posit.co/docs/features/skills',
      },
      zcode: {
        dir: join(homedir(), '.zcode', 'skills'),
        docUrl: 'https://zcode.z.ai/en/docs/skill',
      },
      pochi: {
        dir: join(homedir(), '.pochi', 'skills'),
        docUrl: 'https://docs.getpochi.com/skills',
      },
    }

    for (const [flag, { dir, docUrl }] of Object.entries(expected)) {
      const agent = getAgentManifestByFlag(flag)
      assert.ok(agent, `${flag} must exist in the manifest`)
      assert.equal(agent.supportLevel, SUPPORT_LEVELS.VERIFIED, flag)
      assert.equal(agent.docUrl, docUrl, `${flag} must cite its vendor docs`)
      assert.ok(agent.lastVerified, `${flag} needs a verification date`)
      const entry = AGENTS_DATA.find((a) => a.flag === flag)
      assert.equal(entry.getDir(), dir, `${flag} path`)
    }
  })

  it('validateManifest requires MCP-enabled agents to declare a format', () => {
    const result = validateManifest([
      {
        flag: 'example',
        name: 'example',
        label: '~/.example/skills/',
        mcpSupport: { supported: true },
      },
    ])

    assert.equal(result.valid, false)
    assert.ok(result.issues.some((i) => i.issue.includes('missing MCP format')))
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

  it('matrix token values match the agent manifest', () => {
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
  })

  it('manifest matrix documents every tracked location with current values', () => {
    const matrixPath = join(__dirname, '..', '..', 'MANIFEST-MATRIX.md')
    const md = readFileSync(matrixPath, 'utf-8')
    const rows = parseMatrix(md)
    assert.ok(rows.length > 0, 'matrix should have tracked rows')

    // Every tracked value must match the current manifest here, on every branch
    // and in CI.
    //
    // This used to be checked on `main` only, with .github/workflows/docs-sync.yml
    // repairing the values after each merge. That made `main` red on every code
    // change, and the repair PR had to pass this same flaky gate, so a single
    // flake could deadlock `main` indefinitely. Checking pre-merge instead means
    // the values are correct before the merge, and no repair step is needed.
    //
    // It is affordable because the only tokens left are agent counts, which
    // change only when an agent is added. The pre-commit hook stays lenient:
    // `npm pack` and file sizes are not reproducible on every machine.
    const tokens = getTokenValues()
    for (const row of rows) {
      // the location must actually exist
      const filePath = join(__dirname, '..', '..', row.file)
      const lines = readFileSync(filePath, 'utf-8').split('\n')
      const line = lines[row.line - 1]
      assert.ok(line, `missing line ${row.line} in ${row.file}`)

      // every documented value must match the current manifest-derived value
      assert.equal(
        row.value,
        tokens[row.token],
        `stale value for ${row.token} @ ${row.file}:${row.line}`,
      )

      // and that value must still be present at the location it is tracked at
      const re = new RegExp(`(?<!\\w)${row.value}(?!\\w)`)
      assert.match(
        line,
        re,
        `${row.token} value not on ${row.file}:${row.line}`,
      )
    }
  })

  it('tracks every published agent-count claim in the manifest matrix', () => {
    const matrixPath = join(__dirname, '..', '..', 'MANIFEST-MATRIX.md')
    const rows = parseMatrix(readFileSync(matrixPath, 'utf-8'))
    const tracked = new Set(
      rows
        .filter((row) => row.token === 'agent_count')
        .map((row) => `${row.file}:${row.line}`),
    )
    const files = [
      'README.md',
      'SKILL.md',
      'apps.json',
      'package.json',
      'docs/index.md',
      'docs/reference.md',
      'docs/guides/getting-started.md',
      'docs/migration-from-skills.md',
      'docs/commands/agents.md',
      'docs/commands/doctor.md',
      'docs/comparison.md',
      'docs/agents.md',
    ]
    const value = getTokenValues().agent_count
    const pattern = new RegExp(`(?<!\\w)${value}(?!\\w)`)

    for (const file of files) {
      const content = readFileSync(join(__dirname, '..', '..', file), 'utf-8')
      for (const [index, line] of content.split('\n').entries()) {
        if (!pattern.test(line)) continue
        // The count alone is not a claim about agents — the security score
        // table has a "90+" row that happens to share the digits. Every real
        // count claim names agents on the same line.
        if (!/agents?\b/i.test(line)) continue
        assert.ok(
          tracked.has(`${file}:${index + 1}`),
          `untracked agent count in ${file}:${index + 1}`,
        )
      }
    }
  })

  it('applying the matrix while in sync is a no-op', () => {
    // Same reasoning as 'documents every tracked location with current values':
    // "in sync" must hold on every branch, not just on main.
    const matrixPath = join(__dirname, '..', '..', 'MANIFEST-MATRIX.md')
    const md = readFileSync(matrixPath, 'utf-8')
    const { changes } = applyMatrix(md, getTokenValues(), true)
    assert.equal(changes.length, 0)
  })

  it('applying the matrix updates a changed token point-accurately', () => {
    // The baseline is rebuilt from the tracked locations with freshly computed
    // values, so this does not depend on what the committed matrix currently
    // says. Reading the file directly made this test fail on any branch whose
    // generated values lagged main — which is the normal state of a feature
    // branch, since generated values are only authoritative on main.
    const structure = parseMatrix(
      readFileSync(join(__dirname, '..', '..', 'MANIFEST-MATRIX.md'), 'utf-8'),
    )
    const tokens = getTokenValues()
    const md = renderMatrix(
      structure.map((row) => ({ ...row, value: tokens[row.token] })),
    )
    const rows = parseMatrix(md)
    const changed = { ...tokens, agent_count: '999' }
    const { changes, updatedRows } = applyMatrix(md, changed, true)
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
