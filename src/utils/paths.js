import { homedir } from 'node:os'
import { join } from 'node:path'

export function home(...parts) {
  return join(homedir(), ...parts)
}
