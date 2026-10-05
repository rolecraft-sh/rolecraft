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
const FLAGS = String.raw`(?:${SEP}${FLAG}(?:${SEP}${VALUE})?)*?`
// - Python reading the download as data is not execution, but only for a
//   module that provably only formats it. Anything else given to `python3` —
//   a `-c` program, `-m code`, or any other module — can run what it reads, so
//   it counts. This is an allow-list on purpose: the previous version tried to
//   recognise an execution by name (exec, eval, os.system, …), and a name list
//   is not a closed set — `os.execv`, `os.popen`, `ctypes`, `pexpect` and
//   others ran the download while reading as data-only.
const PYTHON_DATA_ONLY = String.raw`[ \t]+(?:-[A-Za-z]+[ \t]+)*-m[ \t]+json\.tool\b`
const PYTHON = String.raw`python[23]?\b(?!${PYTHON_DATA_ONLY})`
const DOWNLOAD_AND_EXECUTE = new RegExp(
  String.raw`(?:curl|wget)${FLAGS}(?:\s|\\\r?\n)+['"]?https?:\/\/[^\s'"]+['"]?${FLAGS}` +
    String.raw`\s*[|;]\s*(?:sudo(?:[ \t]+-\S*)*[ \t]+)?(?:(?:\/[^\s/]+)*\/)?` +
    String.raw`(?:(?:bash|sh|zsh)\b|${PYTHON})`,
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
    severity: 'high',
    category: 'sensitive_file_access',
    pattern: /~\/\.(?:ssh|aws|gpg|gnupg|docker|kube|config|npm|vscode|netrc)/,
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
]

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
    for (const check of PATTERNS) {
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

export function classifyScore(score, issues = []) {
  // Any critical issue → danger regardless of score
  const hasCritical = issues.some((i) => i.severity === 'critical')
  if (hasCritical) return 'danger'
  if (score >= 90) return 'safe'
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
  const label = classifyScore(score)
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
