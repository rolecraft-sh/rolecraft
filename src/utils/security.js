const WEIGHTS = { critical: 20, high: 10, medium: 3, low: 1 }

const MCP_NETWORK_PATTERNS = [
  { severity: 'medium', category: 'network_request', pattern: /https?:\/\//, description: 'MCP server makes network requests' },
  { severity: 'medium', category: 'file_access', pattern: /readFileSync|readFile|writeFileSync|writeFile|appendFile/, description: 'MCP server accesses local filesystem' },
  { severity: 'medium', category: 'shell_exec', pattern: /execSync|spawnSync|exec\s*\(|spawn\s*\(/, description: 'MCP server executes shell commands' },
  { severity: 'medium', category: 'env_access', pattern: /process\.env/, description: 'MCP server reads environment variables' },
  { severity: 'high', category: 'credential_access', pattern: /process\.env\.(?:TOKEN|SECRET|PASSWORD|API_KEY|ACCESS_KEY|AUTH|CREDENTIAL)/i, description: 'MCP server accesses credential environment variables' },
  { severity: 'high', category: 'data_exfiltration', pattern: /https?:\/\/(?:webhook|hook|requestbin|ngrok)\.[^\s]+/, description: 'Potential data exfiltration endpoint in MCP server' },
  { severity: 'critical', category: 'command_injection', pattern: /(?:curl|wget)\s+['"]?https?:\/\/[^\s'"]+['"]?\s*[|;]\s*(?:bash|sh|zsh|python)/, description: 'MCP server downloads and executes remote code' },
]

const PATTERNS = [
  { severity: 'critical', category: 'prompt_injection', pattern: /ignore\s+(all|previous|above)\s+(instructions|directives|commands)/i, description: 'Prompt injection: attempts to override instructions' },
  { severity: 'critical', category: 'prompt_injection', pattern: /you\s+are\s+(now\s+)?a\s*(free|unrestricted|unlimited|unbounded|unconstrained|unfiltered)/i, description: 'Prompt injection: role override attempt' },
  { severity: 'critical', category: 'obfuscated_code', pattern: /(?:atob|btoa)\(\s*['"][A-Za-z0-9+/=]{80,}['"]\s*\)/, description: 'Obfuscated code: base64-encoded blob' },
  { severity: 'critical', category: 'obfuscated_code', pattern: /eval\s*\(\s*['"`]/, description: 'Obfuscated code: eval() with inline string' },
  { severity: 'critical', category: 'obfuscated_code', pattern: /Function\s*\(\s*['"`]/, description: 'Obfuscated code: Function constructor with string argument' },
  { severity: 'critical', category: 'command_injection', pattern: /(?:curl|wget)\s+['"]?https?:\/\/[^\s'"]+['"]?\s*[|;]\s*(?:bash|sh|zsh|python)/, description: 'Command injection: download-and-execute pattern' },

  { severity: 'high', category: 'sensitive_file_access', pattern: /~\/\.(?:ssh|aws|gpg|gnupg|docker|kube|config|npm|vscode|netrc)/, description: 'Access to sensitive user files' },
  { severity: 'high', category: 'sensitive_file_access', pattern: /\/etc\/(?:passwd|shadow|sudoers|ssh|ssl)/, description: 'Access to system sensitive files' },
  { severity: 'high', category: 'data_exfiltration', pattern: /https?:\/\/(?:webhook|hook|requestbin|pipedream|mockbin|insomnia|ngrok|interactsh)\./, description: 'Potential data exfiltration endpoint' },
  { severity: 'high', category: 'credential_harvesting', pattern: /process\.env\.(?:TOKEN|SECRET|PASSWORD|API_KEY|ACCESS_KEY|AUTH|CREDENTIAL)/i, description: 'Harvesting specific environment credentials' },
  { severity: 'high', category: 'credential_harvesting', pattern: /readFileSync\s*\(\s*['"`]~\/\./, description: 'Reading user secrets from home directory' },

  { severity: 'medium', category: 'shell_command', pattern: /(?:execSync|spawnSync|exec\s*\()/, description: 'Shell command execution' },
  { severity: 'medium', category: 'shell_command', pattern: /child_process/, description: 'Child process module usage' },
  { severity: 'medium', category: 'environment_access', pattern: /process\.env(?:[^a-zA-Z_]|$)/, description: 'Environment variable access' },
  { severity: 'medium', category: 'network_request', pattern: /(?:https?\.get|https?\.request|fetch\s*\()/, description: 'Outbound network request' },
  { severity: 'medium', category: 'elevated_access', pattern: /\bsudo\s+/, description: 'Privileged command execution' },
  { severity: 'medium', category: 'file_write', pattern: /(?:writeFileSync|appendFileSync|writeFile|appendFile)\s*\(/, description: 'File write capability' },
]

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
        issues.push({ severity: check.severity, category: check.category, description: check.description, file: filename })
        seen.add(key)
      }
    }
  }

  if (!resolved.owner || resolved.owner === 'local') {
    issues.push({ severity: 'low', category: 'missing_metadata', description: 'No owner specified for this skill' })
  }
  if (!resolved.description) {
    issues.push({ severity: 'low', category: 'missing_metadata', description: 'No description provided for this skill' })
  }
  if (resolved.sourceType === 'npm') {
    issues.push({ severity: 'low', category: 'source_type', description: 'Installing from npm registry (published by anyone)' })
  } else if (resolved.sourceType === 'git') {
    issues.push({ severity: 'low', category: 'source_type', description: 'Installing from arbitrary git URL (untrusted source)' })
  }

  const deductions = {}
  for (const issue of issues) {
    deductions[issue.severity] = (deductions[issue.severity] || 0) + 1
  }

  let score = 100
  for (const [severity, count] of Object.entries(deductions)) {
    score -= count * (WEIGHTS[severity] || 0)
  }

  return { score: Math.max(0, score), issues }
}

export function classifyScore(score) {
  if (score >= 90) return 'safe'
  if (score >= 70) return 'review'
  return 'danger'
}

export function scanMcpServer(resolved) {
  const issues = []

  if (resolved.fileContents && typeof resolved.fileContents === 'object') {
    const seen = new Set()
    const fileEntries = Object.entries(resolved.fileContents)
    for (const [filename, content] of fileEntries) {
      if (typeof content !== 'string') continue
      for (const check of MCP_NETWORK_PATTERNS) {
        const key = `${check.severity}:${check.category}:${check.description}:${filename}`
        if (seen.has(key)) continue
        if (check.pattern.test(content)) {
          issues.push({ severity: check.severity, category: check.category, description: check.description, file: filename })
          seen.add(key)
        }
      }
    }

    if (resolved.sourceType === 'github' && resolved.repo) {
      const owner = resolved.repo.split('/')[0]
      const knownSafe = ['github', 'modelcontextprotocol', 'anthropic', 'vercel', 'openai']
      if (!knownSafe.includes(owner)) {
        issues.push({ severity: 'low', category: 'untrusted_publisher', description: `MCP server published by "${owner}" (not a known trusted publisher)` })
      }
    }
  }

  if (resolved.sourceType === 'npm') {
    issues.push({ severity: 'low', category: 'source_type', description: 'Installing from npm registry (published by anyone)' })
  }

  const deductions = {}
  for (const issue of issues) {
    deductions[issue.severity] = (deductions[issue.severity] || 0) + 1
  }

  let score = 100
  for (const [severity, count] of Object.entries(deductions)) {
    score -= count * (WEIGHTS[severity] || 0)
  }

  return { score: Math.max(0, score), issues }
}

export function formatSecurityReport({ score, issues }) {
  const label = classifyScore(score)
  const emoji = label === 'safe' ? '✅' : label === 'review' ? '⚠️' : '❌'
  const lines = [`\n${emoji} Security scan: ${score}/100 — ${label.toUpperCase()}`]

  if (issues.length > 0) {
    for (const issue of issues) {
      const icon = issue.severity === 'critical' ? '❌' : issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '⚪'
      const file = issue.file ? ` (${issue.file})` : ''
      lines.push(`   ${icon} [${issue.severity}] ${issue.description}${file}`)
    }
    if (label === 'review') {
      lines.push(`\n   ⚠️  Recommendation: Review before installing`)
    } else if (label === 'danger') {
      lines.push(`\n   ❌ Recommendation: Blocking install — use --yes to force`)
    }
  } else {
    lines.push(`   No issues found`)
  }

  return lines.join('\n')
}
