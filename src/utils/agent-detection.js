import { accessSync, constants } from 'node:fs'
import agents from '../agents.js'

const KNOWN_AGENTS = agents.map((agent) => ({
  flag: agent.flag,
  label: agent.name,
  dir: (cwd) => agent.getDir(cwd),
}))

export function detectAgents(cwd = process.cwd()) {
  const found = []
  for (const agent of KNOWN_AGENTS) {
    const dir = agent.dir(cwd)
    try {
      accessSync(dir, constants.F_OK)
      found.push(agent)
    } catch {
      // agent not installed
    }
  }
  return found
}
