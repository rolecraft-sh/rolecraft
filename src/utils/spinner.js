import { stdout } from 'node:process'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const INTERVAL = 80

export function createSpinner(text) {
  if (!stdout.isTTY) {
    return {
      start() { console.log(text) },
      succeed(msg) { if (msg) console.log(msg) },
      fail(msg) { if (msg) console.error(msg) },
    }
  }

  let id = null
  let i = 0

  return {
    start() {
      stdout.write(`${FRAMES[0]} ${text}`)
      id = setInterval(() => {
        i = (i + 1) % FRAMES.length
        stdout.write(`\r${FRAMES[i]} ${text}`)
      }, INTERVAL)
      return this
    },
    succeed(msg) {
      if (id) clearInterval(id)
      stdout.write(`\r${msg || '✓'} ${text}\n`)
    },
    fail(msg) {
      if (id) clearInterval(id)
      stdout.write(`\r${msg || '✗'} ${text}\n`)
    },
  }
}
