import { homedir } from 'node:os'
import { join } from 'node:path'

export function home(...parts) {
  return join(homedir(), ...parts)
}

export function expandTilde(path, homeDirectory = homedir()) {
  return path.startsWith('~') ? join(homeDirectory, path.slice(1)) : path
}
