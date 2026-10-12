import {
  MAX_SKILL_FILE_BYTES,
  MAX_SKILL_TOTAL_BYTES,
  wasTruncated,
} from './lockfile.js'

const WEIGHTS = { critical: 20, high: 10, medium: 3, low: 1 }

// Download-and-execute: a curl/wget download piped (or `;`-chained) into a
// shell or Python. Shared by the skill and MCP rules so the two copies cannot
// drift apart.
// - Flags may come before or after the URL, alone (`-fsSL`, `-qO-`, `-O -`),
//   with a value (`-o /tmp/i.sh`, `--retry 3`) or with a quoted value
//   (`--proto '=https'`). Flags are separated by spaces, tabs or a `\` line
//   continuation, so a flag-looking word on a later line does not count.
// - The interpreter may be run by absolute path (`/bin/sh`) or through
//   `sudo [flags]`, and must be a whole word, so `| shasum` or `; shows ...`
//   do not match.
// - Python given its program as an argument (`python3 -c '...'`,
//   `python3 -m json.tool`) only reads the download as data, the usual way
//   skills pretty-print an API response, so it does not count, unless that
//   program can run code (`exec`, `eval`, `subprocess`, `-m code`, ...).
//   `python3 -` and every shell form still count.
const SEP = String.raw`(?:[ \t]|\\\r?\n)+`
const QUOTED = String.raw`'[^'\n]{0,200}'|"[^"\n]{0,200}"`
const FLAG = String.raw`-(?:[^\s'"|;&]|${QUOTED})*`
const VALUE = String.raw`(?:${QUOTED}|[^\s'"|;&-][^\s'"|;&]*)`
const FLAGS = `(?:${SEP}${FLAG}(?:${SEP}${VALUE})?)*?`
// - Python reading the download as data is not execution, but only for a
//   module that provably only formats it. Anything else given to `python3` —
//   a `-c` program, `-m code`, or any other module — can run what it reads, so
//   it counts. This is an allow-list on purpose: the previous version tried to
//   recognise an execution by name (exec, eval, os.system, …), and a name list
//   is not a closed set — `os.execv`, `os.popen`, `ctypes`, `pexpect` and
//   others ran the download while reading as data-only.
const PYTHON_DATA_ONLY = String.raw`[ \t]+(?:-[A-Za-z]+[ \t]+)*-m[ \t]+json\.tool\b`
const PYTHON = String.raw`python[23]?\b(?!${PYTHON_DATA_ONLY})`
// The interpreter that receives the download. This was a short list and the
// same primitive reached every runtime not named in it — `| node`, `| perl`,
// `| ruby` all execute what they are piped. The list is now closed in the
// other direction: anything here counts, and `SAFE_SINK` below carves out the
// readers that only ever pass bytes along.
const INTERPRETER = String.raw`(?:(?:bash|sh|zsh|node|perl|ruby|php|deno|bun)\b|${PYTHON})`
const DOWNLOAD = String.raw`(?:curl|wget)${FLAGS}(?:\s|\\\r?\n)+['"]?https?:\/\/[^\s'")]+['"]?${FLAGS}`
const DOWNLOAD_AND_EXECUTE = new RegExp(
  String.raw`${DOWNLOAD}\s*[|;]\s*` +
    String.raw`(?:sudo(?:[ \t]+-\S*)*[ \t]+)?(?:(?:\/[^\s/]+)*\/)?` +
    String.raw`(?:(?:bash|sh|zsh)\b|${PYTHON})`,
)

// A second download-and-execute shape, matched by decoding rather than by
// fetching: `base64 -d | sh` is the same primitive as `curl | sh` with a
// different front half. The old rules only understood a download, so this one
// passed untouched at 100/100.
const DECODE_AND_EXECUTE = new RegExp(
  String.raw`(?:base64|xxd)\b[^\n|;]{0,40}(?:-d|--decode)\s*[|;]\s*${INTERPRETER}`,
)

// Download-and-execute with no pipe: the download reaches the interpreter by
// substitution instead. `bash <(curl <url>)` hands it a filename and
// `bash -c "$(curl <url>)"` (the Homebrew form) hands it the command string;
// `eval`, `source` and a leading `.` take the same mechanism. This is a
// separate pattern rather than more of the pipe one because there is no
// separator to anchor on — the interpreter is what decides whether the
// download runs, so it is what this pattern keys off. A bare `$(curl <url>)`
// assigned or echoed reads the download as data and runs nothing, so it does
// not match: no interpreter, no execution.
const SUBSTITUTION = String.raw`(?:<\(|['"]\$\()`
const RUNNER = String.raw`(?:sudo(?:[ \t]+-\S*)*[ \t]+)?(?:(?:\/[^\s/]+)*\/)?${INTERPRETER}`
const DOWNLOAD_AND_EXECUTE_SUBSTITUTION = new RegExp(
  String.raw`(?:${RUNNER}(?:${SEP}-[^\s'"()]+)*${SEP}${SUBSTITUTION}` +
    String.raw`|eval[ \t]+${SUBSTITUTION}` +
    String.raw`|source[ \t]+${SUBSTITUTION}` +
    String.raw`|(?:^|[\s;&|])\.[ \t]+${SUBSTITUTION})[ \t]*${DOWNLOAD}`,
)

const MCP_NETWORK_PATTERNS = [
  {
    severity: 'medium',
    category: 'network_request',
    pattern: /https?:\/\//,
    description: 'MCP server makes network requests',
  },
  {
    severity: 'medium',
    category: 'file_access',
    pattern: /readFileSync|readFile|writeFileSync|writeFile|appendFile/,
    description: 'MCP server accesses local filesystem',
  },
  {
    severity: 'medium',
    category: 'shell_exec',
    pattern: /execSync|spawnSync|exec\s*\(|spawn\s*\(/,
    description: 'MCP server executes shell commands',
  },
  {
    severity: 'medium',
    category: 'env_access',
    pattern: /process\.env/,
    description: 'MCP server reads environment variables',
  },
  {
    severity: 'high',
    category: 'credential_access',
    pattern:
      /process\.env\.(?:TOKEN|SECRET|PASSWORD|API_KEY|ACCESS_KEY|AUTH|CREDENTIAL)/i,
    description: 'MCP server accesses credential environment variables',
  },
  {
    severity: 'high',
    category: 'data_exfiltration',
    pattern: /https?:\/\/(?:webhook|hook|requestbin|ngrok)\.[^\s]+/,
    description: 'Potential data exfiltration endpoint in MCP server',
  },
  {
    severity: 'critical',
    category: 'command_injection',
    pattern: DOWNLOAD_AND_EXECUTE,
    description: 'MCP server downloads and executes remote code',
  },
  {
    severity: 'critical',
    category: 'command_injection',
    pattern: DOWNLOAD_AND_EXECUTE_SUBSTITUTION,
    description:
      'MCP server downloads and executes remote code via substitution',
  },
]

const PATTERNS = [
  // Instruction override. The qualifier list is closed, but the filler between
  // the verb and the noun is bounded rather than enumerated, so "ignore all
  // previous instructions" matches — the original allowed exactly one word
  // there and missed every phrasing with two.
  {
    severity: 'critical',
    category: 'prompt_injection',
    pattern:
      /(?:ignore|disregard|forget|discard|override)\s+(?:[\w-]+\s+){0,3}?(?:instructions?|directives?|guidance|guidelines?|rules?|context|prompts?|messages?|everything|above|earlier|preceding|prior|previous)/i,
    description: 'Prompt injection: attempts to override instructions',
  },
  // Concealment: the payload tells the agent not to surface what it did.
  {
    severity: 'critical',
    category: 'prompt_injection',
    pattern:
      /(?:do\s+not|don'?t|never)\s+(?:tell|inform|mention|reveal|disclose|notify|report)\b[^.]{0,40}?\b(?:the\s+user|user)/i,
    description: 'Prompt injection: instructs the agent to hide an action',
  },
  {
    severity: 'critical',
    category: 'prompt_injection',
    pattern: /without\s+(?:telling|informing|notifying|mentioning|alerting)\b/i,
    description: 'Prompt injection: acts without informing the user',
  },
  // Task or identity replacement.
  //
  // ponytail: bare "from now on" is not matched — it is ordinary instructional
  // prose ("From now on, prefer named exports") and flagged it would push real
  // skills over the danger threshold. Ceiling: an injection phrased only as
  // "from now on you have no restrictions" passes. Upgrade path: match it only
  // alongside a compliance phrase, e.g. require `from now on` within N words of
  // `you (are|will|must)`, once a false-positive corpus exists to tune against.
  {
    severity: 'critical',
    category: 'prompt_injection',
    pattern:
      /your\s+new\s+(?:[\w-]+\s+){0,2}?(?:task|role|goal|objective|mission|identity|purpose|directive)/i,
    description: 'Prompt injection: replaces the assigned task',
  },
  {
    severity: 'critical',
    category: 'prompt_injection',
    pattern:
      /you\s+are\s+(now\s+)?an?\s*(free|unrestricted|unlimited|unbounded|unconstrained|unfiltered)/i,
    description: 'Prompt injection: role override attempt',
  },
  {
    severity: 'critical',
    category: 'obfuscated_code',
    pattern: /(?:atob|btoa)\(\s*['"][A-Za-z0-9+/=]{80,}['"]\s*\)/,
    description: 'Obfuscated code: base64-encoded blob',
  },
  {
    severity: 'critical',
    category: 'obfuscated_code',
    pattern: /eval\s*\(\s*['"`]/,
    description: 'Obfuscated code: eval() with inline string',
  },
  {
    severity: 'critical',
    category: 'obfuscated_code',
    pattern: /Function\s*\(\s*['"`]/,
    description: 'Obfuscated code: Function constructor with string argument',
  },
  {
    severity: 'critical',
    category: 'command_injection',
    pattern: DOWNLOAD_AND_EXECUTE,
    description: 'Command injection: download-and-execute pattern',
  },
  {
    severity: 'critical',
    category: 'command_injection',
    pattern: DOWNLOAD_AND_EXECUTE_SUBSTITUTION,
    description: 'Command injection: download-and-execute via substitution',
  },
  {
    severity: 'critical',
    category: 'command_injection',
    pattern: DECODE_AND_EXECUTE,
    description: 'Command injection: decodes and executes an inline payload',
  },
  {
    severity: 'critical',
    category: 'data_exfiltration',
    pattern:
      /https?:\/\/[^\s'"]*[?&][^\s'"]*(?:k|key|token|secret|password|auth|api_?key)=["']?\$?\{?(?:[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)|\d+)/i,
    description: 'Secret or credential value passed to a remote host in a URL',
  },

  {
    severity: 'high',
    category: 'sensitive_file_access',
    // `~/.ssh/config` and `~/.config` are excluded: the first lists host
    // aliases, the second is a directory name that precedes anything. They
    // are the two paths a skill legitimately needs and a secret never lives in.
    // The guard is `\b` rather than `$`: the path is usually followed by more
    // prose, so anchoring to end-of-string let `~/.ssh/config to find ...`
    // through.
    pattern:
      /~\/\.(?:ssh\/(?!config\b)|aws|gpg|gnupg|docker|kube|config\/(?!$)|npm|vscode|netrc)/,
    description: 'Access to sensitive user files',
  },
  {
    severity: 'high',
    category: 'sensitive_file_access',
    pattern: /\/etc\/(?:passwd|shadow|sudoers|ssh|ssl)/,
    description: 'Access to system sensitive files',
  },
  {
    severity: 'high',
    category: 'data_exfiltration',
    pattern:
      /https?:\/\/(?:webhook|hook|requestbin|pipedream|mockbin|insomnia|ngrok|interactsh)\./,
    description: 'Potential data exfiltration endpoint',
  },
  {
    severity: 'high',
    category: 'credential_harvesting',
    pattern:
      /process\.env\.(?:TOKEN|SECRET|PASSWORD|API_KEY|ACCESS_KEY|AUTH|CREDENTIAL)/i,
    description: 'Harvesting specific environment credentials',
  },
  {
    severity: 'high',
    category: 'credential_harvesting',
    pattern: /readFileSync\s*\(\s*['"`]~\/\./,
    description: 'Reading user secrets from home directory',
  },

  {
    severity: 'medium',
    category: 'shell_command',
    pattern: /(?:execSync|spawnSync|exec\s*\()/,
    description: 'Shell command execution',
  },
  {
    severity: 'medium',
    category: 'shell_command',
    pattern: /child_process/,
    description: 'Child process module usage',
  },
  {
    severity: 'medium',
    category: 'environment_access',
    pattern: /process\.env(?:[^a-zA-Z_]|$)/,
    description: 'Environment variable access',
  },
  {
    severity: 'medium',
    category: 'network_request',
    pattern: /(?:https?\.get|https?\.request|fetch\s*\()/,
    description: 'Outbound network request',
  },
  {
    severity: 'medium',
    category: 'elevated_access',
    pattern: /\bsudo\s+/,
    description: 'Privileged command execution',
  },
  {
    severity: 'medium',
    category: 'file_write',
    pattern: /(?:writeFileSync|appendFileSync|writeFile|appendFile)\s*\(/,
    description: 'File write capability',
  },

  // An arbitrary package runner is the most common way a skill turns into remote
  // code execution: `npx -y <pkg>` fetches and runs whatever the registry serves
  // at that moment, so the package name is only the start of it. No rule covered
  // this before.
  //
  // The local-path forms (`go run ./cmd/x`, `cargo run`) are excluded: a runner
  // pointed at a path inside the project executes code the user already has, and
  // flagging them is noise on a very common instruction.
  // The flag group is ` --?` with no leading `[ \t]+`: a nested `[ \t]+` inside
  // a `*` group is ambiguous against the separator after it, which is textbook
  // catastrophic backtracking (CodeQL `js/redos`).
  {
    severity: 'high',
    category: 'arbitrary_code_execution',
    pattern:
      /\b(?:npx|dlx|uvx|bunx)(?: --?[^\s]+)*[ \t]+(?![.~/\\])[\w@][\w@./-]*|\b(?:pnpm|yarn|bun)[ \t]dlx\b/i,
    description:
      'Skill instructs running an arbitrary package runner (fetches and executes remote code)',
  },
  // The syntaxes real prompt-injection payloads use to impersonate the harness.
  // A skill is text an agent reads, so a control marker in that text is a way to
  // claim authority the payload does not have.
  {
    severity: 'critical',
    category: 'prompt_injection',
    pattern:
      /<\/?(?:system|assistant|human|tool_result)(?:[-_][\w-]+)?\s*>|<system-reminder>|<\/?(?:im_start|im_end)>\s*|\[\/?INST\]|<{2}\/?SYS>{2}|###\s*(?:system|instructions?)\b|^\s*(?:system|admin|root)\s*:|\bsystem\s+prompt\s*(?:override|replace)/im,
    description: 'Prompt injection: embeds agent control markers',
  },
  // Sending a secret outward. Matched by structure rather than by host: the old
  // rule named a handful of paste sites that rotate in a day, so any other
  // destination scored clean.
  {
    severity: 'critical',
    category: 'data_exfiltration',
    pattern:
      /(?:process\.env\.[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)|readFileSync\s*\(\s*['"`][^'"`]*\.ssh|~?\/?\.(?:npmrc|netrc)\b|ANTHROPIC_API_KEY|OPENAI_API_KEY|AWS_SECRET_ACCESS_KEY)\b[^)\n]{0,120}https?:\/\//i,
    description: 'Secret read and sent to a remote host',
  },
  {
    severity: 'high',
    category: 'persistence',
    pattern:
      /\b(?:crontab|launchctl\s+load|LaunchAgents|LaunchDaemons|systemctl\s+enable)\b|>>?\s*~?\/?[\w/.-]*(?:bashrc|zshrc|bash_profile|zprofile|profile)\b|\bgit\s+config\s+--global\b/i,
    description: 'Persistence: writes to a startup or scheduled location',
  },
]

// A skill is documentation that gets read into an agent's context. It has no
// business shipping a file that reconfigures the agent, so the *name* alone is
// enough to flag it — the payload can live entirely in the filename or in a
// file the content scan would treat as ordinary prose.
const SHADOWING_FILE_NAMES =
  /(?:^|\/)(?:settings(?:\.local)?\.json|\.mcp\.json|opencode\.json|claude_code\.json|mcp_config\.json|\.claude\.json|AGENTS\.md|CLAUDE\.md|GEMINI\.md|\.cursorrules|\.windsurfrules|\.aider\.conf\.yml)$/i

// Same list, for anything under a `hooks/` directory at any depth.
const SHADOWING_HOOK_PATHS = /(?:^|\/)hooks\//i

// Frontmatter keys that grant the skill authority over the agent rather than
// describing it. These are scanned as metadata, not as prose: a line of text
// that merely mentions `allowed-tools` is not the same as a key that sets it.
//
// `mcp_servers` is deliberately absent. It is a supported feature —
// `parseMcpServersFromSkill` reads it and every server it names goes through
// `gateMcpServer` — so flagging it here would double-report a path that is
// already gated, and would mark a legitimate skill as needing review.
const TOOL_AUTHORITY_FRONTMATTER =
  /^([ \t]*)(allowed[-_]tools?|permissions?|hooks?)[ \t]*:/im

/**
 * Fold away the tricks that hide a keyword from a literal pattern.
 *
 * Every rule in this file is a regex over text, so an attacker only has to
 * insert a character the regex does not mention. Four ways to do that were
 * verified against `scanSkill` before this existed — all scored 100 and
 * classified `safe`:
 *
 *   `ig\u200bnore all previous instructions`  zero-width, invisible in an editor
 *   `Ig<!--x-->nore all previous instructions` a comment splits the verb
 *   `ｉｇｎｏｒｅ　ｐｒｅｖｉｏｕｓ`               full-width Unicode letters
 *   `ignore\u2010all previous instructions`    a Unicode dash for `-`
 *
 * Normalising once here lifts all the existing rules at once. The normalised
 * form is only ever used for matching; the file is reported and stored as it
 * actually arrived.
 */
function normalizeForScan(text) {
  return (
    text
      // An HTML comment is stripped from the *scanner's copy* only. Nothing
      // escapes this: the text is never rendered, re-serialised, or used to
      // build output, and `normalizeForScan` has exactly one caller, which
      // feeds the result to regex matching alone.
      //
      // A single pass removes both delimiters, which is what defeats
      // `Ig<!--x-->nore`. The unterminated case (`<!--` with no closing `-->`)
      // is deliberately left alone: it cannot split a keyword in the middle
      // of one, and dropping a stray `<!--` would only lose text.
      //
      // Comments used to split a keyword apart. Removed with no replacement,
      // so the split is closed rather than widened into a space that would
      // break the word in two.
      .replace(/<!--(?:[^-]|-(?!->))*-->/g, '')
      // Zero-width and invisible formatting characters.
      .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g, '')
      // Full-width and other compatibility forms folded to ASCII.
      .normalize('NFKC')
      // Look-alikes. The dash family maps to a space rather than to `-`:
      // these rules match English phrases, so a dash standing in for a word
      // break has to become one or the phrase still misses.
      .replace(/[\u2010-\u2015\u2212\uFE63\uFF0D]/g, ' ')
      .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
      .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
      .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
  )
}

export function computeScore(issues) {
  const deductions = {}
  for (const issue of issues) {
    deductions[issue.severity] = (deductions[issue.severity] || 0) + 1
  }

  let score = 100
  for (const [severity, count] of Object.entries(deductions)) {
    score -= count * (WEIGHTS[severity] || 0)
  }

  return Math.max(0, score)
}

export function scanSkill(resolved) {
  const issues = []
  const seen = new Set()

  const fileEntries = Object.entries(resolved.fileContents || {})
  for (const [filename, content] of fileEntries) {
    if (typeof content !== 'string') continue

    // Checked before the content patterns: a shadowing filename is a finding
    // regardless of what is inside it.
    if (
      SHADOWING_FILE_NAMES.test(filename) ||
      SHADOWING_HOOK_PATHS.test(filename)
    ) {
      issues.push({
        severity: 'high',
        category: 'config_shadowing',
        description:
          'Skill ships a file that can reconfigure or shadow the agent configuration',
        file: filename,
      })
    }

    const normalized = normalizeForScan(content)

    for (const check of PATTERNS) {
      const key = `${check.severity}:${check.category}:${check.description}:${filename}`
      if (seen.has(key)) continue
      if (check.pattern.test(normalized)) {
        issues.push({
          severity: check.severity,
          category: check.category,
          description: check.description,
          file: filename,
        })
        seen.add(key)
      }
    }

    // A YAML frontmatter block is delimited by `---` lines at the very top.
    // Anywhere else, `hooks:` is ordinary prose and must not be flagged.
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)
    const authority =
      frontmatter && TOOL_AUTHORITY_FRONTMATTER.exec(frontmatter[1])
    if (authority) {
      issues.push({
        severity: 'high',
        category: 'tool_authority',
        description: `Frontmatter grants agent tool authority via "${authority[2].trim()}"`,
        file: filename,
      })
    }
  }

  // Content that exceeded the read budget was never scanned. Reporting that is
  // the difference between "we looked and found nothing" and "we did not look".
  if (wasTruncated(resolved.fileContents)) {
    issues.push({
      severity: 'medium',
      category: 'scan_incomplete',
      description: `Skill content exceeded the scan budget (${MAX_SKILL_FILE_BYTES} bytes per file, ${MAX_SKILL_TOTAL_BYTES} total); some files were not scanned`,
    })
  }

  if (!resolved.owner || resolved.owner === 'local') {
    issues.push({
      severity: 'low',
      category: 'missing_metadata',
      description: 'No owner specified for this skill',
    })
  }
  if (!resolved.description) {
    issues.push({
      severity: 'low',
      category: 'missing_metadata',
      description: 'No description provided for this skill',
    })
  }
  if (resolved.sourceType === 'npm') {
    issues.push({
      severity: 'low',
      category: 'source_type',
      description: 'Installing from npm registry (published by anyone)',
    })
  } else if (resolved.sourceType === 'git') {
    issues.push({
      severity: 'low',
      category: 'source_type',
      description: 'Installing from arbitrary git URL (untrusted source)',
    })
  }

  return { score: computeScore(issues), issues }
}

export function classifyScore(score, issues) {
  // Any critical issue → danger regardless of score.
  // A high-severity issue must never be reported as `safe`, but it does not on
  // its own imply danger — the score still decides between review and danger.
  if (issues.some((i) => i.severity === 'critical')) return 'danger'
  if (score >= 90)
    return issues.some((i) => i.severity === 'high') ? 'review' : 'safe'
  if (score >= 70) return 'review'
  return 'danger'
}

// Preserve scanned-source policy while requiring approval for unscanned npm.
export function requiresMcpApproval({ score, issues }) {
  return (
    classifyScore(score, issues) === 'danger' ||
    issues.some((issue) => issue.category === 'unscanned_source')
  )
}

export function scanMcpServer(resolved) {
  const issues = []

  // `unscanned_source` describes "there was nothing here for the scanner to
  // read", not "the source was npm". Only `npm:` and `gh:` actually fetch the
  // payload (`resolveMcpSource` in utils/mcp.js); every other source type
  // resolves to a runner command that fetches at run time, so the pattern scan
  // below has nothing to match against. Keying this off the source type let
  // those entries score 100/SAFE with zero issues (#401) — so it keys off
  // whether any scannable content was actually produced.
  const hasScannableContents = Object.values(resolved.fileContents || {}).some(
    (content) => typeof content === 'string',
  )

  if (resolved.fileContents && typeof resolved.fileContents === 'object') {
    const seen = new Set()
    const fileEntries = Object.entries(resolved.fileContents)
    for (const [filename, content] of fileEntries) {
      if (typeof content !== 'string') continue
      for (const check of MCP_NETWORK_PATTERNS) {
        const key = `${check.severity}:${check.category}:${check.description}:${filename}`
        if (seen.has(key)) continue
        if (check.pattern.test(content)) {
          issues.push({
            severity: check.severity,
            category: check.category,
            description: check.description,
            file: filename,
          })
          seen.add(key)
        }
      }
    }

    if (resolved.sourceType === 'github' && resolved.repo) {
      const owner = resolved.repo.split('/')[0]
      const knownSafe = [
        'github',
        'modelcontextprotocol',
        'anthropic',
        'vercel',
        'openai',
      ]
      if (!knownSafe.includes(owner)) {
        issues.push({
          severity: 'low',
          category: 'untrusted_publisher',
          description: `MCP server published by "${owner}" (not a known trusted publisher)`,
        })
      }
    }
  }

  if (!hasScannableContents) {
    const label = resolved.sourceType
      ? `MCP server (${resolved.sourceType})`
      : 'MCP server'
    issues.push({
      severity: 'high',
      category: 'unscanned_source',
      description: `${label} contents were not available for security scanning`,
    })
  }

  if (resolved.sourceType === 'npm') {
    issues.push({
      severity: 'low',
      category: 'source_type',
      description: 'Installing from npm registry (published by anyone)',
    })
  }

  return { score: computeScore(issues), issues }
}

// Scan an MCP server entry as it will be written to agent config, for paths
// that have no resolved source to inspect (e.g. `profile apply`). The command
// line is joined so a pattern split across `args` is still matched, and the
// whole entry is included so fields such as `env` or `url` are covered too.
export function scanMcpServerConfig(name, serverConfig) {
  if (!serverConfig || typeof serverConfig !== 'object') {
    return { score: 100, issues: [] }
  }
  const args = Array.isArray(serverConfig.args) ? serverConfig.args : []
  const commandLine = [serverConfig.command ?? '', ...args].join(' ')
  const content = `${commandLine}\n${JSON.stringify(serverConfig)}`
  return scanMcpServer({ fileContents: { [name]: content } })
}

export function formatSecurityReport({ score, issues }, skillName) {
  const label = classifyScore(score, issues)
  const emoji = label === 'safe' ? '✅' : label === 'review' ? '⚠️' : '❌'
  const header = skillName ? ` ${skillName}` : ''
  const lines = [
    `\n${emoji}${header} Security scan: ${score}/100 — ${label.toUpperCase()}`,
  ]

  if (issues.length > 0) {
    for (const issue of issues) {
      const icon =
        issue.severity === 'critical'
          ? '❌'
          : issue.severity === 'high'
            ? '🔴'
            : issue.severity === 'medium'
              ? '🟡'
              : '⚪'
      const file = issue.file ? ` (${issue.file})` : ''
      lines.push(`   ${icon} [${issue.severity}] ${issue.description}${file}`)
    }
    if (label === 'review') {
      lines.push(`\n   ⚠️  Recommendation: Review before installing`)
    } else if (label === 'danger') {
      lines.push(
        `\n   ❌ Recommendation: Blocking install — use --yes to force`,
      )
    }
  } else {
    lines.push(`   No issues found`)
  }

  return lines.join('\n')
}
