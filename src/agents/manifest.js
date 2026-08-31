/**
 * Agent Capability Manifest
 * Single source of truth for agent support levels, MCP configuration,
 * instruction format, documentation URLs, and verification metadata.
 */

import agents from '../agents.js'

// Support level definitions
export const SUPPORT_LEVELS = {
  VERIFIED: 'verified',
  COMMUNITY: 'community',
  LEGACY: 'legacy',
  EXPERIMENTAL: 'experimental',
}

// Instruction format types
export const INSTRUCTION_FORMATS = {
  SKILL_MD: 'skill-md', // SKILL.md with frontmatter
  MDC: 'mdc', // VS Code style .mdc files
  AGENTS_MD: 'agents-md', // AGENTS.md format
  CUSTOM: 'custom',
}

// MCP configuration formats
export const MCP_CONFIG_FORMATS = {
  STANDARD: 'mcpServers', // Standard mcpServers format
  CONTINUE: 'experimental.mcpServers', // Continue.dev format
  COPILOT: 'servers', // GitHub Copilot format
}

function toManifestAgent(agent) {
  return {
    flag: agent.flag,
    name: agent.name,
    label: agent.label,
    skillInstallScope: agent.skillInstallScope || 'unknown',
    mcpSupport: agent.mcpSupport || {
      supported: false,
      format: null,
    },
    instructionFormat: agent.instructionFormat || INSTRUCTION_FORMATS.CUSTOM,
    supportLevel: agent.supportLevel || SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: agent.docUrl || null,
    lastVerified: agent.lastVerified || null,
    notes: agent.notes || null,
    aliasFor: agent.aliasFor || null,
  }
}

function buildAgentManifest(agentList = agents) {
  return agentList.map(toManifestAgent)
}

/**
 * Get full agent manifest with capability data.
 */
export function getAgentManifest() {
  return buildAgentManifest()
}

/**
 * Get agent by flag with full manifest data.
 */
export function getAgentManifestByFlag(flag) {
  return buildAgentManifest().find((agent) => agent.flag === flag) || null
}

/**
 * Get agents grouped by support level.
 */
export function getAgentsBySupportLevel() {
  const groups = {
    [SUPPORT_LEVELS.VERIFIED]: [],
    [SUPPORT_LEVELS.COMMUNITY]: [],
    [SUPPORT_LEVELS.LEGACY]: [],
    [SUPPORT_LEVELS.EXPERIMENTAL]: [],
  }

  for (const agent of getAgentManifest()) {
    const level = agent.supportLevel
    if (groups[level]) groups[level].push(agent)
  }

  return groups
}

/**
 * Get agents with MCP support.
 */
export function getAgentsWithMcp() {
  return getAgentManifest().filter((agent) => agent.mcpSupport.supported)
}

/**
 * Validate manifest has one complete registry entry per agent.
 */
export function validateManifest(agentList = agents) {
  const issues = []
  const seenFlags = new Set()
  const seenNames = new Set()
  const manifest = buildAgentManifest(agentList)

  for (const [index, agent] of manifest.entries()) {
    const rawAgent = agentList[index]

    if (!agent.flag) issues.push({ agent: agent.name, issue: 'missing flag' })
    if (!agent.name) issues.push({ agent: agent.flag, issue: 'missing name' })
    if (seenFlags.has(agent.flag)) {
      issues.push({ agent: agent.name, issue: `duplicate flag ${agent.flag}` })
    }
    if (seenNames.has(agent.name)) {
      issues.push({ agent: agent.name, issue: `duplicate name ${agent.name}` })
    }
    seenFlags.add(agent.flag)
    seenNames.add(agent.name)

    if (!agent.skillInstallScope) {
      issues.push({ agent: agent.name, issue: 'missing skillInstallScope' })
    }
    if (!agent.supportLevel) {
      issues.push({ agent: agent.name, issue: 'missing supportLevel' })
    }
    if (agent.supportLevel === SUPPORT_LEVELS.VERIFIED) {
      for (const field of [
        'skillInstallScope',
        'instructionFormat',
        'docUrl',
        'lastVerified',
      ]) {
        if (!rawAgent[field]) {
          issues.push({
            agent: agent.name,
            issue: `missing ${field} for verified agent`,
          })
        }
      }
    }
    if (rawAgent.mcpSupport?.supported && !rawAgent.mcpSupport.format) {
      issues.push({ agent: agent.name, issue: 'missing MCP format' })
    }
  }

  return {
    valid: issues.length === 0,
    agentCount: manifest.length,
    issues,
  }
}

export default getAgentManifest
