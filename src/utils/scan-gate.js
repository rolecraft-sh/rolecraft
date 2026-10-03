import { UserError } from './errors.js'
import {
  classifyScore,
  requiresMcpApproval,
  scanMcpServer,
  scanSkill,
} from './security.js'

// Policy layer for the scanner. `security.js` decides what is dangerous; this
// module decides what to do about it. The two install paths that already had a
// gate (api/install.js, api/mcp.js) and the five that did not all route through
// here so the wording and codes stay identical — `commands/install.js:181`
// matches on the "security review" substring to offer an interactive retry.

function formatIssues(issues, accept, icon) {
  return issues
    .filter(accept)
    .map(
      (issue) =>
        `  ${icon} [${issue.severity}] ${issue.description}${issue.file ? ` (${issue.file})` : ''}`,
    )
    .join('\n')
}

const isCriticalOrHigh = (issue) =>
  issue.severity === 'critical' || issue.severity === 'high'
const isNotLow = (issue) => issue.severity !== 'low'

/**
 * Scan a resolved skill and enforce the install policy.
 * @returns the scan result, so callers can report it
 * @throws {UserError} when the skill is `danger`, or `review` without `yes`
 */
export function assertSkillScanAllowed(resolved, options = {}) {
  const security = scanSkill(resolved)
  const level = classifyScore(security.score, security.issues)

  if (options.yes && (level === 'danger' || level === 'review')) {
    // --yes forces past danger/review but never silently: warn so a forced
    // install of a flagged skill leaves a visible trail.
    const issues = formatIssues(security.issues, isCriticalOrHigh, '🔴')
    const tag = level === 'danger' ? 'DANGER' : 'REVIEW'
    console.error(
      `\n⚠️  [${tag}] --yes forcing install of "${resolved.name}" despite security scan (score: ${security.score}/100).`,
    )
    if (issues) console.error(issues)
    return security
  }

  if (level === 'safe' || options.yes) return security

  if (level === 'danger') {
    throw new UserError(
      `"${resolved.name}" blocked by security scan (score: ${security.score}/100).`,
      {
        suggestion:
          'Review the flagged issues, fix them, or use --yes to force install (not recommended for untrusted skills).',
        detail: `Flagged issues:\n${formatIssues(security.issues, isCriticalOrHigh, '🔴')}`,
        code: 'SECURITY_DANGER',
      },
    )
  }

  throw new UserError(
    `"${resolved.name}" needs security review (score: ${security.score}/100).`,
    {
      suggestion: 'Review the flagged issues, or use --yes to skip the review.',
      detail: `Flagged issues:\n${formatIssues(security.issues, isNotLow, '🟡')}`,
      code: 'SECURITY_REVIEW',
    },
  )
}

/**
 * Scan a resolved MCP server and enforce the install policy.
 * @returns the scan result, so callers can report it
 */
export function assertMcpScanAllowed(resolved, options = {}) {
  const scanResult = scanMcpServer(resolved)
  if (!requiresMcpApproval(scanResult) || options.yes) return scanResult

  const blocked =
    classifyScore(scanResult.score, scanResult.issues) === 'danger'
  throw new UserError(
    blocked
      ? `MCP server blocked by security scan (score: ${scanResult.score}/100).`
      : `MCP server needs security review (score: ${scanResult.score}/100).`,
    {
      suggestion:
        'Review the flagged issues, then use --yes (API: yes:true) to approve the install.',
      detail: scanResult.issues.map((issue) => issue.description).join('\n'),
      code: blocked ? 'MCP_SECURITY_DANGER' : 'MCP_SECURITY_REVIEW',
    },
  )
}
