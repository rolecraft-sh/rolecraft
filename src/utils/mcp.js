import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { execSync as defaultExecSync, spawnSync as defaultSpawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { mkdtempSync, readFileSync } from 'node:fs'

let runExec = defaultExecSync
let runSpawnSync = defaultSpawnSync

export function setExecSync(fn) {
  runExec = fn
}

export function setSpawnSync(fn) {
  runSpawnSync = fn
}

function home(...parts) {
  return join(process.env.HOME || process.env.HOMEPATH || '/tmp', ...parts)
}

const AGENT_MCP_PATHS = {
  agents:           () => home('.agents', 'mcp.json'),
  claude:           () => home('.claude', 'claude_code.json'),
  cursor:           () => home('.cursor', 'mcp.json'),
  windsurf:         () => home('.windsurf', 'mcp_config.json'),
  copilot:          () => join(process.cwd(), '.github', 'copilot', '.mcp.json'),
  continue:         () => home('.continue', 'config.json'),
  devin:            () => home('.devin', 'mcp.json'),
  codex:            () => home('.codex', 'mcp.json'),
  aider:            () => home('.aider', 'mcp.json'),
  cline:            () => home('.cline', 'mcp.json'),
  gemini:           () => home('.gemini', 'mcp.json'),
  cody:             () => home('.cody', 'mcp.json'),
  warp:             () => home('.warp', 'mcp.json'),
  fabric:           () => home('.fabric', 'mcp.json'),
  goose:            () => home('.goose', 'mcp.json'),
  openhands:        () => home('.openhands', 'mcp.json'),
  junie:            () => home('.junie', 'mcp.json'),
  openclaw:         () => home('.openclaw', 'mcp.json'),
  tabnine:          () => home('.tabnine', 'mcp.json'),
  supermaven:       () => home('.supermaven', 'mcp.json'),
  'pr-pilot':       () => home('.pr-pilot', 'mcp.json'),
  loom:             () => home('.loom', 'mcp.json'),
  roo:              () => home('.roo', 'mcp.json'),
  trae:             () => home('.trae', 'mcp.json'),
  hermes:           () => home('.hermes', 'mcp.json'),
  kiro:             () => home('.kiro', 'mcp.json'),
  augment:          () => home('.augment', 'mcp.json'),
  kilo:             () => home('.kilo', 'mcp.json'),
  factory:          () => home('.factory', 'mcp.json'),
  'command-code':   () => home('.commandcode', 'mcp.json'),
  cortex:           () => home('.snowflake', 'cortex', 'mcp.json'),
  'mistral-vibe':   () => home('.vibe', 'mcp.json'),
  'qwen-code':      () => home('.qwen', 'mcp.json'),
  codebuddy:        () => home('.codebuddy', 'mcp.json'),
  mux:              () => home('.mux', 'mcp.json'),
  pi:               () => home('.pi', 'agent', 'mcp.json'),
  'autohand-code':  () => home('.autohand', 'mcp.json'),
  rovo:             () => home('.rovodev', 'mcp.json'),
  firebender:       () => home('.firebender', 'mcp.json'),
  bob:              () => home('.bob', 'mcp.json'),
  'aider-desk':     () => home('.aider-desk', 'mcp.json'),
}

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

export async function addMcpServer(agent, name, serverConfig) {
  const result = await readMcpConfig(agent)
  if (!result) return false
  const { configPath, data } = result
  setMcpServerEntry(data, agent, name, serverConfig)
  await mkdir(dirname(configPath), { recursive: true })
  await writeFile(configPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
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
  return true
}

export async function updateMcpServer(agent, name, serverConfig) {
  await removeMcpServer(agent, name)
  return addMcpServer(agent, name, serverConfig)
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

export function resolveMcpSource(source) {
  if (source.startsWith('npm:')) {
    const pkg = source.slice(4)
    return {
      command: 'npx',
      args: ['-y', pkg],
      sourceType: 'npm',
      packageName: pkg,
    }
  }
  if (source.startsWith('gh:')) {
    const repo = source.slice(3)
    const tmpDir = mkdtempSync(join(tmpdir(), 'rolecraft-mcp-'))
    const cloneDir = join(tmpDir, 'repo')
    try {
      const result = runSpawnSync('git', ['clone', '--depth', '1', `https://github.com/${repo}.git`, cloneDir], { stdio: 'pipe', timeout: 30000 })
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
      }
    } catch (err) {
      try { runSpawnSync('rm', ['-rf', tmpDir], { stdio: 'pipe' }) } catch {}
      throw err
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
  throw new Error(`Unknown MCP source format: ${source}. Use npm:package, gh:owner/repo, or a local path.`)
}

export async function installMcpServersFromSkill(skillContent, targets) {
  const servers = parseMcpServersFromSkill(skillContent)
  if (servers.length === 0) return []
  const results = []
  for (const server of servers) {
    const resolved = resolveMcpSource(server.source)
    for (const agent of targets) {
      const success = await addMcpServer(agent, server.name, resolved)
      results.push({ agent, name: server.name, success })
    }
  }
  return results
}
