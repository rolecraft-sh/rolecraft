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
| copilot     | `~/.copilot/skills/` or `./.copilot/skills/`   |
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

> ⚠️ Windsurf has been rebranded to **Devin Desktop**. The `--windsurf` flag and `~/.windsurf/skills/` path still work for backward compatibility, but new deployments should use `--devin` / `~/.devin/skills/`.

## Install to multiple agents

```bash
rolecraft install ./my-skill --cursor --devin --copilot --gemini --cody
```
