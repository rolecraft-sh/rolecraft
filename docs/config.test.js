import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import config from './.vitepress/config.js'

const REPO_ROOT = join(import.meta.dirname, '..')
const SITE = 'https://rolecraft-sh.github.io'

const head = (page) =>
  config.transformHead({ page, siteConfig: { site: { base: config.base } } })
const meta = (property) =>
  config.head.find(([, attrs]) => attrs.property === property)[1].content

describe('docs site head', () => {
  it('maps index.md canonical to the site root', () => {
    assert.equal(head('index.md')[0][1].href, `${SITE}/rolecraft/`)
  })

  it('maps nested pages to their extensionless path', () => {
    assert.equal(head('faq.md')[0][1].href, `${SITE}/rolecraft/faq`)
    assert.equal(
      head('commands/install.md')[0][1].href,
      `${SITE}/rolecraft/commands/install`,
    )
    assert.equal(
      head('guides/getting-started.md')[0][1].href,
      `${SITE}/rolecraft/guides/getting-started`,
    )
  })

  it('keeps og:url equal to the canonical', () => {
    assert.equal(
      head('security.md')[1][1].content,
      `${SITE}/rolecraft/security`,
    )
  })

  it('states the agent count that docs/agents.md actually documents', () => {
    const agents = readFileSync(join(REPO_ROOT, 'docs', 'agents.md'), 'utf-8')
    const count = agents.match(/Agent count:\*\* (\d+) total/)[1]
    assert.match(meta('og:description'), new RegExp(`for ${count} agents`))
  })

  it('points og:image at a file that ships in assets', () => {
    assert.equal(meta('og:image'), `${SITE}/rolecraft/og.jpg`)
    assert.ok(existsSync(join(REPO_ROOT, 'assets', 'og.jpg')))
  })

  it('points robots.txt at the deployed sitemap', () => {
    const robots = readFileSync(
      join(REPO_ROOT, 'assets', 'robots.txt'),
      'utf-8',
    )
    assert.match(robots, new RegExp(`Sitemap: ${SITE}/rolecraft/sitemap\\.xml`))
  })
})
