import { writeFileSync } from 'node:fs'

const W = 800
const H = 820
const COLORS = {
  rolecraft: '#15803d',
  rolecraftLight: '#22c55e',
  vercel: '#1d4ed8',
  vercelLight: '#3b82f6',
  agentskill: '#92400e',
  agentskillLight: '#d97706',
  bg: '#ffffff',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  highlight: '#f0fdf4',
}

function sectionTitle(y, text) {
  return `<text x="40" y="${y}" font-family="system-ui,sans-serif" font-size="16" fill="${COLORS.text}" font-weight="700">${esc(text)}</text>`
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const MAX_LOCAL = 4300
const MAX_GITHUB = 11000
const MAX_SIZE = 470

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${COLORS.bg}" rx="12"/>
  <rect x="0" y="0" width="${W}" height="80" fill="#f8fafc" rx="12"/>
  <text x="40" y="34" font-family="system-ui,sans-serif" font-size="20" fill="${COLORS.text}" font-weight="800">⚡ Benchmark Comparison</text>
  <text x="40" y="60" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.muted}">rolecraft vs Vercel skills vs @agentskill.sh/cli · Node.js v22 · 10 iterations</text>

  ${sectionTitle(110, '📁 Local Path Install — Speed')}
  <rect x="40" y="125" width="580" height="50" rx="8" fill="${COLORS.highlight}" stroke="${COLORS.rolecraftLight}" stroke-width="1.5" stroke-dasharray="6,3"/>
  <text x="48" y="147" font-family="system-ui,sans-serif" font-size="14" fill="${COLORS.rolecraft}" font-weight="700">🏆 rolecraft is 434x faster than Vercel skills</text>
  <text x="48" y="165" font-family="system-ui,sans-serif" font-size="11" fill="${COLORS.muted}">@agentskill.sh/cli: not supported for local paths (marketplace-only)</text>

  <rect x="40" y="195" width="${(9.83 / MAX_LOCAL) * 500}" height="28" rx="4" fill="${COLORS.rolecraft}" opacity="0.9"/><text x="48" y="214" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.rolecraft}" font-weight="600">rolecraft</text><text x="198" y="214" font-family="system-ui,sans-serif" font-size="12" fill="${COLORS.muted}">9.83 ms</text>
  <rect x="40" y="233" width="${(4263 / MAX_LOCAL) * 500}" height="28" rx="4" fill="${COLORS.vercel}" opacity="0.9"/><text x="48" y="252" font-family="system-ui,sans-serif" font-size="13" fill="#fff" font-weight="600">Vercel skills</text><text x="${40 + (4263 / MAX_LOCAL) * 500 - 8}" y="252" font-family="system-ui,sans-serif" font-size="13" fill="#fff" text-anchor="end">4,263 ms</text>

  ${sectionTitle(290, '🌐 GitHub Repo Install — Speed')}
  <rect x="40" y="320" width="${(4200 / MAX_GITHUB) * 500}" height="28" rx="4" fill="${COLORS.rolecraft}" opacity="0.9"/><text x="48" y="339" font-family="system-ui,sans-serif" font-size="13" fill="#fff" font-weight="600">rolecraft</text><text x="${40 + (4200 / MAX_GITHUB) * 500 - 8}" y="339" font-family="system-ui,sans-serif" font-size="13" fill="#fff" text-anchor="end">4.2 s</text>
  <rect x="40" y="358" width="${(10024 / MAX_GITHUB) * 500}" height="28" rx="4" fill="${COLORS.vercel}" opacity="0.9"/><text x="48" y="377" font-family="system-ui,sans-serif" font-size="13" fill="#fff" font-weight="600">Vercel skills</text><text x="${40 + (10024 / MAX_GITHUB) * 500 - 8}" y="377" font-family="system-ui,sans-serif" font-size="13" fill="#fff" text-anchor="end">10.0 s</text>

  <text x="40" y="415" font-family="system-ui,sans-serif" font-size="12" fill="${COLORS.muted}">@agentskill.sh/cli: failed — Error: Unknown agent: antigravity-cli</text>

  ${sectionTitle(450, '📦 Package Size')}
  <text x="40" y="497" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.rolecraft}" font-weight="600">rolecraft</text>
  <rect x="185" y="484" width="14" height="24" rx="3" fill="${COLORS.rolecraft}" opacity="0.9"/>
  <text x="205" y="500" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.muted}">~4 KB</text>

  <text x="40" y="535" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.vercel}" font-weight="600">Vercel skills</text>
  <rect x="185" y="522" width="${(465 / MAX_SIZE) * 280}" height="24" rx="3" fill="${COLORS.vercel}" opacity="0.9"/>
  <text x="${185 + (465 / MAX_SIZE) * 280 + 8}" y="538" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.muted}" font-weight="600">~465 KB</text>

  <text x="40" y="573" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.agentskill}" font-weight="600">@agentskill.sh/cli</text>
  <rect x="185" y="560" width="${Math.max((84 / MAX_SIZE) * 280, 14)}" height="24" rx="3" fill="${COLORS.agentskill}" opacity="0.9"/>
  <text x="${185 + Math.max((84 / MAX_SIZE) * 280, 14) + 8}" y="576" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.muted}" font-weight="600">~84 KB</text>

  <text x="40" y="620" font-family="system-ui,sans-serif" font-size="12" fill="${COLORS.muted}">Dependencies: rolecraft 0 · Vercel 1 · @agentskill.sh/cli 2</text>

  <line x1="40" y1="660" x2="760" y2="660" stroke="${COLORS.border}" stroke-width="1"/>

  <text x="40" y="685" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.text}" font-weight="600">Agent Support</text>
  <rect x="40" y="700" width="200" height="24" rx="4" fill="${COLORS.rolecraft}"/>
  <text x="50" y="716" font-family="system-ui,sans-serif" font-size="12" fill="#fff" font-weight="600">rolecraft: 82+ agents</text>
  <rect x="260" y="700" width="200" height="24" rx="4" fill="${COLORS.vercel}"/>
  <text x="270" y="716" font-family="system-ui,sans-serif" font-size="12" fill="#fff" font-weight="600">Vercel skills: 72 agents</text>
  <rect x="480" y="700" width="200" height="24" rx="4" fill="${COLORS.agentskill}"/>
  <text x="490" y="716" font-family="system-ui,sans-serif" font-size="12" fill="#fff" font-weight="600">@agentskill.sh/cli: 15+</text>

  <text x="40" y="755" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.text}" font-weight="600">Unique Features</text>
  <text x="40" y="778" font-family="system-ui,sans-serif" font-size="12" fill="${COLORS.text}">✅ MCP server management    ✅ bundle + create    ✅ watch mode (auto-sync)</text>
  <text x="40" y="798" font-family="system-ui,sans-serif" font-size="12" fill="${COLORS.text}">✅ shell completions        ✅ doctor            ✅ agents-xml</text>
</svg>`

writeFileSync('benchmark/comparison.svg', svg)
console.log('✅ benchmark/comparison.svg created')
