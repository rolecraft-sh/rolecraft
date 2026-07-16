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
    return dir.slice(0, dir.lastIndexOf('/')) + '/mcp.json'
  }
}

const AGENTS_DATA = [
  { flag: 'agents', name: 'opencode', getDir: () => home('.agents', 'skills'), label: '~/.agents/skills/' },
  { flag: 'claude', name: 'claude-code', getDir: () => home('.claude', 'skills'), label: '~/.claude/skills/' },
  { flag: 'cursor', name: 'cursor', getDir: () => home('.cursor', 'skills'), label: '~/.cursor/skills/' },
  { flag: 'windsurf', name: 'windsurf', getDir: () => home('.windsurf', 'skills'), label: '~/.windsurf/skills/' },
  { flag: 'devin', name: 'devin', getDir: () => home('.devin', 'skills'), label: '~/.devin/skills/' },
  { flag: 'codex', name: 'codex', getDir: () => home('.codex', 'skills'), label: '~/.codex/skills/' },
  { flag: 'copilot', name: 'copilot', getDir: () => proj('.github', 'copilot', 'skills'), label: './.github/copilot/skills/' },
  { flag: 'aider', name: 'aider', getDir: () => home('.aider', 'skills'), label: '~/.aider/skills/' },
  { flag: 'cline', name: 'cline', getDir: () => home('.cline', 'skills'), label: '~/.cline/skills/' },
  { flag: 'gemini', name: 'gemini-cli', getDir: () => home('.gemini', 'skills'), label: '~/.gemini/skills/' },
  { flag: 'cody', name: 'cody', getDir: () => home('.cody', 'skills'), label: '~/.cody/skills/' },
  { flag: 'continue', name: 'continue', getDir: () => home('.continue', 'skills'), label: '~/.continue/skills/' },
  { flag: 'warp', name: 'warp', getDir: () => home('.warp', 'skills'), label: '~/.warp/skills/' },
  { flag: 'codeium', name: 'codeium', getDir: () => home('.codeium', 'skills'), label: '~/.codeium/skills/' },
  { flag: 'fabric', name: 'fabric', getDir: () => home('.fabric', 'skills'), label: '~/.fabric/skills/' },
  { flag: 'goose', name: 'goose', getDir: () => home('.goose', 'skills'), label: '~/.goose/skills/' },
  { flag: 'tabnine', name: 'tabnine', getDir: () => home('.tabnine', 'skills'), label: '~/.tabnine/skills/' },
  { flag: 'supermaven', name: 'supermaven', getDir: () => home('.supermaven', 'skills'), label: '~/.supermaven/skills/' },
  { flag: 'pr-pilot', name: 'pr-pilot', getDir: () => home('.pr-pilot', 'skills'), label: '~/.pr-pilot/skills/' },
  { flag: 'loom', name: 'loom', getDir: () => home('.loom', 'skills'), label: '~/.loom/skills/' },
  { flag: 'roo', name: 'roo', getDir: () => home('.roo', 'skills'), label: '~/.roo/skills/' },
  { flag: 'trae', name: 'trae', getDir: () => home('.trae', 'skills'), label: '~/.trae/skills/' },
  { flag: 'hermes', name: 'hermes', getDir: () => home('.hermes', 'skills'), label: '~/.hermes/skills/' },
  { flag: 'kiro', name: 'kiro', getDir: () => home('.kiro', 'skills'), label: '~/.kiro/skills/' },
  { flag: 'augment', name: 'augment', getDir: () => home('.augment', 'skills'), label: '~/.augment/skills/' },
  { flag: 'kilo', name: 'kilo', getDir: () => home('.kilo', 'skills'), label: '~/.kilo/skills/' },
  { flag: 'openhands', name: 'openhands', getDir: () => home('.openhands', 'skills'), label: '~/.openhands/skills/' },
  { flag: 'junie', name: 'junie', getDir: () => home('.junie', 'skills'), label: '~/.junie/skills/' },
  { flag: 'factory', name: 'factory', getDir: () => home('.factory', 'skills'), label: '~/.factory/skills/' },
  { flag: 'command-code', name: 'command-code', getDir: () => home('.commandcode', 'skills'), label: '~/.commandcode/skills/' },
  { flag: 'cortex', name: 'cortex', getDir: () => home('.snowflake', 'cortex', 'skills'), label: '~/.snowflake/cortex/skills/' },
  { flag: 'mistral-vibe', name: 'mistral-vibe', getDir: () => home('.vibe', 'skills'), label: '~/.vibe/skills/' },
  { flag: 'qwen-code', name: 'qwen-code', getDir: () => home('.qwen', 'skills'), label: '~/.qwen/skills/' },
  { flag: 'openclaw', name: 'openclaw', getDir: () => home('.openclaw', 'skills'), label: '~/.openclaw/skills/' },
  { flag: 'codebuddy', name: 'codebuddy', getDir: () => home('.codebuddy', 'skills'), label: '~/.codebuddy/skills/' },
  { flag: 'mux', name: 'mux', getDir: () => home('.mux', 'skills'), label: '~/.mux/skills/' },
  { flag: 'pi', name: 'pi', getDir: () => home('.pi', 'agent', 'skills'), label: '~/.pi/agent/skills/' },
  { flag: 'autohand-code', name: 'autohand-code', getDir: () => home('.autohand', 'skills'), label: '~/.autohand/skills/' },
  { flag: 'rovo', name: 'rovo-dev', getDir: () => home('.rovodev', 'skills'), label: '~/.rovodev/skills/' },
  { flag: 'firebender', name: 'firebender', getDir: () => home('.firebender', 'skills'), label: '~/.firebender/skills/' },
  { flag: 'bob', name: 'ibm-bob', getDir: () => home('.bob', 'skills'), label: '~/.bob/skills/' },
  { flag: 'aider-desk', name: 'aider-desk', getDir: () => home('.aider-desk', 'skills'), label: '~/.aider-desk/skills/' },
  { flag: 'code-arts-doer', name: 'code-arts-doer', getDir: () => home('.codeartsdoer', 'skills'), label: '~/.codeartsdoer/skills/' },
  { flag: 'code-maker', name: 'code-maker', getDir: () => home('.codemaker', 'skills'), label: '~/.codemaker/skills/' },
  { flag: 'code-studio', name: 'code-studio', getDir: () => home('.codestudio', 'skills'), label: '~/.codestudio/skills/' },
  { flag: 'crush', name: 'crush', getDir: () => home('.crush', 'skills'), label: '~/.crush/skills/' },
  { flag: 'eve', name: 'eve', getDir: () => proj('agent', 'skills'), label: './agent/skills/' },
  { flag: 'forge', name: 'forge', getDir: () => home('.forge', 'skills'), label: '~/.forge/skills/' },
  { flag: 'inference-sh', name: 'inference-sh', getDir: () => home('.inferencesh', 'skills'), label: '~/.inferencesh/skills/' },
  { flag: 'jazz', name: 'jazz', getDir: () => home('.jazz', 'skills'), label: '~/.jazz/skills/' },
  { flag: 'iflow', name: 'iflow', getDir: () => home('.iflow', 'skills'), label: '~/.iflow/skills/' },
  { flag: 'kilo-code', name: 'kilo-code', getDir: () => home('.kilocode', 'skills'), label: '~/.kilocode/skills/' },
  { flag: 'kode', name: 'kode', getDir: () => home('.kode', 'skills'), label: '~/.kode/skills/' },
  { flag: 'lingma', name: 'lingma', getDir: () => home('.lingma', 'skills'), label: '~/.lingma/skills/' },
  { flag: 'mcp-jam', name: 'mcp-jam', getDir: () => home('.mcpjam', 'skills'), label: '~/.mcpjam/skills/' },
  { flag: 'moxby', name: 'moxby', getDir: () => home('.moxby', 'skills'), label: '~/.moxby/skills/' },
  { flag: 'ona', name: 'ona', getDir: () => home('.ona', 'skills'), label: '~/.ona/skills/' },
  { flag: 'qoder', name: 'qoder', getDir: () => home('.qoder', 'skills'), label: '~/.qoder/skills/' },
  { flag: 'reasonix', name: 'reasonix', getDir: () => home('.reasonix', 'skills'), label: '~/.reasonix/skills/' },
  { flag: 'terra-mind', name: 'terra-mind', getDir: () => home('.terramind', 'skills'), label: '~/.terramind/skills/' },
  { flag: 'tiny-cloud', name: 'tiny-cloud', getDir: () => home('.tinycloud', 'skills'), label: '~/.tinycloud/skills/' },
  { flag: 'zencoder', name: 'zencoder', getDir: () => home('.zencoder', 'skills'), label: '~/.zencoder/skills/' },
  { flag: 'zap', name: 'zap', getDir: () => home('.zap', 'skills'), label: '~/.zap/skills/' },
  { flag: 'codeep', name: 'codeep', getDir: () => home('.codeep', 'skills'), label: '~/.codeep/skills/' },
  { flag: 'kimi-code', name: 'kimi-code', getDir: () => home('.kimi-code', 'skills'), label: '~/.kimi-code/skills/' },
  { flag: 'zcode', name: 'zcode', getDir: () => home('.zcode', 'skills'), label: '~/.zcode/skills/' },
  { flag: 'astrbot', name: 'astrbot', getDir: () => home('.astrbot', 'data', 'skills'), label: '~/.astrbot/data/skills/' },
  { flag: 'qoder-cn', name: 'qoder-cn', getDir: () => home('.qoder-cn', 'skills'), label: '~/.qoder-cn/skills/' },
  { flag: 'trae-cn', name: 'trae-cn', getDir: () => home('.trae-cn', 'skills'), label: '~/.trae-cn/skills/' },
  { flag: 'zenflow', name: 'zenflow', getDir: () => home('.zencoder', 'skills'), label: '~/.zencoder/skills/' },
  { flag: 'neovate', name: 'neovate', getDir: () => home('.neovate', 'skills'), label: '~/.neovate/skills/' },
  { flag: 'pochi', name: 'pochi', getDir: () => home('.pochi', 'skills'), label: '~/.pochi/skills/' },
  { flag: 'adal', name: 'adal', getDir: () => home('.adal', 'skills'), label: '~/.adal/skills/' },
  { flag: 'droid', name: 'droid', getDir: () => home('.factory', 'skills'), label: '~/.factory/skills/' },
  { flag: 'chatgpt', name: 'chatgpt', getDir: () => home('.chatgpt', 'skills'), label: '~/.chatgpt/skills/' },
  { flag: 'codearts-agent', name: 'codearts-agent', getDir: () => home('.codeartsdoer', 'skills'), label: '~/.codeartsdoer/skills/' },
  { flag: 'universal', name: 'universal', getDir: () => home('.config', 'agents', 'skills'), label: '~/.config/agents/skills/' },
  { flag: 'amp', name: 'amp', getDir: () => home('.agents', 'skills'), label: '~/.agents/skills/' },
  { flag: 'antigravity', name: 'antigravity', getDir: () => home('.agents', 'skills'), label: '~/.agents/skills/' },
  { flag: 'antigravity-cli', name: 'antigravity-cli', getDir: () => home('.agents', 'skills'), label: '~/.agents/skills/' },
  { flag: 'deepagents', name: 'deep-agents', getDir: () => home('.agents', 'skills'), label: '~/.agents/skills/' },
  { flag: 'dexto', name: 'dexto', getDir: () => home('.agents', 'skills'), label: '~/.agents/skills/' },
  { flag: 'loaf', name: 'loaf', getDir: () => home('.agents', 'skills'), label: '~/.agents/skills/' },
  { flag: 'replit', name: 'replit', getDir: () => home('.agents', 'skills'), label: '~/.agents/skills/' },
  { flag: 'zed', name: 'zed', getDir: () => home('.agents', 'skills'), label: '~/.agents/skills/' },
  { flag: 'promptscript', name: 'promptscript', getDir: () => proj('agent', 'skills'), label: './agent/skills/' },
]

for (const a of AGENTS_DATA) {
  a.mcp = { getPath: mcpFromSkillDir(a.getDir) }
}

function find(flag) {
  return AGENTS_DATA.findIndex(a => a.flag === flag)
}

// Override non-standard MCP paths
AGENTS_DATA[find('claude')].mcp = { getPath: () => home('.claude', 'claude_code.json') }
AGENTS_DATA[find('windsurf')].mcp = { getPath: () => home('.windsurf', 'mcp_config.json') }
AGENTS_DATA[find('copilot')].mcp = { getPath: () => proj('.github', 'copilot', '.mcp.json') }
AGENTS_DATA[find('continue')].mcp = { getPath: () => home('.continue', 'config.json') }

export function getAgentByFlag(flag) {
  return AGENTS_DATA.find(a => a.flag === flag)
}

export default AGENTS_DATA
