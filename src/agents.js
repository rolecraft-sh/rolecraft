import { join } from 'node:path'
import { homedir } from 'node:os'

function home(...parts) {
  return join(homedir(), ...parts)
}

function proj(...parts) {
  return join(process.cwd(), ...parts)
}

function mcpFromSkillDir(getDirFn) {
  return () => {
    const dir = getDirFn()
    return `${dir.slice(0, dir.lastIndexOf('/'))}/mcp.json`
  }
}

const AGENTS_DATA = [
  {
    flag: 'agents',
    name: 'opencode',
    getDir: () => home('.agents', 'skills'),
    label: '~/.agents/skills/',
    skillInstallScope: 'global ~/.agents/skills',
    mcpSupport: {
      supported: true,
      format: 'mcpServers',
      configPath: '~/.agents/mcp.json',
    },
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://opencode.ai/docs',
    lastVerified: '2026-07-20',
  },
  {
    flag: 'claude',
    name: 'claude-code',
    getDir: () => home('.claude', 'skills'),
    label: '~/.claude/skills/',
    skillInstallScope: 'global ~/.claude/skills',
    mcpSupport: {
      supported: true,
      format: 'mcpServers',
      configPath: '~/.claude.json',
    },
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://docs.anthropic.com/en/docs/claude-code',
    lastVerified: '2026-07-27',
  },
  {
    flag: 'cursor',
    name: 'cursor',
    getDir: () => home('.cursor', 'skills'),
    label: '~/.cursor/skills/',
    skillInstallScope: 'global ~/.cursor/skills',
    mcpSupport: {
      supported: true,
      format: 'mcpServers',
      configPath: '~/.cursor/mcp.json',
    },
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://cursor.com/docs',
    lastVerified: '2026-07-22',
  },
  {
    flag: 'windsurf',
    name: 'windsurf',
    getDir: () => home('.codeium', 'windsurf', 'skills'),
    label: '~/.codeium/windsurf/skills/',
    skillInstallScope: 'global ~/.codeium/windsurf/skills',
    mcpSupport: {
      supported: true,
      format: 'mcpServers',
      configPath: '~/.windsurf/mcp_config.json',
    },
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://docs.windsurf.com/windsurf/cascade/skills',
    lastVerified: '2026-08-17',
    notes:
      'Rebranded to Devin Desktop; global skills live at ~/.codeium/windsurf/skills, workspace at .windsurf/skills',
  },
  {
    flag: 'devin',
    name: 'devin',
    getDir: () => proj('.devin', 'skills'),
    label: './.devin/skills/',
    skillInstallScope: 'project ./.devin/skills',
    mcpSupport: {
      supported: true,
      format: 'mcpServers',
      configPath: './.devin/mcp.json',
    },
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://docs.devin.ai/product-guides/skills',
    lastVerified: '2026-08-17',
    notes:
      'Devin scans repo-committed skill paths (.agents/skills recommended, .devin/skills among them); no user-global skills dir',
  },
  {
    flag: 'codex',
    name: 'codex',
    getDir: () => home('.agents', 'skills'),
    label: '~/.agents/skills/',
    skillInstallScope: 'global ~/.agents/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://developers.openai.com/codex/skills',
    lastVerified: '2026-08-17',
    notes:
      'Reads ~/.agents/skills (user) and .agents/skills (repo, up to repo root); admin /etc/codex/skills',
    aliasFor: 'opencode',
  },
  {
    flag: 'copilot',
    name: 'copilot',
    getDir: () => proj('.github', 'skills'),
    label: './.github/skills/',
    skillInstallScope: 'project ./.github/skills',
    mcpSupport: {
      supported: true,
      format: 'servers',
      configPath: './.github/copilot/.mcp.json',
    },
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl:
      'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills',
    lastVerified: '2026-08-17',
    notes:
      'Project skills at .github/skills (also reads .claude/skills and .agents/skills); personal skills at ~/.copilot/skills or ~/.agents/skills',
  },
  {
    flag: 'aider',
    name: 'aider',
    getDir: () => home('.aider', 'skills'),
    label: '~/.aider/skills/',
    docUrl: 'https://aider.chat/docs/usage/conventions.html',
    notes:
      'No skills concept; conventions are markdown files loaded via .aider.conf.yml read: directives',
  },
  {
    flag: 'cline',
    name: 'cline',
    getDir: () => home('.cline', 'skills'),
    label: '~/.cline/skills/',
    skillInstallScope: 'global ~/.cline/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://docs.cline.bot/customization/skills',
    lastVerified: '2026-08-17',
    notes:
      'Also reads project .cline/skills, .clinerules/skills and .claude/skills',
  },
  {
    flag: 'gemini',
    name: 'gemini-cli',
    getDir: () => home('.gemini', 'skills'),
    label: '~/.gemini/skills/',
    skillInstallScope: 'global ~/.gemini/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://geminicli.com/docs/cli/skills/',
    lastVerified: '2026-08-17',
    notes: 'Also reads ~/.agents/skills alias and project .gemini/skills',
  },
  {
    flag: 'cody',
    name: 'cody',
    getDir: () => home('.cody', 'skills'),
    label: '~/.cody/skills/',
    docUrl: 'https://sourcegraph.com/docs/cody',
    notes:
      'No official skills support documented; Sourcegraph agentic product is now Amp (ampcode.com)',
  },
  {
    flag: 'continue',
    name: 'continue',
    getDir: () => home('.continue', 'skills'),
    label: '~/.continue/skills/',
    skillInstallScope: 'global ~/.continue/skills',
    mcpSupport: {
      supported: true,
      format: 'experimental.mcpServers',
      configPath: '~/.continue/config.json',
    },
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://github.com/continuedev/continue',
    lastVerified: '2026-08-17',
    notes:
      'Confirmed from source code loaders; also reads workspace .claude/skills',
  },
  {
    flag: 'warp',
    name: 'warp',
    getDir: () => home('.agents', 'skills'),
    label: '~/.agents/skills/',
    skillInstallScope: 'global ~/.agents/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://docs.warp.dev/agents/capabilities/skills/',
    lastVerified: '2026-08-17',
    notes:
      'Discovers a broad list of provider dirs; ~/.agents/skills is the recommended global path',
  },
  {
    flag: 'codeium',
    name: 'codeium',
    getDir: () => home('.codeium', 'skills'),
    label: '~/.codeium/skills/',
  },
  {
    flag: 'fabric',
    name: 'fabric',
    getDir: () => home('.fabric', 'skills'),
    label: '~/.fabric/skills/',
  },
  {
    flag: 'goose',
    name: 'goose',
    getDir: () => home('.agents', 'skills'),
    label: '~/.agents/skills/',
    skillInstallScope: 'global ~/.agents/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl:
      'https://goose-docs.ai/docs/guides/context-engineering/using-skills/',
    lastVerified: '2026-08-17',
    notes:
      'Legacy .goose/skills and .claude/skills paths still discovered for backward compatibility',
  },
  {
    flag: 'tabnine',
    name: 'tabnine',
    getDir: () => home('.tabnine', 'agent', 'skills'),
    label: '~/.tabnine/agent/skills/',
    skillInstallScope: 'global ~/.tabnine/agent/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl:
      'https://docs.tabnine.com/main/getting-started/tabnine-cli/features/agent-skills',
    lastVerified: '2026-08-17',
    notes: '~/.agents/skills works as an alias scope',
  },
  {
    flag: 'supermaven',
    name: 'supermaven',
    getDir: () => home('.supermaven', 'skills'),
    label: '~/.supermaven/skills/',
    docUrl: 'https://supermaven.com',
    notes:
      'Autocomplete tool (Anysphere/Cursor since Nov 2024); no agent skills feature documented',
  },
  {
    flag: 'pr-pilot',
    name: 'pr-pilot',
    getDir: () => home('.pr-pilot', 'skills'),
    label: '~/.pr-pilot/skills/',
  },
  {
    flag: 'loom',
    name: 'loom',
    getDir: () => home('.loom', 'skills'),
    label: '~/.loom/skills/',
    docUrl: 'https://github.com/awslabs/loom/',
    notes:
      'Loom for AWS (awslabs/loom) is an agent deployment platform with no local skills directory; not installable via rolecraft',
  },
  {
    flag: 'roo',
    name: 'roo',
    getDir: () => home('.roo', 'skills'),
    label: '~/.roo/skills/',
    skillInstallScope: 'global ~/.roo/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://docs.roocode.com/advanced-usage/available-tools/skill',
    lastVerified: '2026-08-17',
    notes:
      'Also reads project .roo/skills, ~/.agents/skills and .agents/skills',
  },
  {
    flag: 'trae',
    name: 'trae',
    getDir: () => home('.trae', 'skills'),
    label: '~/.trae/skills/',
    skillInstallScope: 'global ~/.trae/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://docs.trae.ai/ide/skills',
    lastVerified: '2026-08-17',
    notes:
      'Also reads project .trae/skills; optional .agents/skills support behind a setting toggle',
  },
  {
    flag: 'hermes',
    name: 'hermes',
    getDir: () => home('.hermes', 'skills'),
    label: '~/.hermes/skills/',
  },
  {
    flag: 'kiro',
    name: 'kiro',
    getDir: () => home('.kiro', 'skills'),
    label: '~/.kiro/skills/',
    skillInstallScope: 'global ~/.kiro/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://kiro.dev/docs/skills/',
    lastVerified: '2026-08-17',
    notes: 'Also reads project .kiro/skills; no cross-agent aliases',
  },
  {
    flag: 'augment',
    name: 'augment',
    getDir: () => home('.augment', 'skills'),
    label: '~/.augment/skills/',
  },
  {
    flag: 'kilo',
    name: 'kilo',
    getDir: () => home('.kilo', 'skills'),
    label: '~/.kilo/skills/',
  },
  {
    flag: 'openhands',
    name: 'openhands',
    getDir: () => home('.agents', 'skills'),
    label: '~/.agents/skills/',
    skillInstallScope: 'global ~/.agents/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://docs.openhands.dev/overview/skills',
    lastVerified: '2026-08-17',
    notes:
      'Also reads project .agents/skills; legacy .openhands/skills and .openhands/microagents still supported',
  },
  {
    flag: 'junie',
    name: 'junie',
    getDir: () => home('.junie', 'skills'),
    label: '~/.junie/skills/',
    skillInstallScope: 'global ~/.junie/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://junie.jetbrains.com/docs/agent-skills.html',
    lastVerified: '2026-08-17',
    notes:
      'Also reads project .junie/skills; auto-imports .cursor/.claude/.codex skill folders',
  },
  {
    flag: 'factory',
    name: 'factory',
    getDir: () => home('.factory', 'skills'),
    label: '~/.factory/skills/',
  },
  {
    flag: 'command-code',
    name: 'command-code',
    getDir: () => home('.commandcode', 'skills'),
    label: '~/.commandcode/skills/',
  },
  {
    flag: 'cortex',
    name: 'cortex',
    getDir: () => home('.snowflake', 'cortex', 'skills'),
    label: '~/.snowflake/cortex/skills/',
  },
  {
    flag: 'mistral-vibe',
    name: 'mistral-vibe',
    getDir: () => home('.vibe', 'skills'),
    label: '~/.vibe/skills/',
  },
  {
    flag: 'qwen-code',
    name: 'qwen-code',
    getDir: () => home('.qwen', 'skills'),
    label: '~/.qwen/skills/',
    skillInstallScope: 'global ~/.qwen/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://qwenlm.github.io/qwen-code-docs/en/users/features/skills/',
    lastVerified: '2026-08-17',
    notes: 'Also reads project .qwen/skills',
  },
  {
    flag: 'openclaw',
    name: 'openclaw',
    getDir: () => home('.openclaw', 'skills'),
    label: '~/.openclaw/skills/',
  },
  {
    flag: 'codebuddy',
    name: 'codebuddy',
    getDir: () => home('.codebuddy', 'skills'),
    label: '~/.codebuddy/skills/',
  },
  {
    flag: 'mux',
    name: 'mux',
    getDir: () => home('.mux', 'skills'),
    label: '~/.mux/skills/',
  },
  {
    flag: 'pi',
    name: 'pi',
    getDir: () => home('.pi', 'agent', 'skills'),
    label: '~/.pi/agent/skills/',
  },
  {
    flag: 'omp',
    name: 'oh-my-pi',
    getDir: () => home('.omp', 'agent', 'skills'),
    label: '~/.omp/agent/skills/',
    skillInstallScope: 'global ~/.omp/agent/skills',
    mcpSupport: {
      supported: true,
      format: 'mcpServers',
      configPath: '~/.omp/agent/mcp.json',
    },
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://omp.sh/docs/skills',
    lastVerified: '2026-08-24',
    notes:
      'pi fork by can1357; native skills at ~/.omp/agent/skills (user) and .omp/skills (project); also reads ~/.claude/skills, ~/.agents/skills and .github/skills; MCP via standard mcpServers format',
  },
  {
    flag: 'autohand-code',
    name: 'autohand-code',
    getDir: () => home('.autohand', 'skills'),
    label: '~/.autohand/skills/',
  },
  {
    flag: 'rovo',
    name: 'rovo-dev',
    getDir: () => home('.rovodev', 'skills'),
    label: '~/.rovodev/skills/',
  },
  {
    flag: 'firebender',
    name: 'firebender',
    getDir: () => home('.firebender', 'skills'),
    label: '~/.firebender/skills/',
  },
  {
    flag: 'bob',
    name: 'ibm-bob',
    getDir: () => home('.bob', 'skills'),
    label: '~/.bob/skills/',
  },
  {
    flag: 'aider-desk',
    name: 'aider-desk',
    getDir: () => home('.aider-desk', 'skills'),
    label: '~/.aider-desk/skills/',
  },
  {
    flag: 'code-arts-doer',
    name: 'code-arts-doer',
    getDir: () => home('.codeartsdoer', 'skills'),
    label: '~/.codeartsdoer/skills/',
  },
  {
    flag: 'code-maker',
    name: 'code-maker',
    getDir: () => home('.codemaker', 'skills'),
    label: '~/.codemaker/skills/',
  },
  {
    flag: 'code-studio',
    name: 'code-studio',
    getDir: () => home('.codestudio', 'skills'),
    label: '~/.codestudio/skills/',
  },
  {
    flag: 'crush',
    name: 'crush',
    getDir: () => home('.crush', 'skills'),
    label: '~/.crush/skills/',
  },
  {
    flag: 'eve',
    name: 'eve',
    getDir: () => proj('agent', 'skills'),
    label: './agent/skills/',
  },
  {
    flag: 'forge',
    name: 'forge',
    getDir: () => proj('.forge', 'skills'),
    label: './.forge/skills/',
    skillInstallScope: 'project ./.forge/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://forgecode.dev/docs/skills/',
    lastVerified: '2026-08-17',
    notes:
      'ForgeCode by tailcallhq; also reads ~/forge/skills and ~/.agents/skills; project dir has highest precedence',
  },
  {
    flag: 'inference-sh',
    name: 'inference-sh',
    getDir: () => home('.inferencesh', 'skills'),
    label: '~/.inferencesh/skills/',
  },
  {
    flag: 'jazz',
    name: 'jazz',
    getDir: () => home('.jazz', 'skills'),
    label: '~/.jazz/skills/',
    skillInstallScope: 'global ~/.jazz/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://www.mintlify.com/lvndry/jazz/guides/using-skills',
    lastVerified: '2026-08-17',
    notes:
      'jazz-ai (lvndry/jazz, not an AWS product); also reads project ./skills',
  },
  {
    flag: 'iflow',
    name: 'iflow',
    getDir: () => home('.iflow', 'skills'),
    label: '~/.iflow/skills/',
  },
  {
    flag: 'kilo-code',
    name: 'kilo-code',
    getDir: () => home('.kilocode', 'skills'),
    label: '~/.kilocode/skills/',
  },
  {
    flag: 'kode',
    name: 'kode',
    getDir: () => home('.kode', 'skills'),
    label: '~/.kode/skills/',
  },
  {
    flag: 'lingma',
    name: 'lingma',
    getDir: () => home('.lingma', 'skills'),
    label: '~/.lingma/skills/',
    skillInstallScope: 'global ~/.lingma/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://help.aliyun.com/en/lingma/qoder-cn/user-guide/skills',
    lastVerified: '2026-08-17',
    notes:
      'Also reads project .lingma/skills; renamed to Qoder CN on 2026-05-20',
  },
  {
    flag: 'mcp-jam',
    name: 'mcp-jam',
    getDir: () => home('.mcpjam', 'skills'),
    label: '~/.mcpjam/skills/',
  },
  {
    flag: 'moxby',
    name: 'moxby',
    getDir: () => home('.moxby', 'skills'),
    label: '~/.moxby/skills/',
  },
  {
    flag: 'ona',
    name: 'ona',
    getDir: () => home('.ona', 'skills'),
    label: '~/.ona/skills/',
  },
  {
    flag: 'qoder',
    name: 'qoder',
    getDir: () => home('.qoder', 'skills'),
    label: '~/.qoder/skills/',
  },
  {
    flag: 'reasonix',
    name: 'reasonix',
    getDir: () => home('.reasonix', 'skills'),
    label: '~/.reasonix/skills/',
  },
  {
    flag: 'terra-mind',
    name: 'terra-mind',
    getDir: () => home('.terramind', 'skills'),
    label: '~/.terramind/skills/',
  },
  {
    flag: 'tiny-cloud',
    name: 'tiny-cloud',
    getDir: () => home('.tinycloud', 'skills'),
    label: '~/.tinycloud/skills/',
  },
  {
    flag: 'zencoder',
    name: 'zencoder',
    getDir: () => home('.zencoder', 'skills'),
    label: '~/.zencoder/skills/',
  },
  {
    flag: 'zap',
    name: 'zap',
    getDir: () => home('.zap', 'skills'),
    label: '~/.zap/skills/',
  },
  {
    flag: 'codeep',
    name: 'codeep',
    getDir: () => home('.codeep', 'skills'),
    label: '~/.codeep/skills/',
  },
  {
    flag: 'kimi-code',
    name: 'kimi-code',
    getDir: () => home('.kimi-code', 'skills'),
    label: '~/.kimi-code/skills/',
  },
  {
    flag: 'zcode',
    name: 'zcode',
    getDir: () => home('.zcode', 'skills'),
    label: '~/.zcode/skills/',
  },
  {
    flag: 'astrbot',
    name: 'astrbot',
    getDir: () => home('.astrbot', 'data', 'skills'),
    label: '~/.astrbot/data/skills/',
  },
  {
    flag: 'qoder-cn',
    name: 'qoder-cn',
    getDir: () => home('.qoder-cn', 'skills'),
    label: '~/.qoder-cn/skills/',
  },
  {
    flag: 'trae-cn',
    name: 'trae-cn',
    getDir: () => home('.trae-cn', 'skills'),
    label: '~/.trae-cn/skills/',
  },
  {
    flag: 'zenflow',
    name: 'zenflow',
    getDir: () => home('.zenflow', 'skills'),
    label: '~/.zenflow/skills/',
  },
  {
    flag: 'neovate',
    name: 'neovate',
    getDir: () => home('.neovate', 'skills'),
    label: '~/.neovate/skills/',
  },
  {
    flag: 'pochi',
    name: 'pochi',
    getDir: () => home('.pochi', 'skills'),
    label: '~/.pochi/skills/',
  },
  {
    flag: 'adal',
    name: 'adal',
    getDir: () => home('.adal', 'skills'),
    label: '~/.adal/skills/',
  },
  {
    flag: 'droid',
    name: 'droid',
    getDir: () => home('.droid', 'skills'),
    label: '~/.droid/skills/',
  },
  {
    flag: 'chatgpt',
    name: 'chatgpt',
    getDir: () => home('.agents', 'skills'),
    label: '~/.agents/skills/',
    skillInstallScope: 'global ~/.agents/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://developers.openai.com/codex/skills',
    lastVerified: '2026-08-17',
    notes:
      'ChatGPT/Codex share the .agents skills locations; symlinked skill folders honored',
    aliasFor: 'opencode',
  },
  {
    flag: 'codearts-agent',
    name: 'codearts-agent',
    getDir: () => home('.codeartsdoer', 'skills'),
    label: '~/.codeartsdoer/skills/',
  },
  {
    flag: 'universal',
    name: 'universal',
    getDir: () => home('.config', 'agents', 'skills'),
    label: '~/.config/agents/skills/',
  },
  {
    flag: 'amp',
    name: 'amp',
    getDir: () => home('.config', 'agents', 'skills'),
    label: '~/.config/agents/skills/',
    skillInstallScope: 'global ~/.config/agents/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://ampcode.com/manual#agent-skills',
    lastVerified: '2026-08-17',
    notes:
      'amp skill add --global installs to ~/.config/agents/skills; also reads ~/.agents/skills',
  },
  {
    flag: 'antigravity',
    name: 'antigravity',
    getDir: () => home('.agents', 'skills'),
    label: '~/.agents/skills/',
    skillInstallScope: 'global ~/.agents/skills',
    instructionFormat: 'skill-md',
    docUrl: 'https://github.com/daniel-e/agents',
    lastVerified: '2026-07-25',
    aliasFor: 'opencode',
  },
  {
    flag: 'antigravity-cli',
    name: 'antigravity-cli',
    getDir: () => home('.agents', 'skills'),
    label: '~/.agents/skills/',
    skillInstallScope: 'global ~/.agents/skills',
    instructionFormat: 'skill-md',
    docUrl: 'https://github.com/daniel-e/agents',
    lastVerified: '2026-07-25',
    aliasFor: 'opencode',
  },
  {
    flag: 'deepagents',
    name: 'deep-agents',
    getDir: () => home('.agents', 'skills'),
    label: '~/.agents/skills/',
    skillInstallScope: 'global ~/.agents/skills',
    instructionFormat: 'skill-md',
    docUrl: 'https://github.com/daniel-e/deep-agents',
    lastVerified: '2026-07-25',
    aliasFor: 'opencode',
  },
  {
    flag: 'dexto',
    name: 'dexto',
    getDir: () => home('.agents', 'skills'),
    label: '~/.agents/skills/',
    skillInstallScope: 'global ~/.agents/skills',
    instructionFormat: 'skill-md',
    docUrl: 'https://dexto.ai',
    lastVerified: '2026-07-26',
    aliasFor: 'opencode',
  },
  {
    flag: 'loaf',
    name: 'loaf',
    getDir: () => home('.agents', 'skills'),
    label: '~/.agents/skills/',
    skillInstallScope: 'global ~/.agents/skills',
    instructionFormat: 'skill-md',
    docUrl: 'https://github.com/loaf-ai/loaf',
    lastVerified: '2026-07-25',
    aliasFor: 'opencode',
  },
  {
    flag: 'replit',
    name: 'replit',
    getDir: () => proj('.agents', 'skills'),
    label: './.agents/skills/',
    skillInstallScope: 'project ./.agents/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://docs.replit.com/features/agent/skills',
    lastVerified: '2026-08-17',
    notes: 'Project-committed .agents/skills only; no user-global skills dir',
  },
  {
    flag: 'zed',
    name: 'zed',
    getDir: () => home('.agents', 'skills'),
    label: '~/.agents/skills/',
    skillInstallScope: 'global ~/.agents/skills',
    instructionFormat: 'skill-md',
    supportLevel: 'verified',
    docUrl: 'https://zed.dev/docs/ai/skills',
    lastVerified: '2026-08-17',
    notes:
      'Flat layout only: skills must be direct children of ~/.agents/skills',
    aliasFor: 'opencode',
  },
  {
    flag: 'promptscript',
    name: 'promptscript',
    getDir: () => proj('agent', 'skills'),
    label: './agent/skills/',
  },
]

function expandConfigPath(configPath) {
  if (!configPath) return null
  if (configPath.startsWith('~/'))
    return home(...configPath.slice(2).split('/'))
  if (configPath.startsWith('./'))
    return proj(...configPath.slice(2).split('/'))
  return configPath
}

for (const a of AGENTS_DATA) {
  if (!a.mcpSupport?.supported) {
    a.mcp = null
    continue
  }
  a.mcp = {
    getPath: () =>
      expandConfigPath(a.mcpPath || a.mcpSupport.configPath) ||
      mcpFromSkillDir(a.getDir)(),
  }
}

import {
  getAgentManifest,
  getAgentManifestByFlag,
  getAgentsBySupportLevel,
  getAgentsWithMcp,
  validateManifest,
  SUPPORT_LEVELS,
  INSTRUCTION_FORMATS,
  MCP_CONFIG_FORMATS,
} from './agents/manifest.js'

export function getAgentByFlag(flag) {
  return AGENTS_DATA.find((a) => a.flag === flag)
}

// Re-export manifest functions
export {
  getAgentManifest,
  getAgentManifestByFlag,
  getAgentsBySupportLevel,
  getAgentsWithMcp,
  validateManifest,
  SUPPORT_LEVELS,
  INSTRUCTION_FORMATS,
  MCP_CONFIG_FORMATS,
}

export default AGENTS_DATA
