import { defineConfig } from 'vitepress'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { version } = require('../../package.json')

export default defineConfig({
  title: `RoleCraft v${version}`,
  description: 'Install AI agent skills as roles & behaviors — from any source',
  base: '/rolecraft/',
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/rolecraft/favicon.png' }],
    ['style', {}, ':root { --vp-nav-logo-height: 48px; }'],
    ['style', {}, `
      .VPHero .image-src { max-width: 520px !important; max-height: none !important; }
      .VPHero .image-bg { width: 520px !important; height: 520px !important; }
    `],
  ],
  themeConfig: {
    logo: '/rolecraft_logo.png',
    siteTitle: `RoleCraft v${version}`,
    nav: [
      { text: 'Onboarding', link: '/guides/onboarding' },
      { text: 'Install', link: '/install' },
      { text: 'Commands', link: '/commands/install' },
      { text: 'MCP', link: '/mcp' },
      { text: 'Benchmark', link: '/benchmark/RESULTS' },
      { text: 'Security', link: '/security' },
    ],
    sidebar: {
      '/': [
        { text: 'Introduction', link: '/' },
        { text: 'Install Guide', link: '/install' },
        { text: 'Onboarding Guide', link: '/guides/onboarding' },
        {
          text: 'Commands',
          items: [
            { text: 'agents-xml', link: '/commands/agents-xml' },
            { text: 'bundle', link: '/commands/bundle' },
            { text: 'convert', link: '/commands/convert' },
            { text: 'check', link: '/commands/check' },
            { text: 'ci', link: '/commands/ci' },
            { text: 'completions', link: '/commands/completions' },
            { text: 'doctor', link: '/commands/doctor' },
            { text: 'init', link: '/commands/init' },
            { text: 'install', link: '/commands/install' },
            { text: 'list', link: '/commands/list' },
            { text: 'mcp', link: '/commands/mcp' },
            { text: 'remove', link: '/commands/remove' },
            { text: 'search', link: '/commands/search' },
            { text: 'setup', link: '/commands/setup' },
            { text: 'update', link: '/commands/update' },
            { text: 'upgrade', link: '/commands/upgrade' },
            { text: 'use', link: '/commands/use' },
            { text: 'verify', link: '/commands/verify' },
            { text: 'watch', link: '/commands/watch' },
            { text: 'profile', link: '/commands/profile' },
          ],
        },
        { text: 'MCP Server Management', link: '/mcp' },
        { text: 'Profile Management', link: '/profile' },
        { text: 'Security', link: '/security' },
        { text: 'Benchmark', link: '/benchmark/RESULTS' },
        { text: 'Architecture', link: '/architecture' },
        { text: 'Agent Discovery', link: '/agents' },
        { text: 'Comparison', link: '/comparison' },
        { text: 'Migration Guide', link: '/migration-from-skills' },
      ],
    },
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/sametcelikbicak/rolecraft/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sametcelikbicak/rolecraft' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/rolecraft' },
    ],
  },
})
