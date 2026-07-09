import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'RoleCraft',
  description: 'Install AI agent skills as roles & behaviors — from any source',
  base: '/rolecraft/',
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/rolecraft/favicon.png' }],
    ['style', {}, ':root { --vp-nav-logo-height: 48px; }'],
  ],
  themeConfig: {
    logo: '/rolecraft_logo.png',
    siteTitle: 'RoleCraft',
    nav: [
      { text: 'Guide', link: '/install' },
      { text: 'Commands', link: '/commands/install' },
      { text: 'MCP', link: '/mcp' },
      { text: 'Benchmark', link: '/benchmark/RESULTS' },
      { text: 'Security', link: '/security' },
    ],
    sidebar: {
      '/': [
        { text: 'Introduction', link: '/' },
        { text: 'Install Guide', link: '/install' },
        {
          text: 'Commands',
          items: [
            { text: 'agents-xml', link: '/commands/agents-xml' },
            { text: 'bundle', link: '/commands/bundle' },
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
          ],
        },
        { text: 'MCP Server Management', link: '/mcp' },
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
