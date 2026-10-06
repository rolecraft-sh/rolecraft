import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  COMMANDS,
  aliases,
  byName,
  flagNames,
  renderCommonFlags,
} from './spec.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REFERENCE_MD = join(__dirname, '..', '..', 'docs', 'reference.md')

describe('command spec', () => {
  it('every command has a description and an args placeholder', () => {
    for (const c of COMMANDS) {
      assert.ok(c.desc?.length > 0, `${c.name} has a description`)
      assert.equal(typeof c.args, 'string', `${c.name} declares args`)
      assert.ok(Array.isArray(c.flags), `${c.name} declares flags`)
    }
  })

  it('every subcommand has a description', () => {
    for (const c of COMMANDS) {
      for (const s of c.subcommands || []) {
        assert.ok(s.name, `${c.name} subcommand has a name`)
        assert.ok(s.desc?.length > 0, `${c.name} ${s.name} has a description`)
      }
    }
  })

  it('every flag has a description', () => {
    for (const c of COMMANDS) {
      for (const f of c.flags) {
        assert.ok(f.flag?.length > 0, `${c.name} flag has a name`)
        assert.ok(f.desc?.length > 0, `--${f.flag} has a description`)
      }
    }
  })

  it('aliases point at real commands', () => {
    for (const [alias, canonical] of aliases) {
      assert.ok(byName.has(canonical), `${alias} -> ${canonical} exists`)
      assert.ok(!byName.has(alias), `${alias} is not also a command name`)
    }
  })

  it('global flags are accepted everywhere', () => {
    for (const c of COMMANDS) {
      const names = flagNames(c)
      assert.ok(names.includes('--verbose'), `${c.name} accepts --verbose`)
      assert.ok(names.includes('--help'), `${c.name} accepts --help`)
      assert.ok(names.includes('-h'), `${c.name} accepts -h`)
    }
  })

  it('docs/reference.md lists exactly the flags the spec defines', () => {
    const md = readFileSync(REFERENCE_MD, 'utf-8')
    assert.ok(
      md.includes(renderCommonFlags()),
      'the common-flags table is stale — regenerate it from spec.js',
    )
  })
})
