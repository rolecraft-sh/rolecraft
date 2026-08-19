# Agent Discovery Paths

rolecraft knows where each AI agent looks for skills. When you use a flag like `--claude` or `--cursor`, it installs to the correct directory for that agent.

| Agent | Directory | Support | MCP |
| ----- | --------- | ------- | --- |
| opencode | `~/.agents/skills/ or ./.agents/skills/` | verified | mcpServers |
| claude-code | `~/.claude/skills/ or ./.claude/skills/` | verified | mcpServers |
| cursor | `~/.cursor/skills/ or ./.cursor/skills/` | verified | mcpServers |
| windsurf | `~/.codeium/windsurf/skills/ or ./.windsurf/skills/` | verified | mcpServers |
| devin | `./.devin/skills/` | verified | mcpServers |
| codex | `~/.agents/skills/ or ./.agents/skills/` | verified | - |
| copilot | `./.github/skills/ or ~/.copilot/skills/` | verified | servers |
| aider | `~/.aider/skills/ or ./.aider/skills/` | experimental | - |
| cline | `~/.cline/skills/ or ./.cline/skills/` | verified | - |
| gemini-cli | `~/.gemini/skills/` | verified | - |
| cody | `~/.cody/skills/ or ./.cody/skills/` | experimental | - |
| continue | `~/.continue/skills/ or ./.continue/skills/` | verified | experimental.mcpServers |
| warp | `~/.agents/skills/` | verified | - |
| codeium | `~/.codeium/skills/` | experimental | - |
| fabric | `~/.fabric/skills/` | experimental | - |
| goose | `~/.agents/skills/` | verified | - |
| tabnine | `~/.tabnine/agent/skills/` | verified | - |
| supermaven | `~/.supermaven/skills/` | experimental | - |
| pr-pilot | `~/.pr-pilot/skills/` | experimental | - |
| loom | `~/.loom/skills/` | experimental | - |
| roo | `~/.roo/skills/` | verified | - |
| trae | `~/.trae/skills/` | verified | - |
| hermes | `~/.hermes/skills/` | experimental | - |
| kiro | `~/.kiro/skills/` | verified | - |
| augment | `~/.augment/skills/` | experimental | - |
| kilo | `~/.kilo/skills/` | experimental | - |
| openhands | `~/.agents/skills/` | verified | - |
| junie | `~/.junie/skills/` | verified | - |
| factory | `~/.factory/skills/` | experimental | - |
| command-code | `~/.commandcode/skills/` | experimental | - |
| cortex | `~/.snowflake/cortex/skills/` | experimental | - |
| mistral-vibe | `~/.vibe/skills/` | experimental | - |
| qwen-code | `~/.qwen/skills/` | verified | - |
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
| forge | `./.forge/skills/` | verified | - |
| inference-sh | `~/.inferencesh/skills/` | experimental | - |
| jazz | `~/.jazz/skills/` | verified | - |
| iflow | `~/.iflow/skills/` | experimental | - |
| kilo-code | `~/.kilocode/skills/` | experimental | - |
| kode | `~/.kode/skills/` | experimental | - |
| lingma | `~/.lingma/skills/` | verified | - |
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
| chatgpt | `~/.agents/skills/` | verified | - |
| codearts-agent | `~/.codeartsdoer/skills/` | experimental | - |
| universal | `~/.config/agents/skills/` | experimental | - |
| amp | `~/.config/agents/skills/` | verified | - |
| antigravity | `~/.agents/skills/` | experimental | - |
| antigravity-cli | `~/.agents/skills/` | experimental | - |
| deep-agents | `~/.agents/skills/` | experimental | - |
| dexto | `~/.agents/skills/` | experimental | - |
| loaf | `~/.agents/skills/` | experimental | - |
| replit | `./.agents/skills/` | verified | - |
| zed | `~/.agents/skills/` | verified | - |
| promptscript | `./agent/skills/` | experimental | - |

> **Support levels:** `verified` — actively tested and maintained; `community` — community-contributed, maintained on best-effort; `legacy` — previous generation, no active development; `experimental` — known to exist, not formally tested.

> **MCP support:** 7 agent(s) support MCP server configuration. Format: `mcpServers`, `servers`, `experimental.mcpServers`

> **Agent count:** 86 total — 26 verified, 0 community, 0 legacy, 60 experimental.

## Notes

- **windsurf:** Rebranded to Devin Desktop; global skills live at ~/.codeium/windsurf/skills, workspace at .windsurf/skills
- **devin:** Devin scans repo-committed skill paths (.agents/skills recommended, .devin/skills among them); no user-global skills dir
- **codex:** Reads ~/.agents/skills (user) and .agents/skills (repo, up to repo root); admin /etc/codex/skills
- **copilot:** Project skills at .github/skills (also reads .claude/skills and .agents/skills); personal skills at ~/.copilot/skills or ~/.agents/skills
- **aider:** No skills concept; conventions are markdown files loaded via .aider.conf.yml read: directives
- **cline:** Also reads project .cline/skills, .clinerules/skills and .claude/skills
- **gemini-cli:** Also reads ~/.agents/skills alias and project .gemini/skills
- **cody:** No official skills support documented; Sourcegraph agentic product is now Amp (ampcode.com)
- **continue:** Confirmed from source code loaders; also reads workspace .claude/skills
- **warp:** Discovers a broad list of provider dirs; ~/.agents/skills is the recommended global path
- **goose:** Legacy .goose/skills and .claude/skills paths still discovered for backward compatibility
- **tabnine:** ~/.agents/skills works as an alias scope
- **supermaven:** Autocomplete tool (Anysphere/Cursor since Nov 2024); no agent skills feature documented
- **loom:** Loom for AWS (awslabs/loom) is an agent deployment platform with no local skills directory; not installable via rolecraft
- **roo:** Also reads project .roo/skills, ~/.agents/skills and .agents/skills
- **trae:** Also reads project .trae/skills; optional .agents/skills support behind a setting toggle
- **kiro:** Also reads project .kiro/skills; no cross-agent aliases
- **openhands:** Also reads project .agents/skills; legacy .openhands/skills and .openhands/microagents still supported
- **junie:** Also reads project .junie/skills; auto-imports .cursor/.claude/.codex skill folders
- **qwen-code:** Also reads project .qwen/skills
- **forge:** ForgeCode by tailcallhq; also reads ~/forge/skills and ~/.agents/skills; project dir has highest precedence
- **jazz:** jazz-ai (lvndry/jazz, not an AWS product); also reads project ./skills
- **lingma:** Also reads project .lingma/skills; renamed to Qoder CN on 2026-05-20
- **chatgpt:** ChatGPT/Codex share the .agents skills locations; symlinked skill folders honored
- **amp:** amp skill add --global installs to ~/.config/agents/skills; also reads ~/.agents/skills
- **replit:** Project-committed .agents/skills only; no user-global skills dir
- **zed:** Flat layout only: skills must be direct children of ~/.agents/skills

## Install to multiple agents

```bash
rolecraft install ./my-skill --cursor --devin --copilot --gemini --cody
```
