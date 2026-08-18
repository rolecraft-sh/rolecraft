import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  ICONS,
  renderTable,
  setPromptUser,
  stripAnsi,
  theme,
  truncate,
  hasColor,
  pickItem,
} from './tui.js'

describe('tui utils', () => {
  describe('theme', () => {
    it('does not emit ANSI codes when not a TTY', () => {
      const plain = theme.bold('x') + theme.dim('y') + theme.green('z')
      assert.equal(stripAnsi(plain), 'xyz')
      assert.equal(plain, 'xyz')
    })

    it('hasColor respects NO_COLOR', () => {
      const orig = process.env.NO_COLOR
      process.env.NO_COLOR = '1'
      assert.equal(hasColor(), false)
      if (orig === undefined) delete process.env.NO_COLOR
      else process.env.NO_COLOR = orig
    })
  })

  describe('truncate', () => {
    it('keeps short strings untouched', () => {
      assert.equal(truncate('abc', 5), 'abc')
    })

    it('appends ellipsis to long strings', () => {
      assert.equal(truncate('abcdef', 5), 'abcd…')
    })
  })

  describe('stripAnsi', () => {
    it('removes SGR sequences', () => {
      assert.equal(stripAnsi('\u001b[1mbold\u001b[0m'), 'bold')
    })
  })

  describe('renderTable', () => {
    it('renders capitalized header and aligned rows', () => {
      const lines = renderTable(
        ['slug', 'scope'],
        [
          ['task-decomposer', 'project'],
          ['react-rules', 'global'],
        ],
      )
      assert.equal(lines[0], '  SLUG             SCOPE')
      assert.equal(lines[1], '  task-decomposer  project')
      assert.equal(lines[2], '  react-rules      global')
    })

    it('pads on the width of the longest cell', () => {
      const lines = renderTable(['a'], [['x'], ['long value'], ['mid']])
      assert.equal(lines[0], '  A')
      assert.equal(lines[1], '  x')
      assert.equal(lines[2], '  long value')
      assert.equal(lines[3], '  mid')
    })

    it('truncates middle columns and keeps the last column whole', () => {
      const lines = renderTable(
        ['snake_case_header', 'detail'],
        [['value', 'a very long detail that must stay readable']],
      )
      assert.ok(lines[0].includes('SNAKE_CASE_HEADER'))
      assert.ok(lines[1].endsWith('a very long detail that must stay readable'))
    })

    it('ignores ANSI codes when measuring width', () => {
      const lines = renderTable(['name'], [[`${theme.green('✓')} done`]])
      assert.ok(lines[1].includes('done'))
    })

    it('returns empty array for empty headers', () => {
      assert.deepEqual(renderTable([], []), [])
    })
  })

  describe('pickItem', () => {
    let origIsTTY

    before(() => {
      origIsTTY = process.stdout.isTTY
      process.stdout.isTTY = false
    })

    after(() => {
      process.stdout.isTTY = origIsTTY
      setPromptUser(null)
    })

    it('returns the selected index from the prompt', async () => {
      setPromptUser(() => Promise.resolve('2'))
      const idx = await pickItem(['a', 'b', 'c'], {
        format: (item) => [item],
        question: 'Pick [1-3]: ',
      })
      assert.equal(idx, 1)
    })

    it('returns -1 when aborted with q', async () => {
      setPromptUser(() => Promise.resolve('q'))
      const idx = await pickItem(['a'], {
        format: (item) => [item],
        question: 'Pick [1-1]: ',
      })
      assert.equal(idx, -1)
    })

    it('returns -2 for an out-of-range choice', async () => {
      setPromptUser(() => Promise.resolve('42'))
      const idx = await pickItem(['a'], {
        format: (item) => [item],
        question: 'Pick [1-1]: ',
      })
      assert.equal(idx, -2)
    })
  })

  it('exposes status icons', () => {
    assert.equal(ICONS.ok, '✓')
    assert.equal(ICONS.error, '✗')
    assert.equal(ICONS.update, '⬆')
    assert.equal(ICONS.skip, '⏭')
  })
})
