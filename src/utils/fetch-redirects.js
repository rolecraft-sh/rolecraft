const isRedirect = (status) => status >= 300 && status < 400

/**
 * Fetch a URL while validating every redirect destination before requesting it.
 *
 * @param {string} url
 * @param {{
 *   assertAllowed: (url: string) => void,
 *   maxRedirects?: number,
 *   createError?: (kind: string, context: object) => Error,
 * }} options
 */
export async function fetchWithValidatedRedirects(url, options) {
  const { assertAllowed, maxRedirects = 3, createError } = options
  const fail = (kind, context) => {
    if (createError) throw createError(kind, context)
    throw new Error(`Invalid redirect while fetching ${url}: ${kind}`)
  }

  let current = url
  for (let hop = 0; hop <= maxRedirects; hop++) {
    assertAllowed(current)
    const response = await fetch(current, { redirect: 'manual' })

    if (!isRedirect(response.status)) return { response, url: current }

    // Redirect bodies are not consumed. Cancel them before issuing the next
    // request so repeated installs do not retain sockets unnecessarily.
    try {
      await response.body?.cancel()
    } catch {}

    const location = response.headers.get('location')
    if (!location) fail('missing-location', { current, initial: url })

    try {
      current = new URL(location, current).toString()
    } catch {
      fail('invalid-location', { current, initial: url, location })
    }
  }

  fail('limit', { current, initial: url, maxRedirects })
}
