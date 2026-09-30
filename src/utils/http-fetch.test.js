import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fetchFollowingRedirects, MAX_REDIRECTS } from './http-fetch.js'

let savedFetch = null

function bodyResponse(body = 'payload') {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    text: async () => body,
  }
}

function redirectTo(location) {
  return {
    ok: false,
    status: 302,
    headers: new Headers(location ? { location } : {}),
  }
}

// Records the URL and options of every request, and optionally follows
// Location itself when the caller did not pass `redirect: 'manual'`, which is
// what the real fetch does and what made the allow-list bypass possible.
function stubFetch(routes) {
  const calls = []
  savedFetch = globalThis.fetch

  const respond = async (url) => {
    const handler = routes[url]
    if (!handler) throw new Error(`unexpected fetch to ${url}`)
    return handler()
  }

  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    let target = url
    let res = await respond(target)

    for (
      let hop = 0;
      hop < 10 &&
      options?.redirect !== 'manual' &&
      res.status >= 300 &&
      res.status < 400 &&
      res.headers.get('location');
      hop++
    ) {
      target = new URL(res.headers.get('location'), target).toString()
      calls.push({ url: target, options })
      res = await respond(target)
    }

    return res
  }

  return calls
}

const only = (url) => {
  assert.ok(url, 'assertAllowed must be given a URL to check')
  return (candidate) => {
    if (new URL(candidate).hostname !== url) {
      throw new Error(`blocked: ${candidate}`)
    }
  }
}

describe('fetchFollowingRedirects', () => {
  afterEach(() => {
    if (savedFetch) globalThis.fetch = savedFetch
    savedFetch = null
  })

  it('returns the response and the URL that produced it', async () => {
    const calls = stubFetch({
      'https://a.test/x': () => bodyResponse('hello'),
    })

    const { response, url } = await fetchFollowingRedirects(
      'https://a.test/x',
      {
        assertAllowed: only('a.test'),
      },
    )

    assert.equal(url, 'https://a.test/x')
    assert.equal(await response.text(), 'hello')
    assert.equal(calls.length, 1)
  })

  it('asks fetch not to follow redirects itself', async () => {
    const calls = stubFetch({ 'https://a.test/x': () => bodyResponse() })

    await fetchFollowingRedirects('https://a.test/x', {
      assertAllowed: only('a.test'),
    })

    assert.equal(calls[0].options.redirect, 'manual')
  })

  it('re-checks the allow-list on every hop, not just the first', async () => {
    // Only the registry is allowed. Each of these is a hop the caller must get
    // to veto, and a single check on the entry URL would let them all through.
    const hops = ['https://a.test/1', 'https://a.test/2', 'https://a.test/3']
    const routes = {}
    for (const [i, url] of hops.entries()) {
      routes[url] = () => redirectTo(hops[i + 1] ?? 'https://a.test/end')
    }
    routes['https://a.test/end'] = () => bodyResponse()

    const seen = []
    const calls = stubFetch(routes)
    const { url } = await fetchFollowingRedirects(hops[0], {
      assertAllowed: (candidate) => {
        seen.push(candidate)
        only('a.test')(candidate)
      },
    })

    assert.equal(url, 'https://a.test/end')
    assert.deepEqual(seen, [
      'https://a.test/1',
      'https://a.test/2',
      'https://a.test/3',
      'https://a.test/end',
    ])
    // Every hop is a separate request, each one the caller's decision to allow.
    assert.equal(calls.length, 4)
  })

  it('refuses a hop the allow-list rejects, without requesting it', async () => {
    const calls = stubFetch({
      'https://a.test/x': () => redirectTo('https://b.test/x'),
      'https://b.test/x': () => bodyResponse(),
    })

    await assert.rejects(
      () =>
        fetchFollowingRedirects('https://a.test/x', {
          assertAllowed: only('a.test'),
          codeBase: 'TEST_REDIRECT',
        }),
      /blocked: https:\/\/b\.test\/x/,
    )

    // The blocked host must never have been requested.
    assert.deepEqual(
      calls.map((c) => c.url),
      ['https://a.test/x'],
    )
  })

  it('stops at the hop limit by default', async () => {
    const calls = stubFetch({
      'https://a.test/x': () => redirectTo('https://a.test/x'),
    })

    await assert.rejects(
      () =>
        fetchFollowingRedirects('https://a.test/x', {
          assertAllowed: only('a.test'),
          codeBase: 'TEST_REDIRECT',
        }),
      (err) => {
        assert.equal(err.userCode, 'TEST_REDIRECT_LIMIT')
        assert.match(err.message, new RegExp(`limit ${MAX_REDIRECTS}`))
        return true
      },
    )

    // MAX_REDIRECTS redirects are followed, and the request that would exceed
    // the bound is the one that is not made.
    assert.equal(calls.length, MAX_REDIRECTS + 1)
  })

  it('reports a redirect with no Location header', async () => {
    stubFetch({ 'https://a.test/x': () => redirectTo(null) })

    await assert.rejects(
      () =>
        fetchFollowingRedirects('https://a.test/x', {
          assertAllowed: only('a.test'),
          codeBase: 'TEST_REDIRECT',
        }),
      (err) => {
        assert.equal(err.userCode, 'TEST_REDIRECT_INVALID')
        return true
      },
    )
  })

  it('reports a redirect to a URL that cannot be parsed', async () => {
    stubFetch({ 'https://a.test/x': () => redirectTo('http://[::1') })

    await assert.rejects(
      () =>
        fetchFollowingRedirects('https://a.test/x', {
          assertAllowed: only('a.test'),
          codeBase: 'TEST_REDIRECT',
        }),
      (err) => {
        assert.equal(err.userCode, 'TEST_REDIRECT_INVALID')
        assert.match(err.message, /invalid URL/)
        return true
      },
    )
  })

  it('resolves a relative hop against the URL that produced it', async () => {
    const calls = stubFetch({
      'https://a.test/dir/x': () => redirectTo('../other'),
      'https://a.test/other': () => bodyResponse(),
    })

    const { url } = await fetchFollowingRedirects('https://a.test/dir/x', {
      assertAllowed: only('a.test'),
    })

    assert.equal(url, 'https://a.test/other')
    assert.equal(calls.length, 2)
  })

  it('leaves a non-redirect failure to the caller', async () => {
    // The helper stops at "not a redirect" and hands the response over, so a
    // 404 stays a 404 rather than turning into a redirect error.
    stubFetch({ 'https://a.test/x': () => ({ ok: false, status: 404 }) })

    const { response } = await fetchFollowingRedirects('https://a.test/x', {
      assertAllowed: only('a.test'),
    })

    assert.equal(response.status, 404)
    assert.equal(response.ok, false)
  })
})
