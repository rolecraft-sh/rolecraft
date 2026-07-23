import { stdout } from 'node:process'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const INTERVAL = 80
const BAR_FRAMES = [
  '▰▱▱▱▱▱▱▱▱▱',
  '▰▰▱▱▱▱▱▱▱▱',
  '▰▰▰▱▱▱▱▱▱▱',
  '▰▰▰▰▱▱▱▱▱▱',
  '▰▰▰▰▰▱▱▱▱▱',
  '▰▰▰▰▰▰▱▱▱▱',
  '▰▰▰▰▰▰▰▱▱▱',
  '▰▰▰▰▰▰▰▰▱▱',
  '▰▰▰▰▰▰▰▰▰▱',
  '▰▰▰▰▰▰▰▰▰▰',
]

export function createSpinner(text) {
  if (!stdout.isTTY) {
    return {
      start() {
        console.log(text)
      },
      succeed(msg) {
        if (msg) console.log(msg)
      },
      fail(msg) {
        if (msg) console.error(msg)
      },
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

export function createProgressBar(text) {
  if (!stdout.isTTY) {
    return {
      start() {
        console.log(text)
      },
      update() {},
      succeed(msg) {
        if (msg) console.log(msg)
      },
      fail(msg) {
        if (msg) console.error(msg)
      },
    }
  }

  const cols = stdout.columns || 80
  const barWidth = Math.max(10, Math.min(cols - text.length - 12, 40))
  let id = null
  let step = 0

  function render(progress) {
    const filled = Math.round((progress / 100) * barWidth)
    const empty = barWidth - filled
    const bar = '█'.repeat(filled) + '░'.repeat(empty)
    const pct = String(Math.round(progress)).padStart(3, ' ')
    stdout.write(`\r${bar} ${pct}% ${text}  `)
  }

  return {
    start() {
      step = 0
      id = setInterval(() => {
        step = (step + 1) % BAR_FRAMES.length
        stdout.write(`\r${BAR_FRAMES[step]} ${text}  `)
      }, INTERVAL)
      return this
    },
    update(progress) {
      if (id) clearInterval(id)
      id = null
      render(progress)
    },
    succeed(msg) {
      if (id) clearInterval(id)
      render(100)
      stdout.write(` ${msg || '✓'}\n`)
    },
    fail(msg) {
      if (id) clearInterval(id)
      stdout.write(`\r${msg || '✗'} ${text}\n`)
    },
  }
}
