# Agent Discovery Paths

rolecraft knows where each AI agent looks for skills. When you use a flag like `--claude` or `--cursor`, it installs to the correct directory for that agent.

| Agent | Directory | Support | MCP |
| ----- | --------- | ------- | --- |
| opencode | `~/.agents/skills/ or ./.agents/skills/` | verified | - |
| claude-code | `~/.claude/skills/ or ./.claude/skills/` | verified | mcpServers |
| cursor | `~/.cursor/skills/ or ./.cursor/skills/` | verified | mcpServers |
| windsurf | `~/.windsurf/skills/ or ./.windsurf/skills/` | community | mcpServers |
| devin | `~/.devin/skills/ or ./.devin/skills/` | experimental | - |
| codex | `~/.codex/skills/ or ./.codex/skills/` | community | - |
| copilot | `./.github/copilot/skills/ or ~/.copilot/skills/` | legacy | - |
| aider | `~/.aider/skills/ or ./.aider/skills/` | experimental | - |
| cline | `~/.cline/skills/ or ./.cline/skills/` | experimental | - |
| gemini-cli | `~/.gemini/skills/` | experimental | - |
| cody | `~/.cody/skills/ or ./.cody/skills/` | experimental | - |
| continue | `~/.continue/skills/ or ./.continue/skills/` | community | experimental.mcpServers |
| warp | `~/.warp/skills/` | experimental | - |
| codeium | `~/.codeium/skills/` | experimental | - |
| fabric | `~/.fabric/skills/` | experimental | - |
| goose | `~/.goose/skills/` | experimental | - |
| tabnine | `~/.tabnine/skills/` | experimental | - |
| supermaven | `~/.supermaven/skills/` | experimental | - |
| pr-pilot | `~/.pr-pilot/skills/` | experimental | - |
| loom | `~/.loom/skills/` | experimental | - |
| roo | `~/.roo/skills/` | experimental | - |
| trae | `~/.trae/skills/` | experimental | - |
| hermes | `~/.hermes/skills/` | experimental | - |
| kiro | `~/.kiro/skills/` | experimental | - |
| augment | `~/.augment/skills/` | experimental | - |
| kilo | `~/.kilo/skills/` | experimental | - |
| openhands | `~/.openhands/skills/` | experimental | - |
| junie | `~/.junie/skills/` | experimental | - |
| factory | `~/.factory/skills/` | experimental | - |
| command-code | `~/.commandcode/skills/` | experimental | - |
| cortex | `~/.snowflake/cortex/skills/` | experimental | - |
| mistral-vibe | `~/.vibe/skills/` | experimental | - |
| qwen-code | `~/.qwen/skills/` | experimental | - |
| openclaw | `~/.openclaw/skills/` | experimental | - |
| codebuddy | `~/.codebuddy/skills/` | experimental | - |
| mux | `~/.mux/skills/` | experimental | - |
| pi | `~/.pi/agent/skills/` | experimental | - |
| autohand-code | `~/.autohand/skills/` | experimental | - |
| rovo-dev | `~/.rovodev/skills/` | experimental | - |
| firebender | `~/.firebender/skills/` | experimental | - |
| ibm-bob | `~/.bob/skills/` | experimental | - |
| aider-desk | `~/.aider-desk/skills/` | experimental | - |
| code-arts-doer | `~/.codeartsdoer/skills/` | experimental | - |
| code-maker | `~/.codemaker/skills/` | experimental | - |
| code-studio | `~/.codestudio/skills/` | experimental | - |
| crush | `~/.crush/skills/` | experimental | - |
| eve | `./agent/skills/` | experimental | - |
| forge | `~/.forge/skills/` | experimental | - |
| inference-sh | `~/.inferencesh/skills/` | experimental | - |
| jazz | `~/.jazz/skills/` | experimental | - |
| iflow | `~/.iflow/skills/` | experimental | - |
| kilo-code | `~/.kilocode/skills/` | experimental | - |
| kode | `~/.kode/skills/` | experimental | - |
| lingma | `~/.lingma/skills/` | experimental | - |
| mcp-jam | `~/.mcpjam/skills/` | experimental | - |
| moxby | `~/.moxby/skills/` | experimental | - |
| ona | `~/.ona/skills/` | experimental | - |
| qoder | `~/.qoder/skills/` | experimental | - |
| reasonix | `~/.reasonix/skills/` | experimental | - |
| terra-mind | `~/.terramind/skills/` | experimental | - |
| tiny-cloud | `~/.tinycloud/skills/` | experimental | - |
| zencoder | `~/.zencoder/skills/` | experimental | - |
| zap | `~/.zap/skills/` | experimental | - |
| codeep | `~/.codeep/skills/` | experimental | - |
| kimi-code | `~/.kimi-code/skills/` | experimental | - |
| zcode | `~/.zcode/skills/` | experimental | - |
| astrbot | `~/.astrbot/data/skills/` | experimental | - |
| qoder-cn | `~/.qoder-cn/skills/` | experimental | - |
| trae-cn | `~/.trae-cn/skills/` | experimental | - |
| zenflow | `~/.zenflow/skills/` | experimental | - |
| neovate | `~/.neovate/skills/` | experimental | - |
| pochi | `~/.pochi/skills/` | experimental | - |
| adal | `~/.adal/skills/` | experimental | - |
| droid | `~/.droid/skills/` | experimental | - |
| chatgpt | `~/.chatgpt/skills/` | experimental | - |
| codearts-agent | `~/.codeartsdoer/skills/` | experimental | - |
| universal | `~/.config/agents/skills/` | experimental | - |
| amp | `~/.agents/skills/` | experimental | - |
| antigravity | `~/.agents/skills/` | experimental | - |
| antigravity-cli | `~/.agents/skills/` | experimental | - |
| deep-agents | `~/.agents/skills/` | experimental | - |
| dexto | `~/.agents/skills/` | experimental | - |
| loaf | `~/.agents/skills/` | experimental | - |
| replit | `~/.agents/skills/` | experimental | - |
| zed | `~/.agents/skills/` | experimental | - |
| promptscript | `./agent/skills/` | experimental | - |

> **Support levels:** `verified` — actively tested and maintained; `community` — community-contributed, maintained on best-effort; `legacy` — previous generation, no active development; `experimental` — known to exist, not formally tested.

> **MCP support:** 4 agent(s) support MCP server configuration. Format: `mcpServers`, `experimental.mcpServers`

> **Agent count:** 86 total — 3 verified, 3 community, 1 legacy, 79 experimental.

## Notes

- **windsurf:** Rebranded to Devin Desktop; use --devin flag for new deployments
- **devin:** Desktop agent with limited MCP support
- **copilot:** MCP support planned but not yet implemented

## Install to multiple agents

```bash
rolecraft install ./my-skill --cursor --devin --copilot --gemini --cody
```
