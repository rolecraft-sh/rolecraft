# Agent Discovery Paths

rolecraft knows where each AI agent looks for skills. When you use a flag like `--claude` or `--cursor`, it installs to the correct directory for that agent.

| Agent       | Directory                                      |
| ----------- | ---------------------------------------------- |
| opencode    | `~/.agents/skills/` or `./.agents/skills/`     |
| claude-code | `~/.claude/skills/` or `./.claude/skills/`     |
| cursor      | `~/.cursor/skills/` or `./.cursor/skills/`     |
| windsurf ⚠️ | `~/.windsurf/skills/` or `./.windsurf/skills/` |
| devin       | `~/.devin/skills/` or `./.devin/skills/`       |
| codex       | `~/.codex/skills/` or `./.codex/skills/`       |
| copilot     | `./.github/copilot/skills/` or `~/.copilot/skills/` |
| aider       | `~/.aider/skills/` or `./.aider/skills/`       |
| cline       | `~/.cline/skills/` or `./.cline/skills/`       |
| gemini-cli  | `~/.gemini/skills/`                            |
| cody        | `~/.cody/skills/`                              |
| continue    | `~/.continue/skills/`                          |
| warp        | `~/.warp/skills/`                              |
| codeium     | `~/.codeium/skills/`                           |
| fabric      | `~/.fabric/skills/`                            |
| goose       | `~/.goose/skills/`                             |
| tabnine     | `~/.tabnine/skills/`                           |
| supermaven  | `~/.supermaven/skills/`                        |
| pr-pilot    | `~/.pr-pilot/skills/`                          |
| loom        | `~/.loom/skills/`                              |
| roo         | `~/.roo/skills/`                               |
| trae        | `~/.trae/skills/`                              |
| hermes      | `~/.hermes/skills/`                            |
| kiro        | `~/.kiro/skills/`                              |
| augment     | `~/.augment/skills/`                           |
| kilo        | `~/.kilo/skills/`                              |
| openhands   | `~/.openhands/skills/`                         |
| junie       | `~/.junie/skills/`                             |
| factory     | `~/.factory/skills/`                             |
| command-code | `~/.commandcode/skills/`                        |
| cortex      | `~/.snowflake/cortex/skills/`                   |
| mistral-vibe | `~/.vibe/skills/`                              |
| qwen-code   | `~/.qwen/skills/`                               |
| openclaw    | `~/.openclaw/skills/`                           |
| codebuddy   | `~/.codebuddy/skills/`                          |
| mux         | `~/.mux/skills/`                                |
| pi          | `~/.pi/agent/skills/`                           |
| autohand-code | `~/.autohand/skills/`                         |
| rovo        | `~/.rovodev/skills/`                            |
| firebender  | `~/.firebender/skills/`                         |
| bob         | `~/.bob/skills/`                                |
| aider-desk  | `~/.aider-desk/skills/`                         |
| zap             | `~/.zap/skills/`                                  |
| codeep          | `~/.codeep/skills/`                               |
| kimi-code       | `~/.kimi-code/skills/`                            |
| zcode           | `~/.zcode/skills/`                                |
| code-arts-doer  | `~/.codeartsdoer/skills/`                         |
| code-maker      | `~/.codemaker/skills/`                            |
| code-studio     | `~/.codestudio/skills/`                           |
| crush           | `~/.crush/skills/`                                |
| eve             | `./agent/skills/`                                 |
| forge           | `~/.forge/skills/`                                |
| inference-sh    | `~/.inferencesh/skills/`                          |
| jazz            | `~/.jazz/skills/`                                 |
| iflow           | `~/.iflow/skills/`                                |
| kilo-code       | `~/.kilocode/skills/`                             |
| kode            | `~/.kode/skills/`                                 |
| lingma          | `~/.lingma/skills/`                               |
| mcp-jam         | `~/.mcpjam/skills/`                               |
| moxby           | `~/.moxby/skills/`                                |
| ona             | `~/.ona/skills/`                                  |
| qoder           | `~/.qoder/skills/`                                |
| reasonix        | `~/.reasonix/skills/`                             |
| terra-mind      | `~/.terramind/skills/`                            |
| tiny-cloud      | `~/.tinycloud/skills/`                            |
| zencoder        | `~/.zencoder/skills/`                             |
| amp             | `~/.agents/skills/`                               |
| antigravity     | `~/.agents/skills/`                               |
| antigravity-cli | `~/.agents/skills/`                               |
| deep-agents     | `~/.agents/skills/`                               |
| dexto           | `~/.agents/skills/`                               |
| loaf            | `~/.agents/skills/`                               |
| replit          | `~/.agents/skills/`                               |
| zed             | `~/.agents/skills/`                               |
| promptscript    | `./agent/skills/`                                 |
| astrbot         | `~/.astrbot/data/skills/`                         |
| qoder-cn        | `~/.qoder-cn/skills/`                             |
| trae-cn         | `~/.trae-cn/skills/`                              |
| zenflow         | `~/.zencoder/skills/`                             |
| neovate         | `~/.neovate/skills/`                              |
| pochi           | `~/.pochi/skills/`                                |
| adal            | `~/.adal/skills/`                                 |

> ⚠️ Windsurf has been rebranded to **Devin Desktop**. The `--windsurf` flag and `~/.windsurf/skills/` path still work for backward compatibility, but new deployments should use `--devin` / `~/.devin/skills/`.

## Install to multiple agents

```bash
rolecraft install ./my-skill --cursor --devin --copilot --gemini --cody
```
