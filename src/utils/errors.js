/**
 * User-friendly error wrapper for CLI errors.
 *
 * Usage:
 *   throw new UserError('Failed to fetch npm package', {
 *     suggestion: 'Check your internet connection and try again.',
 *     detail: `npm registry returned HTTP ${res.statusCode}`,
 *     code: 'NPM_FETCH_ERROR',
 *   })
 *
 * At the catch site, call showError(err) to format output.
 * Or inspect programmatically: err.userCode, err.suggestion, err.detail
 */

export class UserError extends Error {
  /**
   * @param {string} message  Short, user-facing description of what went wrong.
   * @param {object} [opts]
   * @param {string} [opts.suggestion]  What the user should do next.
   * @param {string} [opts.detail]      Technical detail (shown with --verbose).
   * @param {string} [opts.code]        Machine-readable error code.
   */
  constructor(message, opts = {}) {
    super(message)
    this.name = 'UserError'
    this.suggestion = opts.suggestion || ''
    this.detail = opts.detail || ''
    this.userCode = opts.code || ''
  }
}

/**
 * Format and display an error to the user.
 *
 * - Plain Error: shows its message prefixed with ❌
 * - UserError: shows message + suggestion (and detail if verbose)
 * - Error with cause: recursively prints cause chain
 */
export function showError(err, options = {}) {
  const verbose = options.verbose || process.argv.includes('--verbose')
  const lines = []

  if (err instanceof UserError) {
    lines.push(`\n❌ ${err.message}`)
    if (err.suggestion) {
      lines.push(`   💡 ${err.suggestion}`)
    }
    if (verbose && err.detail) {
      lines.push(`   🔍 ${err.detail}`)
    }
    if (verbose && err.userCode) {
      lines.push(`   📋 Code: ${err.userCode}`)
    }
  } else if (
    err?.code === 'ENOTFOUND' ||
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'ECONNRESET'
  ) {
    lines.push(`\n❌ Network error: could not reach the server.`)
    lines.push(`   💡 Check your internet connection and try again.`)
    lines.push(`   🔍 ${err.message}`)
  } else {
    lines.push(`\n❌ ${String(err?.message || err)}`)
  }

  if (err?.cause) {
    const causeMsg = err.cause?.message || String(err.cause)
    lines.push(`  ↳ ${causeMsg}`)
  }

  console.error(lines.join('\n'))
}
