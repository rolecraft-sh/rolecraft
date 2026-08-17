#!/usr/bin/env node
import { readdirSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '..', 'docs', '.vitepress', 'dist')
const SITE = 'https://rolecraft-sh.github.io/rolecraft'
const OUT = join(DIST, 'sitemap.xml')

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, acc)
    } else if (entry.name.endsWith('.html') && entry.name !== '404.html') {
      acc.push(full)
    }
  }
  return acc
}

try {
  const pages = walk(DIST)
    .map((f) => {
      let rel = f.slice(DIST.length + 1, -'.html'.length)
      if (rel === 'index') rel = ''
      return `${SITE}/${rel}`
    })
    .sort()

  const urls = pages
    .map(
      (loc) =>
        `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n  </url>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`

  writeFileSync(OUT, xml)
  console.log(`✅ sitemap.xml written (${pages.length} URLs)`)
} catch (err) {
  console.error(`Failed to generate sitemap: ${err.message}`)
  process.exit(1)
}
