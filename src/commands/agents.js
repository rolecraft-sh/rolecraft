import {
  getAgentManifest,
  getAgentsBySupportLevel,
  getAgentsWithMcp,
  validateManifest,
} from '../agents/manifest.js'

export async function agentsCommand(options = {}) {
  const manifest = getAgentManifest()

  if (options.json) {
    const output = {
      version: 1,
      agentCount: manifest.length,
      agents: manifest,
    }
    console.log(JSON.stringify(output, null, 2))
    return
  }

  // Group by support level
  const byLevel = getAgentsBySupportLevel()

  console.log('\n🔍 Agent Capability Manifest\n')
  console.log(`Total agents: ${manifest.length}\n`)

  // Display agents by support level
  for (const [level, agents] of Object.entries(byLevel)) {
    if (agents.length === 0) continue

    console.log(`\n## ${level.toUpperCase()}\n`)
    console.log('| Agent | Skill Scope | MCP | Instruction | Docs |')
    console.log('|-------|-------------|-----|-------------|------|')

    for (const agent of agents) {
      const mcpStatus = agent.mcpSupport.supported ? '✅' : '❌'
      const docsLink = agent.docUrl ? `[docs](${agent.docUrl})` : '-'
      console.log(
        `| ${agent.name} | ${agent.skillInstallScope} | ${mcpStatus} | ${agent.instructionFormat} | ${docsLink} |`,
      )
    }
  }

  // MCP-enabled agents
  const mcpAgents = getAgentsWithMcp()
  if (mcpAgents.length > 0) {
    console.log('\n## MCP-Supported Agents\n')
    console.log('These agents have built-in MCP configuration support:')
    for (const agent of mcpAgents) {
      console.log(`  • ${agent.name} (${agent.mcpSupport.format})`)
    }
  }

  // Validation status
  const validation = validateManifest()
  console.log(`\n## Validation\n`)
  console.log(
    `Manifest valid: ${validation.valid ? '✅ Yes' : '⚠️ Issues found'}`,
  )
  console.log(`Agent count: ${validation.agentCount}`)
  if (validation.issues.length > 0) {
    console.log('Issues:')
    for (const issue of validation.issues) {
      console.log(`  • ${issue.agent}: ${issue.issue}`)
    }
  }
}
