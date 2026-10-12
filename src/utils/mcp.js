import { readFile, mkdir, rm, readdir, stat } from 'node:fs/promises'
import { join, dirname, relative } from 'node:path'
import {
  execSync as defaultExecSync,
  spawnSync as defaultSpawnSync,
} from 'node:child_process'
import agents from '../agents.js'
import { addServerToMcpLock, removeServerFromMcpLock } from './mcp-lock.js'
import { updateLockFile, writeJsonAtomic } from './lock-write.js'
import { parseFrontmatter } from './converter.js'
import { UserError } from './errors.js'
import {
  MAX_SKILL_FILE_BYTES,
  MAX_SKILL_TOTAL_BYTES,
  normalizeSlug,
} from './lockfile.js'
import { assertSafeSlug } from './installer.js'
import { expandTilde, home } from './paths.js'

let _runExec = defaultExecSync
let runSpawnSync = defaultSpawnSync

export function setExecSync(fn) {
  _runExec = fn
}

export function setSpawnSync(fn) {
  runSpawnSync = fn
}

const AGENT_MCP_PATHS = Object.fromEntries(
  agents.filter((a) => a.mcp).map((a) => [a.flag, a.mcp.getPath]),
)

function getMcpConfigPath(agent) {
  const fn = AGENT_MCP_PATHS[agent]
  return fn ? fn() : null
}

export function getSupportedMcpAgents() {
  return Object.keys(AGENT_MCP_PATHS)
}

export async function readMcpConfig(agent) {
  const configPath = getMcpConfigPath(agent)
  if (!configPath) return null
  return { configPath, data: await readMcpConfigAt(configPath) }
}

// Read and validate one MCP config file by path. Split out from
// `readMcpConfig` so the locked update below can re-read under the sentinel
// without re-resolving the agent's config path.
async function readMcpConfigAt(configPath) {
  let raw

  try {
    raw = await readFile(configPath, 'utf-8')
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new UserError(
        `Could not read the MCP config file at ${configPath}: ${error.message}`,
        {
          suggestion:
            'Check the file permissions, or move the file aside to start with a new MCP config.',
          code: 'MCP_CONFIG_UNREADABLE',
        },
      )
    }
    return {}
  }

  let data
  try {
    data = JSON.parse(raw)
  } catch (error) {
    throw new UserError(
      `The MCP config file at ${configPath} is not valid JSON: ${error.message}`,
      {
        suggestion:
          'Fix the JSON, move the file aside, or restore it from a backup before installing MCP servers.',
        code: 'MCP_CONFIG_CORRUPT',
      },
    )
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new UserError(
      `The MCP config file at ${configPath} must contain a JSON object`,
      {
        suggestion:
          'Replace it with a JSON object, move it aside, or restore it from a backup before installing MCP servers.',
        code: 'MCP_CONFIG_INVALID',
      },
    )
  }

  return data
}

function setMcpServerEntry(data, agent, name, serverConfig) {
  if (agent === 'copilot') {
    if (!data.servers) data.servers = {}
    if (!data.inputs) data.inputs = []
    data.servers[name] = {
      command: serverConfig.command,
      args: serverConfig.args,
    }
    return data
  }
  if (agent === 'continue') {
    if (!data.experimental) data.experimental = {}
    if (!data.experimental.mcpServers) data.experimental.mcpServers = []
    const existing = data.experimental.mcpServers.findIndex(
      (s) => s.name === name,
    )
    const entry = {
      name,
      command: serverConfig.command,
      args: serverConfig.args,
    }
    if (serverConfig.env) entry.env = serverConfig.env
    if (existing >= 0) {
      data.experimental.mcpServers[existing] = entry
    } else {
      data.experimental.mcpServers.push(entry)
    }
    return data
  }
  if (!data.mcpServers) data.mcpServers = {}
  data.mcpServers[name] = {
    command: serverConfig.command,
    args: serverConfig.args,
  }
  if (serverConfig.env) {
    data.mcpServers[name].env = serverConfig.env
  }
  return data
}

function removeMcpServerEntry(data, agent, name) {
  if (agent === 'continue') {
    if (data.experimental?.mcpServers) {
      data.experimental.mcpServers = data.experimental.mcpServers.filter(
        (s) => s.name !== name,
      )
    }
    return data
  }
  if (agent === 'copilot') {
    if (data.servers) delete data.servers[name]
    return data
  }
  if (data.mcpServers) delete data.mcpServers[name]
  return data
}

function listMcpServerEntries(data, agent) {
  if (agent === 'continue') {
    return (data.experimental?.mcpServers || []).map((s) => ({
      name: s.name,
      command: s.command,
      args: s.args,
    }))
  }
  if (agent === 'copilot') {
    return Object.entries(data.servers || {}).map(([name, s]) => ({
      name,
      command: s.command,
      args: s.args,
    }))
  }
  return Object.entries(data.mcpServers || {}).map(([name, s]) => ({
    name,
    command: s.command,
    args: s.args,
  }))
}

// MCP config files carry API keys in their `env` blocks, so they are written
// with owner-only permissions rather than the default 0644.
const MCP_CONFIG_MODE = 0o600

async function writeMcpConfig(data, configPath) {
  await writeJsonAtomic(configPath, data, { mode: MCP_CONFIG_MODE })
}

// Read-modify-write an agent's MCP config under an exclusive lock.
//
// The previous read and write were two independent calls, so two concurrent
// `mcp add` processes could each read the same starting state and the second
// write would silently discard the first server. The lock is held across the
// whole cycle, and the write itself is atomic, so a reader never sees a
// half-written config.
async function updateMcpConfig(agent, mutate) {
  const configPath = getMcpConfigPath(agent)
  if (!configPath) return null

  return updateLockFile(configPath, {
    read: readMcpConfigAt,
    write: writeMcpConfig,
    mutate,
  })
}

export async function addMcpServer(agent, name, serverConfig, source = null) {
  const updated = await updateMcpConfig(agent, (data) => {
    setMcpServerEntry(data, agent, name, serverConfig)
    return data
  })
  if (updated === null) return false

  await addServerToMcpLock(name, {
    source: source || reconstructMcpSource(serverConfig, name),
    sourceType: serverConfig.sourceType,
    agents: [agent],
  })

  return true
}

export async function removeMcpServer(agent, name) {
  let removed = false
  const updated = await updateMcpConfig(agent, (data) => {
    const before = JSON.stringify(data)
    removeMcpServerEntry(data, agent, name)
    removed = JSON.stringify(data) !== before
    return data
  })
  if (updated === null) return false
  // No entry changed, so nothing was written and the MCP lock must stay as is.
  if (!removed) return false

  await removeServerFromMcpLock(name, agent)

  return true
}

export async function updateMcpServer(
  agent,
  name,
  serverConfig,
  source = null,
) {
  await removeMcpServer(agent, name)
  return addMcpServer(agent, name, serverConfig, source)
}

export async function listMcpServers(agent) {
  const result = await readMcpConfig(agent)
  if (!result) return []
  return listMcpServerEntries(result.data, agent)
}

export function parseMcpServersFromSkill(content) {
  const { attrs } = parseFrontmatter(content)
  if (!Array.isArray(attrs.mcp_servers)) return []
  return attrs.mcp_servers
    .filter((s) => s && (s.name || s.source))
    .map((s) => ({ name: s.name || '', source: s.source || '' }))
}

const MCP_SOURCE_PATTERNS = [
  { prefix: 'npm:', label: 'npm registry', type: 'npm' },
  { prefix: 'gh:', label: 'GitHub repository', type: 'github' },
  { prefix: 'uvx:', label: 'Python package (uvx)', type: 'uvx' },
  { prefix: 'pipx:', label: 'Python package (pipx)', type: 'pipx' },
  { prefix: 'go:', label: 'Go package', type: 'go' },
  { prefix: 'deno:', label: 'Deno module (JSR)', type: 'deno' },
  { prefix: 'cargo:', label: 'Rust crate', type: 'cargo' },
]

export function classifyMcpSource(source) {
  for (const p of MCP_SOURCE_PATTERNS) {
    if (source.startsWith(p.prefix)) return p
  }
  return { label: 'local path', type: 'local' }
}

export function getMcpServerDir() {
  return home('.agents', 'mcp')
}

/**
 * Where a `gh:` server is cloned to. Deterministic per source, so reinstalling
 * the same source replaces its own clone instead of leaking a new directory.
 */
export function getMcpCloneDir(repo, ref = null) {
  const baseDir = getMcpServerDir()
  const slug = normalizeSlug(ref ? `${repo}@${ref}` : repo)
  const dir = join(baseDir, slug)
  assertSafeSlug(slug, baseDir, dir)
  return dir
}

export async function resolveMcpSource(source) {
  if (source.startsWith('npm:')) {
    let pkg = source.slice(4)
    let version = null
    const atIdx = pkg.lastIndexOf('@')
    if (atIdx > 0) {
      version = pkg.slice(atIdx + 1)
      pkg = pkg.slice(0, atIdx)
    }
    const args = version ? ['-y', `${pkg}@${version}`] : ['-y', pkg]
    return {
      command: 'npx',
      args,
      sourceType: 'npm',
      packageName: pkg,
      packageVersion: version,
    }
  }
  if (source.startsWith('gh:')) {
    let repo = source.slice(3)
    let ref = null
    const atIdx = repo.lastIndexOf('@')
    if (atIdx > 0) {
      ref = repo.slice(atIdx + 1)
      repo = repo.slice(0, atIdx)
    }
    const cloneDir = join(getMcpCloneDir(repo, ref), 'repo')
    try {
      // git clone refuses a non-empty target, so a reinstall of the same
      // source has to clear the previous clone first. Cloning into the
      // rolecraft-owned directory rather than the OS temp dir is what makes
      // the entry survive: the path goes into the agent config, and /tmp is
      // swept on a schedule rolecraft does not control.
      await rm(cloneDir, { recursive: true, force: true })
      await mkdir(dirname(cloneDir), { recursive: true })
      const cloneArgs = [
        'clone',
        '--depth',
        '1',
        `https://github.com/${repo}.git`,
        cloneDir,
      ]
      if (ref) {
        cloneArgs.splice(2, 0, '--branch', ref)
      }
      const result = runSpawnSync('git', cloneArgs, {
        stdio: 'pipe',
        timeout: 30000,
      })
      if (result.status !== 0)
        throw new Error(
          `Failed to clone ${repo}: ${result.stderr?.toString() || result.status}`,
        )
      const pkgJson = JSON.parse(
        await readFile(join(cloneDir, 'package.json'), 'utf-8'),
      )
      const main = pkgJson.main || 'index.js'
      const bin = pkgJson.bin
        ? typeof pkgJson.bin === 'string'
          ? pkgJson.bin
          : Object.values(pkgJson.bin)[0]
        : null
      const command = bin ? join(cloneDir, bin) : join(cloneDir, main)

      // Read files for the security scan, under the same byte budget as a skill
      // directory. The repository is attacker-chosen, so it is scanned on a
      // bounded read rather than loaded whole.
      const fileContents = {}
      let totalBytes = 0
      async function readFilesRecursive(dir, baseDir) {
        const entries = await readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = join(dir, entry.name)
          if (entry.isDirectory()) {
            if (entry.name === '.git' || entry.name === 'node_modules') continue
            await readFilesRecursive(fullPath, baseDir)
          } else if (entry.isFile()) {
            try {
              const { size } = await stat(fullPath)
              if (size > MAX_SKILL_FILE_BYTES) continue
              if (totalBytes + size > MAX_SKILL_TOTAL_BYTES) return
              totalBytes += size
              const relPath = relative(baseDir, fullPath)
              fileContents[relPath] = await readFile(fullPath, 'utf-8')
            } catch {}
          }
        }
      }
      await readFilesRecursive(cloneDir, cloneDir)

      return {
        command: 'node',
        args: [command],
        sourceType: 'github',
        repo,
        ref,
        fileContents,
      }
    } catch (err) {
      await rm(cloneDir, { recursive: true, force: true }).catch(() => {})
      throw err
    }
  }
  if (source.startsWith('uvx:')) {
    const pkg = source.slice(4)
    return {
      command: 'uvx',
      args: [pkg],
      sourceType: 'uvx',
      packageName: pkg,
    }
  }
  if (source.startsWith('pipx:')) {
    const pkg = source.slice(5)
    return {
      command: 'pipx',
      args: ['run', pkg],
      sourceType: 'pipx',
      packageName: pkg,
    }
  }
  if (source.startsWith('go:')) {
    const pkg = source.slice(3)
    return {
      command: 'go',
      args: ['run', pkg],
      sourceType: 'go',
      packageName: pkg,
    }
  }
  if (source.startsWith('deno:')) {
    const pkg = source.slice(5)
    return {
      command: 'deno',
      args: ['run', pkg],
      sourceType: 'deno',
      packageName: pkg,
    }
  }
  if (source.startsWith('cargo:')) {
    const pkg = source.slice(6)
    return {
      command: 'cargo',
      args: ['run', pkg],
      sourceType: 'cargo',
      packageName: pkg,
    }
  }
  if (
    source.startsWith('/') ||
    source.startsWith('.') ||
    source.startsWith('~')
  ) {
    const resolvedPath = expandTilde(source)
    return {
      command: 'node',
      args: [resolvedPath],
      sourceType: 'local',
      path: resolvedPath,
    }
  }
  throw new UserError(`Unknown MCP source format: "${source}"`, {
    suggestion:
      'Use npm:package, gh:owner/repo, uvx:package, pipx:package, go:package, deno:module, cargo:crate, or a local path.',
    code: 'MCP_INVALID_SOURCE',
  })
}

function reconstructMcpSource(serverConfig, name) {
  const {
    sourceType,
    packageName,
    packageVersion,
    repo,
    ref,
    path: mcpPath,
  } = serverConfig
  if (sourceType === 'npm')
    return `npm:${packageName}${packageVersion ? `@${packageVersion}` : ''}`
  if (sourceType === 'github') return `gh:${repo}${ref ? `@${ref}` : ''}`
  if (sourceType === 'uvx') return `uvx:${packageName}`
  if (sourceType === 'pipx') return `pipx:${packageName}`
  if (sourceType === 'go') return `go:${packageName}`
  if (sourceType === 'deno') return `deno:${packageName}`
  if (sourceType === 'cargo') return `cargo:${packageName}`
  if (sourceType === 'local') return mcpPath || name
  return name
}

export async function installMcpServersFromSkill(skillContent, targets) {
  const servers = parseMcpServersFromSkill(skillContent)
  if (servers.length === 0) return []
  const results = []
  for (const server of servers) {
    const resolved = await resolveMcpSource(server.source)
    for (const agent of targets) {
      const success = await addMcpServer(
        agent,
        server.name,
        resolved,
        server.source,
      )
      results.push({ agent, name: server.name, success })
    }
  }
  return results
}
