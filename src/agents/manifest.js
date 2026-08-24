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
      supported: true,
      format: MCP_CONFIG_FORMATS.STANDARD,
      configPath: '~/.agents/mcp.json',
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
    skillInstallScope: 'global ~/.codeium/windsurf/skills',
    mcpSupport: {
      supported: true,
      format: MCP_CONFIG_FORMATS.STANDARD,
      configPath: '~/.windsurf/mcp_config.json',
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://docs.windsurf.com/windsurf/cascade/skills',
    lastVerified: '2026-08-17',
    notes:
      'Rebranded to Devin Desktop; global skills live at ~/.codeium/windsurf/skills, workspace at .windsurf/skills',
  },
  devin: {
    skillInstallScope: 'project ./.devin/skills',
    mcpSupport: {
      supported: true,
      format: MCP_CONFIG_FORMATS.STANDARD,
      configPath: './.devin/mcp.json',
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://docs.devin.ai/product-guides/skills',
    lastVerified: '2026-08-17',
    notes:
      'Devin scans repo-committed skill paths (.agents/skills recommended, .devin/skills among them); no user-global skills dir',
  },
  codex: {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://developers.openai.com/codex/skills',
    lastVerified: '2026-08-17',
    aliasFor: 'opencode',
    notes:
      'Reads ~/.agents/skills (user) and .agents/skills (repo, up to repo root); admin /etc/codex/skills',
  },
  copilot: {
    skillInstallScope: 'project ./.github/skills',
    mcpSupport: {
      supported: true,
      format: MCP_CONFIG_FORMATS.COPILOT,
      configPath: './.github/copilot/.mcp.json',
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl:
      'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills',
    lastVerified: '2026-08-17',
    notes:
      'Project skills at .github/skills (also reads .claude/skills and .agents/skills); personal skills at ~/.copilot/skills or ~/.agents/skills',
  },
  continue: {
    skillInstallScope: 'global ~/.continue/skills',
    mcpSupport: {
      supported: true,
      format: MCP_CONFIG_FORMATS.CONTINUE,
      configPath: '~/.continue/config.json',
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://github.com/continuedev/continue',
    lastVerified: '2026-08-17',
    notes:
      'Confirmed from source code loaders; also reads workspace .claude/skills',
  },
  'oh-my-pi': {
    skillInstallScope: 'global ~/.omp/agent/skills',
    mcpSupport: {
      supported: true,
      format: MCP_CONFIG_FORMATS.STANDARD,
      configPath: '~/.omp/agent/mcp.json',
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://omp.sh/docs/skills',
    lastVerified: '2026-08-24',
    notes:
      'pi fork by can1357; native skills at ~/.omp/agent/skills (user) and .omp/skills (project); also reads ~/.claude/skills, ~/.agents/skills and .github/skills; MCP via standard mcpServers format',
  },
  // Agents sharing .agents/skills directory
  'gemini-cli': {
    skillInstallScope: 'global ~/.gemini/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://geminicli.com/docs/cli/skills/',
    lastVerified: '2026-08-17',
    notes: 'Also reads ~/.agents/skills alias and project .gemini/skills',
  },
  'qwen-code': {
    skillInstallScope: 'global ~/.qwen/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://qwenlm.github.io/qwen-code-docs/en/users/features/skills/',
    lastVerified: '2026-08-17',
    notes: 'Also reads project .qwen/skills',
  },
  goose: {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl:
      'https://goose-docs.ai/docs/guides/context-engineering/using-skills/',
    lastVerified: '2026-08-17',
    notes:
      'Legacy .goose/skills and .claude/skills paths still discovered for backward compatibility',
  },
  roo: {
    skillInstallScope: 'global ~/.roo/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://docs.roocode.com/advanced-usage/available-tools/skill',
    lastVerified: '2026-08-17',
    notes:
      'Also reads project .roo/skills, ~/.agents/skills and .agents/skills',
  },
  trae: {
    skillInstallScope: 'global ~/.trae/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://docs.trae.ai/ide/skills',
    lastVerified: '2026-08-17',
    notes:
      'Also reads project .trae/skills; optional .agents/skills support behind a setting toggle',
  },
  junie: {
    skillInstallScope: 'global ~/.junie/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://junie.jetbrains.com/docs/agent-skills.html',
    lastVerified: '2026-08-17',
    notes:
      'Also reads project .junie/skills; auto-imports .cursor/.claude/.codex skill folders',
  },
  warp: {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://docs.warp.dev/agents/capabilities/skills/',
    lastVerified: '2026-08-17',
    notes:
      'Discovers a broad list of provider dirs; ~/.agents/skills is the recommended global path',
  },
  openhands: {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://docs.openhands.dev/overview/skills',
    lastVerified: '2026-08-17',
    notes:
      'Also reads project .agents/skills; legacy .openhands/skills and .openhands/microagents still supported',
  },
  tabnine: {
    skillInstallScope: 'global ~/.tabnine/agent/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl:
      'https://docs.tabnine.com/main/getting-started/tabnine-cli/features/agent-skills',
    lastVerified: '2026-08-17',
    notes: '~/.agents/skills works as an alias scope',
  },
  amp: {
    skillInstallScope: 'global ~/.config/agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://ampcode.com/manual#agent-skills',
    lastVerified: '2026-08-17',
    notes:
      'amp skill add --global installs to ~/.config/agents/skills; also reads ~/.agents/skills',
  },
  zed: {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://zed.dev/docs/ai/skills',
    lastVerified: '2026-08-17',
    aliasFor: 'opencode',
    notes:
      'Flat layout only: skills must be direct children of ~/.agents/skills',
  },
  replit: {
    skillInstallScope: 'project ./.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://docs.replit.com/features/agent/skills',
    lastVerified: '2026-08-17',
    notes: 'Project-committed .agents/skills only; no user-global skills dir',
  },
  cline: {
    skillInstallScope: 'global ~/.cline/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://docs.cline.bot/customization/skills',
    lastVerified: '2026-08-17',
    notes:
      'Also reads project .cline/skills, .clinerules/skills and .claude/skills',
  },
  kiro: {
    skillInstallScope: 'global ~/.kiro/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://kiro.dev/docs/skills/',
    lastVerified: '2026-08-17',
    notes: 'Also reads project .kiro/skills; no cross-agent aliases',
  },
  lingma: {
    skillInstallScope: 'global ~/.lingma/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://help.aliyun.com/en/lingma/qoder-cn/user-guide/skills',
    lastVerified: '2026-08-17',
    notes:
      'Also reads project .lingma/skills; renamed to Qoder CN on 2026-05-20',
  },
  forge: {
    skillInstallScope: 'project ./.forge/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://forgecode.dev/docs/skills/',
    lastVerified: '2026-08-17',
    notes:
      'ForgeCode by tailcallhq; also reads ~/forge/skills and ~/.agents/skills; project dir has highest precedence',
  },
  jazz: {
    skillInstallScope: 'global ~/.jazz/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://www.mintlify.com/lvndry/jazz/guides/using-skills',
    lastVerified: '2026-08-17',
    notes:
      'jazz-ai (lvndry/jazz, not an AWS product); also reads project ./skills',
  },
  chatgpt: {
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.SKILL_MD,
    supportLevel: SUPPORT_LEVELS.VERIFIED,
    docUrl: 'https://developers.openai.com/codex/skills',
    lastVerified: '2026-08-17',
    aliasFor: 'opencode',
    notes:
      'ChatGPT/Codex share the .agents skills locations; symlinked skill folders honored',
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
  loom: {
    skillInstallScope: 'unknown',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.CUSTOM,
    supportLevel: SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: 'https://github.com/awslabs/loom/',
    lastVerified: null,
    notes:
      'Loom for AWS (awslabs/loom) is an agent deployment platform with no local skills directory; not installable via rolecraft',
  },
  aider: {
    skillInstallScope: 'unknown',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.CUSTOM,
    supportLevel: SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: 'https://aider.chat/docs/usage/conventions.html',
    lastVerified: null,
    notes:
      'No skills concept; conventions are markdown files loaded via .aider.conf.yml read: directives',
  },
  cody: {
    skillInstallScope: 'unknown',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.CUSTOM,
    supportLevel: SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: 'https://sourcegraph.com/docs/cody',
    lastVerified: null,
    notes:
      'No official skills support documented; Sourcegraph agentic product is now Amp (ampcode.com)',
  },
  supermaven: {
    skillInstallScope: 'unknown',
    mcpSupport: {
      supported: false,
      format: null,
    },
    instructionFormat: INSTRUCTION_FORMATS.CUSTOM,
    supportLevel: SUPPORT_LEVELS.EXPERIMENTAL,
    docUrl: 'https://supermaven.com',
    lastVerified: null,
    notes:
      'Autocomplete tool (Anysphere/Cursor since Nov 2024); no agent skills feature documented',
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
