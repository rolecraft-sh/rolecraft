#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getAgentManifest, SUPPORT_LEVELS } from '../src/agents/manifest.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const docsPath = join(__dirname, '..', 'docs', 'agents.md')

const DUAL_PATH_AGENTS = new Set([
  'opencode',
  'claude-code',
  'cursor',
  'windsurf',
  'codex',
  'aider',
  'cline',
  'cody',
  'continue',
])

const NAME_TO_DIR = {
  'claude-code': 'claude',
  opencode: 'agents',
  codex: 'agents',
  chatgpt: 'agents',
}

function formatDirLabel(agent) {
  if (agent.name === 'copilot') {
    return './.github/skills/ or ~/.copilot/skills/'
  }
  if (DUAL_PATH_AGENTS.has(agent.name)) {
    const homePath = agent.label
    const projName = NAME_TO_DIR[agent.name] || agent.name
    const projPath = `./.${projName}/skills/`
    return `${homePath} or ${projPath}`
  }
  return agent.label
}

function formatSupportLevel(level) {
  switch (level) {
    case SUPPORT_LEVELS.VERIFIED:
      return 'verified'
    case SUPPORT_LEVELS.COMMUNITY:
      return 'community'
    case SUPPORT_LEVELS.LEGACY:
      return 'legacy'
    case SUPPORT_LEVELS.EXPERIMENTAL:
      return 'experimental'
    default:
      return level
  }
}

function formatMcp(agent) {
  if (!agent.mcpSupport.supported) return '-'
  return agent.mcpSupport.format
}

/**
 * Generate docs/agents.md content from manifest data
 */
export function generateAgentsDocs() {
  const manifest = getAgentManifest()
  const groups = {
    verified: [],
    community: [],
    legacy: [],
    experimental: [],
  }
  for (const agent of manifest) {
    const level = agent.supportLevel
    if (groups[level]) groups[level].push(agent)
  }

  const mcpAgents = manifest.filter((a) => a.mcpSupport.supported)

  const agentCount = manifest.length
  const verifiedCount = groups.verified.length
  const communityCount = groups.community.length
  const legacyCount = groups.legacy.length
  const experimentalCount = groups.experimental.length

  const header = `# Agent Discovery Paths

rolecraft knows where each AI agent looks for skills. When you use a flag like \`--claude\` or \`--cursor\`, it installs to the correct directory for that agent.

| Agent | Directory | Support | MCP |
| ----- | --------- | ------- | --- |
`

  const rows = manifest
    .map((agent) => {
      const dir = formatDirLabel(agent)
      const support = formatSupportLevel(agent.supportLevel)
      const mcp = formatMcp(agent)
      return `| ${agent.name} | \`${dir}\` | ${support} | ${mcp} |`
    })
    .join('\n')

  const notes = manifest.filter((a) => a.notes)
  const notesSection =
    notes.length > 0
      ? `\n## Notes\n\n${notes.map((a) => `- **${a.name}:** ${a.notes}`).join('\n')}\n`
      : ''

  const mcpFormats = [...new Set(mcpAgents.map((a) => a.mcpSupport.format))]

  const footer = `

> **Support levels:** \`verified\` — actively tested and maintained; \`community\` — community-contributed, maintained on best-effort; \`legacy\` — previous generation, no active development; \`experimental\` — known to exist, not formally tested.

> **MCP support:** ${mcpAgents.length} agent(s) support MCP server configuration${mcpFormats.length > 0 ? `. Format: \`${mcpFormats.join('`, `')}\`` : '.'}

> **Agent count:** ${agentCount} total — ${verifiedCount} verified, ${communityCount} community, ${legacyCount} legacy, ${experimentalCount} experimental.
${notesSection}
## Install to multiple agents

\`\`\`bash
rolecraft install ./my-skill --cursor --devin --copilot --gemini --cody
\`\`\`
`

  return header + rows + footer
}

function main() {
  const md = generateAgentsDocs()
  writeFileSync(docsPath, md, 'utf-8')
  const sizeKb = (Buffer.byteLength(md, 'utf-8') / 1024).toFixed(1)
  console.log(
    `Generated docs/agents.md (${sizeKb} KB, ${getAgentManifest().length} agents)`,
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
