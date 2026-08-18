import { stdin as input, stdout as output } from 'node:process'

const CSI = '\x1b['
const sgr = (n) => `${CSI}${n}m`
const text = (code, s) => `${code}${s}${sgr(0)}`
const cursorTo = (r, c) => `${CSI}${r};${c}H`
const eraseLine = `${CSI}K`
const hideCursor = `${CSI}?25l`
const showCursor = `${CSI}?25h`
const clearScreen = `${CSI}2J${CSI}H`

export function hasColor() {
  const noColor = process.env.NO_COLOR
  if (noColor !== undefined && noColor !== '') return false
  const forceColor = process.env.FORCE_COLOR
  if (forceColor !== undefined && forceColor !== '0') return true
  return Boolean(output.isTTY)
}

const color = hasColor()

export const theme = {
  bold: (s) => (color ? text(sgr(1), s) : s),
  dim: (s) => (color ? text(sgr(2), s) : s),
  cyan: (s) => (color ? text(sgr(36), s) : s),
  yellow: (s) => (color ? text(sgr(33), s) : s),
  green: (s) => (color ? text(sgr(32), s) : s),
  red: (s) => (color ? text(sgr(31), s) : s),
  magenta: (s) => (color ? text(sgr(35), s) : s),
  reverse: (s) => (color ? text(sgr(7), s) : s),
}

export const ICONS = {
  ok: theme.green('✓'),
  pass: theme.green('✓'),
  update: theme.yellow('⬆'),
  warn: theme.yellow('⚠'),
  skip: theme.dim('⏭'),
  error: theme.red('✗'),
  fail: theme.red('✗'),
}

const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')

export function stripAnsi(s) {
  return String(s).replace(ANSI_PATTERN, '')
}

export function truncate(s, max) {
  const plain = stripAnsi(s)
  if (plain.length <= max) return s
  if (max <= 1) return '…'
  return `${plain.slice(0, max - 1)}…`
}

/**
 * Render aligned column tables: a dimmed uppercase header row followed by
 * data rows. Column widths are computed from content and the terminal width;
 * overflowing cells are truncated with an ellipsis. Returns plain lines —
 * ANSI codes inside cells are ignored for sizing but preserved when printed.
 */
export function renderTable(headers, rows, options = {}) {
  const { indent = 2, gap = 2 } = options
  const n = headers.length
  if (n === 0) return []

  const widthOf = (s) => stripAnsi(s).length
  const normalized = rows.map((r) => {
    const cells = Array.isArray(r) ? r : []
    return [...cells, ...Array(Math.max(0, n - cells.length)).fill('')]
  })

  const naturals = headers.map((h, i) =>
    Math.max(widthOf(h), ...normalized.map((r) => widthOf(r[i]))),
  )
  const termWidth = Math.max(20, (output.columns || 80) - 2)
  const available = Math.max(10, termWidth - indent - gap * (n - 1))
  const widths = [...naturals]
  while (
    widths.reduce((a, b) => a + b, 0) > available &&
    widths.some((w) => w > 6)
  ) {
    const widest = widths.indexOf(Math.max(...widths))
    widths[widest] -= 1
  }
  widths[n - 1] += Math.max(0, available - widths.reduce((a, b) => a + b, 0))

  const pad = (cell, w) =>
    `${cell}${' '.repeat(Math.max(0, w - widthOf(cell)))}`
  const rowLine = (cells) =>
    ' '.repeat(indent) +
    cells
      .map((c, i) => {
        const cell = i < n - 1 ? truncate(c, widths[i]) : c
        return pad(cell, widths[i])
      })
      .join(' '.repeat(gap))
      .trimEnd()

  const lines = [theme.dim(rowLine(headers.map((h) => h.toUpperCase())))]
  for (const row of normalized) lines.push(rowLine(row))
  return lines
}

let promptUser = null

export function setPromptUser(fn) {
  promptUser = fn || null
}

async function defaultPrompt(question) {
  const { createInterface } = await import('node:readline')
  const rl = createInterface({ input, output })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

/**
 * Let the user pick one item from a list. Uses a full-screen arrow-key
 * picker on TTYs; falls back to a numbered prompt otherwise (or when a
 * prompt stub is injected via setPromptUser). Resolves with the item
 * index, -1 when aborted, or -2 on an invalid numbered choice.
 */
export async function pickItem(items, options = {}) {
  const { format, question, linesPerItem, footer } = options
  if (output.isTTY && items.length > 0) {
    return runPicker(items, { format, linesPerItem, footer })
  }
  return numberedPrompt(items, { format, question })
}

function numberedPrompt(items, { format, question }) {
  console.log()
  for (let i = 0; i < items.length; i++) {
    const lines = format(items[i], false)
    console.log(
      `  ${theme.bold(theme.cyan(String(i + 1).padStart(2, ' ')))} ${lines[0]}`,
    )
    for (const line of lines.slice(1)) console.log(`     ${line}`)
    console.log()
  }
  return (promptUser || defaultPrompt)(question).then((answer) => {
    const trimmed = (answer || '').trim().toLowerCase()
    if (trimmed === 'q') return -1
    const index = parseInt(trimmed, 10)
    if (Number.isNaN(index) || index < 1 || index > items.length) {
      console.log(
        `Invalid choice. Enter a number between 1 and ${items.length}.`,
      )
      return -2
    }
    return index - 1
  })
}

function runPicker(items, { format, linesPerItem, footer }) {
  const wasRaw = input.isRaw
  input.setRawMode(true)
  input.resume()

  let selectedIndex = 0
  let scrollOffset = 0
  let firstRender = true
  let termRows = output.rows || 24
  const reservedRows = 2
  let availRows = termRows - reservedRows
  let visibleCount = Math.min(
    Math.max(1, Math.floor(availRows / linesPerItem)),
    items.length,
  )
  let statusRow = termRows
  const firstLine = 2

  function updateLayout() {
    termRows = output.rows || 24
    availRows = termRows - reservedRows
    visibleCount = Math.min(
      Math.max(1, Math.floor(availRows / linesPerItem)),
      items.length,
    )
    statusRow = termRows
    if (scrollOffset + visibleCount > items.length)
      scrollOffset = Math.max(0, items.length - visibleCount)
    if (selectedIndex >= items.length) selectedIndex = items.length - 1
  }

  function render() {
    let out = firstRender ? clearScreen + hideCursor : hideCursor
    firstRender = false
    out += cursorTo(firstLine, 1)
    const end = Math.min(scrollOffset + visibleCount, items.length)
    const usedLines = (end - scrollOffset) * linesPerItem
    for (let i = scrollOffset; i < end; i++) {
      const card = format(items[i], i === selectedIndex)
      out += cursorTo(firstLine + (i - scrollOffset) * linesPerItem, 1)
      for (let l = 0; l < linesPerItem; l++)
        out += `${eraseLine}${card[l] || ''}\n`
    }
    for (let i = usedLines + firstLine; i < statusRow; i++)
      out += `${cursorTo(i, 1) + eraseLine}\n`
    out += cursorTo(statusRow, 1) + eraseLine + theme.reverse(`  ${footer}  `)
    output.write(out)
  }

  function ensureVisible(index) {
    if (index < scrollOffset) {
      scrollOffset = index
      return true
    }
    if (index >= scrollOffset + visibleCount) {
      scrollOffset = index - visibleCount + 1
      return true
    }
    return false
  }

  render()

  return new Promise((resolve) => {
    function onData(buf) {
      const key = buf.toString()

      if (key === '\u001b[A') {
        if (selectedIndex > 0) {
          selectedIndex--
          ensureVisible(selectedIndex)
          render()
        }
      } else if (key === '\u001b[B') {
        if (selectedIndex < items.length - 1) {
          selectedIndex++
          ensureVisible(selectedIndex)
          render()
        }
      } else if (key === '\r' || key === '\n') {
        cleanup()
        resolve(selectedIndex)
      } else if (key === '\u0003' || key === 'q' || key === 'Q') {
        cleanup()
        resolve(-1)
      }
    }

    function onResize() {
      updateLayout()
      render()
    }

    function cleanup() {
      input.removeListener('data', onData)
      output.removeListener('resize', onResize)
      input.pause()
      input.setRawMode(wasRaw)
      output.write(clearScreen + showCursor)
    }

    input.on('data', onData)
    output.on('resize', onResize)
  })
}
