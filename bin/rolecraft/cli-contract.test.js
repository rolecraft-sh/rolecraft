/**
 * Regression tests for #425: the CLI must never report success when it did
 * nothing, and must honour the terminal contract it documents.
 *
 * These are the checks that were missing: every case below reproduces a bug
 * that shipped because the suite only exercised the happy path with mocked
 * console and injected prompts.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BIN = join(__dirname, '..', 'rolecraft.js')

let tempDir

before(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-contract-'))
})

after(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

/**
 * Run the real CLI as a child process. This is the only way to exercise a
 * non-TTY stdin and piped stdout — both of which isTTY-based unit tests with
 * mocked console cannot reproduce.
 */
function run(args, options = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    encoding: 'utf-8',
    cwd: options.cwd || tempDir,
    env: { ...process.env, HOME: tempDir, ...options.env },
    input: options.input ?? '',
  })
}

describe('exit codes', () => {
  it('install without a TTY fails instead of silently installing nothing', () => {
    const cwd = mkdtempSync(join(tempDir, 'noninteractive-'))
    const result = run(['install', join(cwd, 'pkg')], { cwd })

    assert.equal(
      result.status,
      1,
      `must not exit 0 after doing nothing, got: ${result.stdout}${result.stderr}`,
    )
    assert.match(
      result.stderr,
      /needs an interactive terminal/,
      'error must name the problem',
    )
    assert.match(result.stderr, /--project, --global, or --all/)
    assert.equal(
      existsSync(join(cwd, '.agents')),
      false,
      'nothing may be installed',
    )
  })

  it('rejects an unknown mcp subcommand', () => {
    const result = run(['mcp', 'bogus-sub'])
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Unknown mcp subcommand/)
  })

  it('rejects an unknown profile subcommand', () => {
    const result = run(['profile', 'bogus-sub'])
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Unknown profile subcommand/)
  })

  it('rejects an unknown top-level command with exit 2', () => {
    const result = run(['definitely-not-a-command'])
    assert.equal(result.status, 2)
    assert.match(result.stderr, /Unknown command/)
    assert.match(result.stderr, /Known commands:/)
  })

  it('exit 0 on --help', () => {
    assert.equal(run(['--help']).status, 0)
    assert.equal(run(['mcp']).status, 0, 'bare mcp is a help request')
  })
})

describe('usage errors exit 2, failures exit 1 (#410)', () => {
  it('an unknown flag exits 2', () => {
    const result = run(['list', '--bogusflag'])
    assert.equal(result.status, 2)
    assert.match(result.stderr, /unknown flag "--bogusflag"/)
  })

  it('every command validates its flags, except passthrough commands', async () => {
    const { COMMANDS } = await import('../../src/commands/spec.js')
    for (const { name, passthrough } of COMMANDS) {
      if (name === 'help' || name === 'version') continue
      const result = run([name, '--definitely-not-a-flag'])
      if (passthrough) continue
      assert.match(
        result.stderr,
        /unknown flag "--definitely-not-a-flag"/,
        `${name} must reject an unknown flag`,
      )
      assert.equal(result.status, 2, `${name} must exit 2 on a usage error`)
    }
  })

  it('the spec and the root help agree on the command list', async () => {
    const { COMMANDS } = await import('../../src/commands/spec.js')
    const help = run(['--help']).stdout
    for (const { name, desc } of COMMANDS) {
      if (name === 'help') continue
      assert.match(
        help,
        new RegExp(`rolecraft ${name}\\b`),
        `help lists ${name}`,
      )
      assert.ok(desc.length > 0, `${name} has a description`)
    }
  })

  it('every flag in the spec appears in its focused help', async () => {
    const { COMMANDS } = await import('../../src/commands/spec.js')
    for (const { name, flags } of COMMANDS) {
      if (name === 'help' || name === 'version') continue
      const help = run([name, '--help']).stdout
      for (const f of flags) {
        assert.match(
          help,
          new RegExp(`--${f.flag}\\b`),
          `${name} --help lists --${f.flag}`,
        )
      }
    }
  })

  it('every flag the shell completes is a flag the CLI accepts', async () => {
    const { bashScript } = await import('../../src/commands/completions.js')
    const { byName } = await import('../../src/commands/spec.js')
    const { flagNames } = await import('../../src/commands/spec.js')
    // `    install) COMPREPLY=($(compgen -W "--yes --global" -- "$cur")) ;;`
    for (const [, name, words] of bashScript().matchAll(
      /^\s{4}(\S+)\) COMPREPLY=\(\$\(compgen -W "([^"]*)"/gm,
    )) {
      for (const word of words.split(/\s+/).filter(Boolean)) {
        if (word.startsWith('-')) {
          assert.ok(
            flagNames(byName.get(name)).includes(word),
            `bash completes "${word}" for ${name}, which the CLI rejects`,
          )
        } else {
          const spec = byName.get(name)
          const known = [
            ...(spec.subcommands || []).map((s) => s.name),
            ...(spec.aliases || []),
          ]
          assert.ok(
            known.includes(word),
            `bash completes "${word}" for ${name}, which is not a subcommand`,
          )
        }
      }
    }
  })

  it('an alias dispatches to its canonical command', () => {
    const result = run(['check-updates', '--help'])
    assert.equal(result.status, 0)
  })
})

describe('ci --dry-run', () => {
  it('refuses --dry-run instead of installing', () => {
    const before = existsSync(join(tempDir, '.agents'))
    const result = run(['ci', '--dry-run'])
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /unknown flag "--dry-run"/)
    assert.equal(
      existsSync(join(tempDir, '.agents')),
      before,
      'must not write to the filesystem',
    )
  })
})

describe('--flag=value', () => {
  it('rejects the = form with a rewrite hint instead of ignoring it', () => {
    const result = run(['list', '--json=true'])
    assert.notEqual(result.status, 0, 'must not silently succeed')
    assert.match(result.stderr, /use "--json true"/)
  })

  it('accepts the space-separated form', () => {
    const result = run(['list', '--json'])
    assert.equal(result.status, 0)
    assert.doesNotMatch(result.stderr, /unknown flag/)
  })
})

describe('--verbose is global', () => {
  it('is accepted by commands that do not declare it', () => {
    const result = run(['list', '--verbose'])
    assert.equal(result.status, 0, result.stderr)
    assert.doesNotMatch(result.stderr, /unknown flag "--verbose"/)
  })
})

describe('terminal contract', () => {
  it('emits no ANSI when stdout is a pipe', () => {
    const result = run(['--help'])
    assert.doesNotMatch(
      result.stdout,
      /\u001[b]\[/,
      'piped --help must be plain',
    )
  })

  it('emits no ANSI when NO_COLOR is set', () => {
    const result = run(['--help'], { env: { NO_COLOR: '1' } })
    assert.doesNotMatch(result.stdout, /\u001[b]\[/)
  })

  it('emits no ANSI when NO_COLOR is set for list', () => {
    const result = run(['list'], { env: { NO_COLOR: '1' } })
    assert.doesNotMatch(result.stdout, /\u001[b]\[/)
  })

  it('honours FORCE_COLOR on diff, compose and test (was silently ignored)', () => {
    for (const cmd of ['diff', 'compose', 'test']) {
      const result = run([cmd, 'a', 'b'], { env: { FORCE_COLOR: '1' } })
      assert.doesNotMatch(
        result.stderr,
        /unknown flag/,
        `${cmd} must not trip flag validation under FORCE_COLOR`,
      )
    }
  })

  it('honours --no-color', () => {
    const result = run(['list', '--no-color'], { env: { FORCE_COLOR: '1' } })
    assert.doesNotMatch(result.stdout, /\u001[b]\[/)
  })
})
