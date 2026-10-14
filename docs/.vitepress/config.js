import { defineConfig } from 'vitepress'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { version } = require('../../package.json')

const SITE = 'https://rolecraft-sh.github.io'
const DESCRIPTION = 'Install AI agent skills as roles & behaviors — from any source. Zero-dependency CLI for 90 agents.'

export default defineConfig({
  title: `RoleCraft v${version}`,
  description: DESCRIPTION,
  base: '/rolecraft/',
  lastUpdated: true,
  transformHead({ page, siteConfig }) {
    const path = page.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
    const url = `${SITE}${siteConfig.site.base}${path}`
    return [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
    ]
  },
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/rolecraft/favicon.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'RoleCraft' }],
    ['meta', { property: 'og:title', content: 'RoleCraft — AI agent skill & MCP manager' }],
    ['meta', { property: 'og:description', content: DESCRIPTION }],
    ['meta', { property: 'og:image', content: `${SITE}/rolecraft/og.jpg` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'RoleCraft — AI agent skill & MCP manager' }],
    ['meta', { name: 'twitter:description', content: DESCRIPTION }],
    ['meta', { name: 'twitter:image', content: `${SITE}/rolecraft/og.jpg` }],
    ['link', { rel: 'apple-touch-icon', href: '/rolecraft/favicon.png' }],
    ['meta', { name: 'theme-color', content: '#010314' }],
    ['style', {}, ':root { --vp-nav-logo-height: 48px; }'],
  ],
  themeConfig: {
    logo: '/logo.png',
    siteTitle: `RoleCraft v${version}`,
    nav: [
      { text: 'Guides', items: [
        { text: 'Getting Started', link: '/guides/getting-started' },
        { text: 'Onboarding', link: '/guides/onboarding' },
        { text: 'Use Cases', link: '/guides/use-cases' },
        { text: 'CI/CD', link: '/guides/ci' },
      ]},
      { text: 'Install', link: '/install' },
      { text: 'Docs', items: [
        { text: 'CLI Reference', link: '/reference' },
        { text: 'Commands', link: '/commands/' },
        { text: 'API', link: '/api' },
        { text: 'MCP', link: '/mcp' },
        { text: 'Agents', link: '/agents' },
        { text: 'Security', link: '/security' },
        { text: 'Benchmark', link: '/benchmark/RESULTS' },
        { text: 'FAQ', link: '/faq' },
      ]},
    ],
    sidebar: {
      '/commands/': [
        { text: 'All Commands', link: '/commands/' },
        {
          text: 'Start here',
          items: [
            { text: 'setup', link: '/commands/setup' },
            { text: 'install', link: '/commands/install' },
            { text: 'search', link: '/commands/search' },
            { text: 'list', link: '/commands/list' },
            { text: 'update', link: '/commands/update' },
            { text: 'remove', link: '/commands/remove' },
          ],
        },
        {
          text: 'Author & maintain',
          items: [
            { text: 'init', link: '/commands/init' },
            { text: 'bundle', link: '/commands/bundle' },
            { text: 'compose', link: '/commands/compose' },
            { text: 'convert', link: '/commands/convert' },
            { text: 'check', link: '/commands/check' },
            { text: 'test', link: '/commands/test' },
            { text: 'verify', link: '/commands/verify' },
            { text: 'diff', link: '/commands/diff' },
            { text: 'doctor', link: '/commands/doctor' },
            { text: 'watch', link: '/commands/watch' },
            { text: 'rollback', link: '/commands/rollback' },
          ],
        },
        {
          text: 'Agents, MCP & platform',
          items: [
            { text: 'agents', link: '/commands/agents' },
            { text: 'agents-xml', link: '/commands/agents-xml' },
            { text: 'mcp', link: '/commands/mcp' },
            { text: 'profile', link: '/commands/profile' },
            { text: 'ci', link: '/commands/ci' },
            { text: 'use', link: '/commands/use' },
            { text: 'upgrade', link: '/commands/upgrade' },
            { text: 'completions', link: '/commands/completions' },
          ],
        },
      ],
      '/': [
        { text: 'Introduction', link: '/' },
        { text: 'Install Guide', link: '/install' },
        {
          text: 'Guides',
          items: [
            { text: 'Getting Started', link: '/guides/getting-started' },
            { text: 'Onboarding Guide', link: '/guides/onboarding' },
            { text: 'Use Cases', link: '/guides/use-cases' },
            { text: 'CI/CD Integration', link: '/guides/ci' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'CLI Reference', link: '/reference' },
            { text: 'Commands', link: '/commands/' },
            { text: 'Node.js API', link: '/api' },
            { text: 'Agent Discovery', link: '/agents' },
            { text: 'Glossary', link: '/glossary' },
          ],
        },
        {
          text: 'MCP & profiles',
          items: [
            { text: 'MCP Server Management', link: '/mcp' },
            { text: 'Profile Management', link: '/profile' },
          ],
        },
        {
          text: 'Trust',
          items: [
            { text: 'Security Model', link: '/security' },
            { text: 'Benchmark', link: '/benchmark/RESULTS' },
            { text: 'Comparison', link: '/comparison' },
            { text: 'Architecture', link: '/architecture' },
          ],
        },
        { text: 'Migration Guide', link: '/migration-from-skills' },
        { text: 'FAQ', link: '/faq' },
      ],
    },
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/rolecraft-sh/rolecraft/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/rolecraft-sh/rolecraft' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/rolecraft' },
    ],
  },
})
