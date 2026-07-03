import { mkdir, cp, writeFile, readFile, access, stat, symlink, unlink, rm } from 'node:fs/promises'
import { join, basename, relative, dirname } from 'node:path'
import { homedir } from 'node:os'
import { getAgentsDir, getClaudeDir, getCursorDir, getWindsurfDir, getCodexDir, getCopilotDir, getCopilotProjectDir, getAiderDir, getClineDir, getDevinDir, getGeminiDir, getCodyDir, getContinueDir, getWarpDir, getCodeiumDir, getFabricDir, getGooseDir, getTabnineDir, getSupermavenDir, getPrPilotDir, getLoomDir, getRooDir, getTraeDir, getHermesDir, getKiroDir, getAugmentDir, getKiloDir, getOpenHandsDir, getJunieDir, getFactoryDir, getCommandCodeDir, getCortexDir, getMistralVibeDir, getQwenCodeDir, getOpenClawDir, getCodeBuddyDir, getMuxDir, getPiDir, getAutohandCodeDir, getRovoDevDir, getFirebenderDir, getBobDir, getAiderDeskDir, addSkillToLock, getGlobalLockPath, getProjectLockPath, computeFileHashes } from './lockfile.js'

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
      case 'project': {
        baseDir = join(process.cwd(), '.agents', 'skills')
        label = './.agents/skills/'
        break
      }
      default:
        continue
    }

    const slugDir = join(baseDir, normalizeSlug(slug))
    const destSkillPath = join(slugDir, 'SKILL.md')

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
        if (resolved.fileContents?.[file]) {
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
