import { UserError } from './errors.js'

/**
 * Default number of redirect hops to follow when a host allow-list has to be
 * re-checked on every one. Three covers a real CDN hop without letting a chain
 * of them run.
 */
export const MAX_REDIRECTS = 3

export const isRedirect = (status) => status >= 300 && status < 400

/**
 * Fetch a URL, following redirects by hand so the caller's host allow-list is
 * re-checked on every hop.
 *
 * `redirect: 'follow'` would let an allow-listed host bounce the request to an
 * arbitrary origin, and the allow-list would only ever be consulted for the URL
 * the caller supplied. That makes a check-then-fetch pair worthless.
 *
 * `assertAllowed` is called with each hop's URL before it is requested and is
 * expected to throw when that host is not permitted. It is the only authority on
 * which hosts are allowed: this helper never widens or second-guesses it, so the
 * redirect machinery cannot become a way around the list.
 *
 * Returns the final response alongside the URL that produced it. The URL is
 * returned rather than read from `Response.url` because the lightweight response
 * objects used in tests do not carry it.
 */
export async function fetchFollowingRedirects(url, options = {}) {
  const {
    assertAllowed,
    maxRedirects = MAX_REDIRECTS,
    subject = 'following the request',
    codeBase = 'REDIRECT',
    suggestion,
  } = options

  let current = url

  for (let hop = 0; hop <= maxRedirects; hop++) {
    assertAllowed(current)

    const res = await fetch(current, { redirect: 'manual' })

    if (!isRedirect(res.status)) {
      return { response: res, url: current }
    }

    // The body of a redirect is never read. Cancel it before issuing the next
    // request, or each hop holds its socket open until it is collected.
    try {
      await res.body?.cancel()
    } catch {}

    const location = res.headers.get('location')
    if (!location) {
      throw new UserError(
        `Redirect from ${current} did not include a Location header.`,
        { code: `${codeBase}_INVALID` },
      )
    }

    // Relative redirects are resolved against the URL that produced them, so a
    // relative hop stays on the origin the allow-list just approved.
    let next
    try {
      next = new URL(location, current)
    } catch {
      throw new UserError(
        `Redirect from ${current} pointed at an invalid URL: ${location}`,
        { code: `${codeBase}_INVALID` },
      )
    }

    current = next.toString()
  }

  throw new UserError(
    `Too many redirects while ${subject} (limit ${maxRedirects}).`,
    {
      ...(suggestion ? { suggestion } : {}),
      code: `${codeBase}_LIMIT`,
    },
  )
}
