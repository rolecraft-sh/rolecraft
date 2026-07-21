import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { execSync as defaultExecSync, spawnSync as defaultSpawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { mkdtempSync, readFileSync } from 'node:fs'
import agents from '../agents.js'
import { addServerToMcpLock, removeServerFromMcpLock } from './mcp-lock.js'

let runExec = defaultExecSync
let runSpawnSync = defaultSpawnSync

export function setExecSync(fn) {
  runExec = fn
}

export function setSpawnSync(fn) {
  runSpawnSync = fn
}

const AGENT_MCP_PATHS = Object.fromEntries(
  agents
    .filter(a => a.mcp)
    .map(a => [a.flag, a.mcp.getPath])
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
  try {
    const raw = await readFile(configPath, 'utf-8')
    return { configPath, data: JSON.parse(raw) }
  } catch {
    return { configPath, data: {} }
  }
}

function setMcpServerEntry(data, agent, name, serverConfig) {
  if (agent === 'copilot') {
    if (!data.servers) data.servers = {}
    if (!data.inputs) data.inputs = []
    data.servers[name] = { command: serverConfig.command, args: serverConfig.args }
    return data
  }
  if (agent === 'continue') {
    if (!data.experimental) data.experimental = {}
    if (!data.experimental.mcpServers) data.experimental.mcpServers = []
    const existing = data.experimental.mcpServers.findIndex(s => s.name === name)
    const entry = { name, command: serverConfig.command, args: serverConfig.args }
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
      data.experimental.mcpServers = data.experimental.mcpServers.filter(s => s.name !== name)
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
    return (data.experimental?.mcpServers || []).map(s => ({
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

export async function addMcpServer(agent, name, serverConfig, source = null) {
  const result = await readMcpConfig(agent)
  if (!result) return false
  const { configPath, data } = result
  setMcpServerEntry(data, agent, name, serverConfig)
  await mkdir(dirname(configPath), { recursive: true })
  await writeFile(configPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')

  await addServerToMcpLock(name, {
    source: source || reconstructMcpSource(serverConfig, name),
    sourceType: serverConfig.sourceType,
    agents: [agent],
  })

  return true
}

export async function removeMcpServer(agent, name) {
  const result = await readMcpConfig(agent)
  if (!result) return false
  const { configPath, data } = result
  const before = JSON.stringify(data)
  removeMcpServerEntry(data, agent, name)
  const after = JSON.stringify(data)
  if (before === after) return false
  await mkdir(dirname(configPath), { recursive: true })
  await writeFile(configPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')

  await removeServerFromMcpLock(name, agent)

  return true
}

export async function updateMcpServer(agent, name, serverConfig, source = null) {
  await removeMcpServer(agent, name)
  return addMcpServer(agent, name, serverConfig, source)
}

export async function listMcpServers(agent) {
  const result = await readMcpConfig(agent)
  if (!result) return []
  return listMcpServerEntries(result.data, agent)
}

export function parseMcpServersFromSkill(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) return []
  const yaml = frontmatterMatch[1]

  const mcpLine = yaml.split('\n').findIndex(l => l.trim() === 'mcp_servers:')
  if (mcpLine === -1) return []

  const yamlLines = yaml.split('\n')
  const blockLines = []
  for (let i = mcpLine + 1; i < yamlLines.length; i++) {
    const line = yamlLines[i]
    if (line.trim() === '' || (line.length > 0 && !line.startsWith(' '))) break
    blockLines.push(line.trim())
  }

  const servers = []
  let current = null
  for (const line of blockLines) {
    const nameMatch = line.match(/^-\s+name:\s*["']?(.+?)["']?\s*$/)
    const sourceMatch = line.match(/^source:\s*["']?(.+?)["']?\s*$/)
    if (nameMatch) {
      if (current) servers.push(current)
      current = { name: nameMatch[1] }
    } else if (sourceMatch && current) {
      current.source = sourceMatch[1]
    }
  }
  if (current) servers.push(current)
  return servers
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

export function resolveMcpSource(source) {
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
    const tmpDir = mkdtempSync(join(tmpdir(), 'rolecraft-mcp-'))
    const cloneDir = join(tmpDir, 'repo')
    try {
      const cloneArgs = ['clone', '--depth', '1', `https://github.com/${repo}.git`, cloneDir]
      if (ref) {
        cloneArgs.splice(2, 0, '--branch', ref)
      }
      const result = runSpawnSync('git', cloneArgs, { stdio: 'pipe', timeout: 30000 })
      if (result.status !== 0) throw new Error(`Failed to clone ${repo}: ${result.stderr?.toString() || result.status}`)
      const pkgJson = JSON.parse(readFileSync(join(cloneDir, 'package.json'), 'utf-8'))
      const main = pkgJson.main || 'index.js'
      const bin = pkgJson.bin ? (typeof pkgJson.bin === 'string' ? pkgJson.bin : Object.values(pkgJson.bin)[0]) : null
      const command = bin ? join(cloneDir, bin) : join(cloneDir, main)
      const args = []
      try { runSpawnSync('rm', ['-rf', tmpDir], { stdio: 'pipe' }) } catch {}
      return {
        command: 'node',
        args: [command, ...args],
        sourceType: 'github',
        repo,
        ref,
      }
    } catch (err) {
      try { runSpawnSync('rm', ['-rf', tmpDir], { stdio: 'pipe' }) } catch {}
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
  if (source.startsWith('/') || source.startsWith('.') || source.startsWith('~')) {
    const resolvedPath = source.startsWith('~') ? join(homedir(), source.slice(1)) : source
    return {
      command: 'node',
      args: [resolvedPath],
      sourceType: 'local',
      path: resolvedPath,
    }
  }
  throw new Error(`Unknown MCP source format: ${source}. Use npm:package, gh:owner/repo, uvx:package, pipx:package, go:package, deno:module, cargo:crate, or a local path.`)
}

function reconstructMcpSource(serverConfig, name) {
  const { sourceType, packageName, packageVersion, repo, ref, path: mcpPath } = serverConfig
  if (sourceType === 'npm') return `npm:${packageName}${packageVersion ? `@${packageVersion}` : ''}`
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
    const resolved = resolveMcpSource(server.source)
    for (const agent of targets) {
      const success = await addMcpServer(agent, server.name, resolved, server.source)
      results.push({ agent, name: server.name, success })
    }
  }
  return results
}
