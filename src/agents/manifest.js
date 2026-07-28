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

/**
 * Agent capability manifest data
 * Each agent has structured metadata including:
 * - skillInstallScope: where skills are installed
 * - mcpSupport: MCP configuration support and format
 * - instructionFormat: skill instruction format support
 * - supportLevel: verified/community/legacy/experimental
 * - docUrl: official documentation URL
 * - lastVerified: last verification date (ISO date string)
 */
const MANIFEST_DATA = {
  opencode: {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://opencode.ai/docs',
    lastVerified: '2026-07-20',
  },
  'claude-code': {
    skillInstallScope: 'global ~/.claude/skills',
    mcpSupport: {
      supported: true,
      format: MCP_CONFIG_FORMATS.STANDARD,
      configPath: '~/.claude.json',
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://docs.anthropic.com/en/docs/claude-code',
    lastVerified: '2026-07-27',
  },
  cursor: {
    skillInstallScope: 'global ~/.cursor/skills',
    mcpSupport: {
      supported: true,
      format: MCP_CONFIG_FORMATS.STANDARD,
      configPath: '~/.cursor/mcp_config.json',
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://cursor.com/docs',
    lastVerified: '2026-07-22',
  },
  windsurf: {
    skillInstallScope: 'global ~/.windsurf/skills',
    mcpSupport: {
      supported: true,
      format: MCP_CONFIG_FORMATS.STANDARD,
      configPath: '~/.windsurf/mcp_config.json',
    },
    instructionFormat: INSTRUCTION_FORMATS.MDC,
    supportLevel: SUPPORT_LEVELS.COMMUNITY,
    docUrl: 'https://docs.windsurf.com',
    lastVerified: '2026-07-15',
    notes: 'Rebranded to Devin Desktop; use --devin flag for new deployments',
  },
  devin: {
    skillInstallScope: 'global ~/.devin/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: 'https://devin.ai/docs',
    lastVerified: '2026-07-10',
    notes: 'Desktop agent with limited MCP support',
  },
  codex: {
    skillInstallScope: 'global ~/.codex/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.COMMUNITY,
    docUrl: 'https://openai.github.io/codex/',
    lastVerified: '2026-07-18',
  },
  copilot: {
    skillInstallScope: 'project ./.github/copilot/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.CUSTOM,
    supportLevel: SUPPORT_LEVELS.LEGACY,
    docUrl: 'https://docs.github.com/en/copilot',
    lastVerified: '2026-06-30',
    notes: 'MCP support planned but not yet implemented',
  },
  continue: {
    skillInstallScope: 'global ~/.continue/skills',
    mcpSupport: {
      supported: true,
      format: MCP_CONFIG_FORMATS.CONTINUE,
      configPath: '~/.continue/config.json',
    },
    instructionFormat: INSTRUCTION_FORMATS.AGENTS_MD,
    supportLevel: SUPPORT_LEVELS.COMMUNITY,
    docUrl: 'https://docs.continue.dev',
    lastVerified: '2026-07-12',
  },
  // Agents sharing .agents/skills directory
  amp: {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: 'https://ampcode.com/docs',
    lastVerified: '2026-07-25',
    aliasFor: 'opencode',
  },
  antigravity: {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: 'https://github.com/daniel-e/agents',
    lastVerified: '2026-07-25',
    aliasFor: 'opencode',
  },
  'antigravity-cli': {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: 'https://github.com/daniel-e/agents',
    lastVerified: '2026-07-25',
    aliasFor: 'opencode',
  },
  'deep-agents': {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: 'https://github.com/daniel-e/deep-agents',
    lastVerified: '2026-07-25',
    aliasFor: 'opencode',
  },
  dexto: {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: 'https://dexto.ai',
    lastVerified: '2026-07-26',
    aliasFor: 'opencode',
  },
  loaf: {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: 'https://github.com/loaf-ai/loaf',
    lastVerified: '2026-07-25',
    aliasFor: 'opencode',
  },
  replit: {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: 'https://replit.com/docs',
    lastVerified: '2026-07-25',
    aliasFor: 'opencode',
  },
  zed: {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: 'https://zed.dev/docs',
    lastVerified: '2026-07-25',
    aliasFor: 'opencode',
  },
}

/**
 * Get full agent manifest with capability data
 * Merges manifest data with AGENTS_DATA from agents.js
 */
export function getAgentManifest() {
  const manifest = []

  for (const agent of agents) {
    const name = agent.name
    const manifestEntry = MANIFEST_DATA[name] || {}

    manifest.push({
      flag: agent.flag,
      name: agent.name,
      label: agent.label,
      skillInstallScope: manifestEntry.skillInstallScope || 'unknown',
      mcpSupport: manifestEntry.mcpSupport || {
        supported: false,
        format: null,
      },
      instructionFormat:
        manifestEntry.instructionFormat || INSTRUCTION_FORMATS.CUSTOM,
      supportLevel: manifestEntry.supportLevel || SUPPORT_LEVELS.EXPERIMENTAL,
      docUrl: manifestEntry.docUrl || null,
      lastVerified: manifestEntry.lastVerified || null,
      notes: manifestEntry.notes || null,
      aliasFor: manifestEntry.aliasFor || null,
    })
  }

  return manifest
}

/**
 * Get agent by flag with full manifest data
 */
export function getAgentManifestByFlag(flag) {
  for (const agent of agents) {
    if (agent.flag === flag) {
      const manifestEntry = MANIFEST_DATA[agent.name] || {}
      return {
        flag: agent.flag,
        name: agent.name,
        label: agent.label,
        skillInstallScope: manifestEntry.skillInstallScope || 'unknown',
        mcpSupport: manifestEntry.mcpSupport || {
          supported: false,
          format: null,
        },
        instructionFormat:
          manifestEntry.instructionFormat || INSTRUCTION_FORMATS.CUSTOM,
        supportLevel: manifestEntry.supportLevel || SUPPORT_LEVELS.EXPERIMENTAL,
        docUrl: manifestEntry.docUrl || null,
        lastVerified: manifestEntry.lastVerified || null,
        notes: manifestEntry.notes || null,
        aliasFor: manifestEntry.aliasFor || null,
      }
    }
  }
  return null
}

/**
 * Get agents grouped by support level
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
    if (groups[level]) {
      groups[level].push(agent)
    }
  }

  return groups
}

/**
 * Get agents with MCP support
 */
export function getAgentsWithMcp() {
  return getAgentManifest().filter((agent) => agent.mcpSupport.supported)
}

/**
 * Validate manifest has all required fields for a consistent agent count
 */
export function validateManifest() {
  const issues = []
  const manifest = getAgentManifest()

  for (const agent of manifest) {
    if (!agent.skillInstallScope) {
      issues.push({ agent: agent.name, issue: 'missing skillInstallScope' })
    }
    if (!agent.supportLevel) {
      issues.push({ agent: agent.name, issue: 'missing supportLevel' })
    }
    if (!agent.lastVerified && agent.supportLevel === SUPPORT_LEVELS.VERIFIED) {
      issues.push({
        agent: agent.name,
        issue: 'missing lastVerified date for verified agent',
      })
    }
  }

  return {
    valid: issues.length === 0,
    agentCount: manifest.length,
    issues,
  }
}

export default getAgentManifest
