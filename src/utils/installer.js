import { mkdir, cp, writeFile, stat, symlink, rm } from 'node:fs/promises'
import { join, relative, dirname } from 'node:path'
import { getAgentsDir, getClaudeDir, getCursorDir, getWindsurfDir, getCodexDir, getCopilotProjectDir, getAiderDir, getClineDir, getDevinDir, getGeminiDir, getCodyDir, getContinueDir, getWarpDir, getCodeiumDir, getFabricDir, getGooseDir, getTabnineDir, getSupermavenDir, getPrPilotDir, getLoomDir, getRooDir, getTraeDir, getHermesDir, getKiroDir, getAugmentDir, getKiloDir, getOpenHandsDir, getJunieDir, getFactoryDir, getCommandCodeDir, getCortexDir, getMistralVibeDir, getQwenCodeDir, getOpenClawDir, getCodeBuddyDir, getMuxDir, getPiDir, getAutohandCodeDir, getRovoDevDir, getFirebenderDir, getBobDir, getAiderDeskDir, getCodeArtsDoerDir, getCodeMakerDir, getCodeStudioDir, getCrushDir, getEveDir, getForgeDir, getInferenceShDir, getJazzDir, getIFlowDir, getKiloCodeDir, getKodeDir, getLingmaDir, getMcpJamDir, getMoxbyDir, getOnaDir, getQoderDir, getReasonixDir, getTerraMindDir, getTinyCloudDir, getZencoderDir, getZapDir, getCodeepDir, getKimiCodeDir, getZCodeDir, addSkillToLock, getGlobalLockPath, getProjectLockPath, computeFileHashes } from './lockfile.js'

function normalizeSlug(slug) {
  return slug.replace(/\//g, '-')
}

const targetToAgentName = {
  agents: 'opencode',
  claude: 'claude-code',
  cursor: 'cursor',
  windsurf: 'windsurf',
  devin: 'devin',
  codex: 'codex',
  copilot: 'copilot',
  aider: 'aider',
  cline: 'cline',
  gemini: 'gemini-cli',
  cody: 'cody',
  continue: 'continue',
  warp: 'warp',
  codeium: 'codeium',
  fabric: 'fabric',
  goose: 'goose',
  tabnine: 'tabnine',
  supermaven: 'supermaven',
  'pr-pilot': 'pr-pilot',
  loom: 'loom',
  roo: 'roo',
  trae: 'trae',
  hermes: 'hermes',
  kiro: 'kiro',
  augment: 'augment',
  kilo: 'kilo',
  openhands: 'openhands',
  junie: 'junie',
  factory: 'factory',
  'command-code': 'command-code',
  cortex: 'cortex',
  'mistral-vibe': 'mistral-vibe',
  'qwen-code': 'qwen-code',
  openclaw: 'openclaw',
  codebuddy: 'codebuddy',
  mux: 'mux',
  pi: 'pi',
  'autohand-code': 'autohand-code',
  rovo: 'rovo-dev',
  firebender: 'firebender',
  bob: 'ibm-bob',
  'aider-desk': 'aider-desk',
  'code-arts-doer': 'code-arts-doer',
  'code-maker': 'code-maker',
  'code-studio': 'code-studio',
  crush: 'crush',
  eve: 'eve',
  forge: 'forge',
  'inference-sh': 'inference-sh',
  jazz: 'jazz',
  iflow: 'iflow',
  'kilo-code': 'kilo-code',
  kode: 'kode',
  lingma: 'lingma',
  'mcp-jam': 'mcp-jam',
  moxby: 'moxby',
  ona: 'ona',
  qoder: 'qoder',
  reasonix: 'reasonix',
  'terra-mind': 'terra-mind',
  'tiny-cloud': 'tiny-cloud',
  zencoder: 'zencoder',
  zap: 'zap',
  codeep: 'codeep',
  'kimi-code': 'kimi-code',
  zcode: 'zcode',
}

export async function installSkill(resolved, targets, mode = 'copy') {
  const slug = resolved.slug
  const results = []

  const agentNames = targets.map(t => targetToAgentName[t] || t)

  for (const target of targets) {
    let baseDir
    let label

    switch (target) {
      case 'agents': {
        baseDir = getAgentsDir()
        label = '~/.agents/skills/'
        break
      }
      case 'claude': {
        baseDir = getClaudeDir()
        label = '~/.claude/skills/'
        break
      }
      case 'cursor': {
        baseDir = getCursorDir()
        label = '~/.cursor/skills/'
        break
      }
      case 'windsurf': {
        baseDir = getWindsurfDir()
        label = '~/.windsurf/skills/'
        break
      }
      case 'codex': {
        baseDir = getCodexDir()
        label = '~/.codex/skills/'
        break
      }
      case 'copilot': {
        baseDir = getCopilotProjectDir()
        label = './.github/copilot/skills/'
        break
      }
      case 'aider': {
        baseDir = getAiderDir()
        label = '~/.aider/skills/'
        break
      }
      case 'cline': {
        baseDir = getClineDir()
        label = '~/.cline/skills/'
        break
      }
      case 'devin': {
        baseDir = getDevinDir()
        label = '~/.devin/skills/'
        break
      }
      case 'gemini': {
        baseDir = getGeminiDir()
        label = '~/.gemini/skills/'
        break
      }
      case 'cody': {
        baseDir = getCodyDir()
        label = '~/.cody/skills/'
        break
      }
      case 'continue': {
        baseDir = getContinueDir()
        label = '~/.continue/skills/'
        break
      }
      case 'warp': {
        baseDir = getWarpDir()
        label = '~/.warp/skills/'
        break
      }
      case 'codeium': {
        baseDir = getCodeiumDir()
        label = '~/.codeium/skills/'
        break
      }
      case 'fabric': {
        baseDir = getFabricDir()
        label = '~/.fabric/skills/'
        break
      }
      case 'goose': {
        baseDir = getGooseDir()
        label = '~/.goose/skills/'
        break
      }
      case 'tabnine': {
        baseDir = getTabnineDir()
        label = '~/.tabnine/skills/'
        break
      }
      case 'supermaven': {
        baseDir = getSupermavenDir()
        label = '~/.supermaven/skills/'
        break
      }
      case 'pr-pilot': {
        baseDir = getPrPilotDir()
        label = '~/.pr-pilot/skills/'
        break
      }
      case 'loom': {
        baseDir = getLoomDir()
        label = '~/.loom/skills/'
        break
      }
      case 'roo': {
        baseDir = getRooDir()
        label = '~/.roo/skills/'
        break
      }
      case 'trae': {
        baseDir = getTraeDir()
        label = '~/.trae/skills/'
        break
      }
      case 'hermes': {
        baseDir = getHermesDir()
        label = '~/.hermes/skills/'
        break
      }
      case 'kiro': {
        baseDir = getKiroDir()
        label = '~/.kiro/skills/'
        break
      }
      case 'augment': {
        baseDir = getAugmentDir()
        label = '~/.augment/skills/'
        break
      }
      case 'kilo': {
        baseDir = getKiloDir()
        label = '~/.kilo/skills/'
        break
      }
      case 'openhands': {
        baseDir = getOpenHandsDir()
        label = '~/.openhands/skills/'
        break
      }
      case 'junie': {
        baseDir = getJunieDir()
        label = '~/.junie/skills/'
        break
      }
      case 'factory': {
        baseDir = getFactoryDir()
        label = '~/.factory/skills/'
        break
      }
      case 'command-code': {
        baseDir = getCommandCodeDir()
        label = '~/.commandcode/skills/'
        break
      }
      case 'cortex': {
        baseDir = getCortexDir()
        label = '~/.snowflake/cortex/skills/'
        break
      }
      case 'mistral-vibe': {
        baseDir = getMistralVibeDir()
        label = '~/.vibe/skills/'
        break
      }
      case 'qwen-code': {
        baseDir = getQwenCodeDir()
        label = '~/.qwen/skills/'
        break
      }
      case 'openclaw': {
        baseDir = getOpenClawDir()
        label = '~/.openclaw/skills/'
        break
      }
      case 'codebuddy': {
        baseDir = getCodeBuddyDir()
        label = '~/.codebuddy/skills/'
        break
      }
      case 'mux': {
        baseDir = getMuxDir()
        label = '~/.mux/skills/'
        break
      }
      case 'pi': {
        baseDir = getPiDir()
        label = '~/.pi/agent/skills/'
        break
      }
      case 'autohand-code': {
        baseDir = getAutohandCodeDir()
        label = '~/.autohand/skills/'
        break
      }
      case 'rovo': {
        baseDir = getRovoDevDir()
        label = '~/.rovodev/skills/'
        break
      }
      case 'firebender': {
        baseDir = getFirebenderDir()
        label = '~/.firebender/skills/'
        break
      }
      case 'bob': {
        baseDir = getBobDir()
        label = '~/.bob/skills/'
        break
      }
      case 'aider-desk': {
        baseDir = getAiderDeskDir()
        label = '~/.aider-desk/skills/'
        break
      }
      case 'code-arts-doer': {
        baseDir = getCodeArtsDoerDir()
        label = '~/.codeartsdoer/skills/'
        break
      }
      case 'code-maker': {
        baseDir = getCodeMakerDir()
        label = '~/.codemaker/skills/'
        break
      }
      case 'code-studio': {
        baseDir = getCodeStudioDir()
        label = '~/.codestudio/skills/'
        break
      }
      case 'crush': {
        baseDir = getCrushDir()
        label = '~/.crush/skills/'
        break
      }
      case 'eve': {
        baseDir = getEveDir()
        label = './agent/skills/'
        break
      }
      case 'forge': {
        baseDir = getForgeDir()
        label = '~/.forge/skills/'
        break
      }
      case 'inference-sh': {
        baseDir = getInferenceShDir()
        label = '~/.inferencesh/skills/'
        break
      }
      case 'jazz': {
        baseDir = getJazzDir()
        label = '~/.jazz/skills/'
        break
      }
      case 'iflow': {
        baseDir = getIFlowDir()
        label = '~/.iflow/skills/'
        break
      }
      case 'kilo-code': {
        baseDir = getKiloCodeDir()
        label = '~/.kilocode/skills/'
        break
      }
      case 'kode': {
        baseDir = getKodeDir()
        label = '~/.kode/skills/'
        break
      }
      case 'lingma': {
        baseDir = getLingmaDir()
        label = '~/.lingma/skills/'
        break
      }
      case 'mcp-jam': {
        baseDir = getMcpJamDir()
        label = '~/.mcpjam/skills/'
        break
      }
      case 'moxby': {
        baseDir = getMoxbyDir()
        label = '~/.moxby/skills/'
        break
      }
      case 'ona': {
        baseDir = getOnaDir()
        label = '~/.ona/skills/'
        break
      }
      case 'qoder': {
        baseDir = getQoderDir()
        label = '~/.qoder/skills/'
        break
      }
      case 'reasonix': {
        baseDir = getReasonixDir()
        label = '~/.reasonix/skills/'
        break
      }
      case 'terra-mind': {
        baseDir = getTerraMindDir()
        label = '~/.terramind/skills/'
        break
      }
      case 'tiny-cloud': {
        baseDir = getTinyCloudDir()
        label = '~/.tinycloud/skills/'
        break
      }
      case 'zencoder': {
        baseDir = getZencoderDir()
        label = '~/.zencoder/skills/'
        break
      }
      case 'zap': {
        baseDir = getZapDir()
        label = '~/.zap/skills/'
        break
      }
      case 'codeep': {
        baseDir = getCodeepDir()
        label = '~/.codeep/skills/'
        break
      }
      case 'kimi-code': {
        baseDir = getKimiCodeDir()
        label = '~/.kimi-code/skills/'
        break
      }
      case 'zcode': {
        baseDir = getZCodeDir()
        label = '~/.zcode/skills/'
        break
      }
      case 'project': {
        baseDir = join(process.cwd(), '.agents', 'skills')
        label = './.agents/skills/'
        break
      }
      default:
        continue
    }

    const slugDir = join(baseDir, normalizeSlug(slug))

    if (mode === 'symlink' && resolved.skillDir) {
      const relPath = relative(dirname(slugDir), resolved.skillDir)
      await rm(slugDir, { recursive: true, force: true })
      await mkdir(dirname(slugDir), { recursive: true })
      await symlink(relPath, slugDir)
    } else {
      await rm(slugDir, { recursive: true, force: true })
      await mkdir(slugDir, { recursive: true })
      for (const file of resolved.files) {
        const dst = join(slugDir, file)
        if (Object.hasOwn(resolved.fileContents || {}, file)) {
          await writeFile(dst, resolved.fileContents[file])
        } else if (resolved.skillDir) {
          const src = join(resolved.skillDir, file)
          try {
            await stat(src)
            await cp(src, dst, { recursive: true, force: true })
          } catch {
            // skip files that don't exist
          }
        }
      }
    }

    const lockPath = target === 'project'
      ? getProjectLockPath(process.cwd())
      : getGlobalLockPath()

    await addSkillToLock(slug, {
      slug,
      contentSha: resolved.contentSha,
      fileHashes: resolved.fileContents ? computeFileHashes(resolved.fileContents) : undefined,
      installedAt: new Date().toISOString(),
      agents: agentNames,
      source: resolved.sourcePath,
      sourceType: resolved.sourceType,
    }, lockPath)

    results.push({ target, path: slugDir, label })
  }

  return results
}
