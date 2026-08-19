import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_PATH = resolve(ROOT, 'benchmark/results.json')

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

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const DEFAULT = {
  node: 'v24.18.0',
  os: 'macOS (darwin, arm64)',
  iterations: 10,
  date: '2026-08-17',
  local: {
    rolecraft: { avg: 10.23, min: 5.56, max: 16.95, p50: 9.05 },
    vercel: { avg: 3893.83, min: 3574.97, max: 4527.98, p50: 3868.26 },
    agentskill: null,
    localRatio: 380.68,
  },
  github: {
    rolecraft: { avg: 1578.82, min: 1436.98, max: 1773.16, p50: 1574.09 },
    vercel: { avg: 10949.9, min: 10235.08, max: 11554.33, p50: 11065.96 },
    agentskill: 'failed',
    githubRatio: 6.94,
  },
  packageSize: {
    rolecraft: '432.8 kB',
    vercel: '~465 KB',
    agentskill: '~84 KB',
  },
  deps: { rolecraft: 0, vercel: 1, agentskill: 2 },
  agents: { rolecraft: 86, vercel: 72, agentskill: '15+' },
}

const raw = existsSync(DATA_PATH)
  ? JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
  : null

const data = raw
  ? {
      ...DEFAULT,
      ...raw,
      local: { ...DEFAULT.local, ...(raw.local || {}) },
      github: { ...DEFAULT.github, ...(raw.github || {}) },
      agents: { ...DEFAULT.agents, ...(raw.agents || {}) },
    }
  : DEFAULT

const fmt = (n) => Number(n).toLocaleString('en-US')

const BAR_X = 185
const BAR_W = 500
const SIZE_BAR_W = 280

const W = 800
const H = 820
const MAX_LOCAL = 4500
const MAX_GITHUB = 14000
const MAX_SIZE = 470

const barW = (val, max) => Math.max((val / max) * BAR_W, 4)

const lRc = data.local.rolecraft.avg
const lVc = data.local.vercel.avg
const gRc = data.github.rolecraft.avg
const gVc = data.github.vercel.avg

const lRatio = data.local.localRatio || (lVc / lRc).toFixed(1)
const _gRatio = data.github.githubRatio || (gVc / gRc).toFixed(1)

const ghRcLabel =
  gRc >= 1000 ? `${(gRc / 1000).toFixed(2)} s` : `${gRc.toFixed(0)} ms`
const ghVcLabel =
  gVc >= 1000 ? `${(gVc / 1000).toFixed(2)} s` : `${gVc.toFixed(0)} ms`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${COLORS.bg}" rx="12"/>
  <rect x="0" y="0" width="${W}" height="80" fill="#f8fafc" rx="12"/>
  <text x="40" y="34" font-family="system-ui,sans-serif" font-size="20" fill="${COLORS.text}" font-weight="800">⚡ Benchmark Comparison</text>
  <text x="40" y="60" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.muted}">rolecraft vs Vercel skills vs @agentskill.sh/cli · Node.js ${esc(data.node)} · ${data.iterations} iterations</text>

  <text x="40" y="110" font-family="system-ui,sans-serif" font-size="16" fill="${COLORS.text}" font-weight="700">📁 Local Path Install — Speed</text>
  <rect x="40" y="125" width="580" height="50" rx="8" fill="${COLORS.highlight}" stroke="${COLORS.rolecraftLight}" stroke-width="1.5" stroke-dasharray="6,3"/>
  <text x="48" y="147" font-family="system-ui,sans-serif" font-size="14" fill="${COLORS.rolecraft}" font-weight="700">🏆 rolecraft is ${lRatio}x faster than Vercel skills</text>
  <text x="48" y="165" font-family="system-ui,sans-serif" font-size="11" fill="${COLORS.muted}">@agentskill.sh/cli: not supported for local paths (marketplace-only)</text>

  <text x="40" y="214" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.rolecraft}" font-weight="600">rolecraft</text>
  <rect x="${BAR_X}" y="201" width="${barW(lRc, MAX_LOCAL)}" height="24" rx="3" fill="${COLORS.rolecraft}" opacity="0.9"/>
  <text x="${BAR_X + barW(lRc, MAX_LOCAL) + 8}" y="216" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.muted}">${fmt(lRc)} ms</text>

  <text x="40" y="248" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.vercel}" font-weight="600">Vercel skills</text>
  <rect x="${BAR_X}" y="235" width="${barW(lVc, MAX_LOCAL)}" height="24" rx="3" fill="${COLORS.vercel}" opacity="0.9"/>
  <text x="${BAR_X + barW(lVc, MAX_LOCAL) + 8}" y="250" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.muted}" font-weight="600">${fmt(lVc.toFixed(0))} ms</text>

  <text x="40" y="290" font-family="system-ui,sans-serif" font-size="16" fill="${COLORS.text}" font-weight="700">🌐 GitHub Repo Install — Speed</text>
  <text x="40" y="336" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.rolecraft}" font-weight="600">rolecraft</text>
  <rect x="${BAR_X}" y="323" width="${barW(gRc, MAX_GITHUB)}" height="24" rx="3" fill="${COLORS.rolecraft}" opacity="0.9"/>
  <text x="${BAR_X + barW(gRc, MAX_GITHUB) + 8}" y="338" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.muted}">${ghRcLabel}</text>

  <text x="40" y="370" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.vercel}" font-weight="600">Vercel skills</text>
  <rect x="${BAR_X}" y="357" width="${barW(gVc, MAX_GITHUB)}" height="24" rx="3" fill="${COLORS.vercel}" opacity="0.9"/>
  <text x="${BAR_X + barW(gVc, MAX_GITHUB) + 8}" y="372" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.muted}" font-weight="600">${ghVcLabel}</text>

  <text x="40" y="415" font-family="system-ui,sans-serif" font-size="12" fill="${COLORS.muted}">@agentskill.sh/cli: failed — install does not complete successfully</text>

  <text x="40" y="450" font-family="system-ui,sans-serif" font-size="16" fill="${COLORS.text}" font-weight="700">📦 Package Size</text>
  <text x="40" y="497" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.rolecraft}" font-weight="600">rolecraft</text>
  <rect x="${BAR_X}" y="484" width="${Math.max((parseFloat(data.packageSize.rolecraft) / MAX_SIZE) * SIZE_BAR_W, 14)}" height="24" rx="3" fill="${COLORS.rolecraft}" opacity="0.9"/>
  <text x="${BAR_X + Math.max((parseFloat(data.packageSize.rolecraft) / MAX_SIZE) * SIZE_BAR_W, 14) + 8}" y="500" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.muted}">${esc(data.packageSize.rolecraft)}</text>

  <text x="40" y="535" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.vercel}" font-weight="600">Vercel skills</text>
  <rect x="${BAR_X}" y="522" width="${(parseFloat(data.packageSize.vercel.replace(/[~]/g, '')) / MAX_SIZE) * SIZE_BAR_W}" height="24" rx="3" fill="${COLORS.vercel}" opacity="0.9"/>
  <text x="${BAR_X + (parseFloat(data.packageSize.vercel.replace(/[~]/g, '')) / MAX_SIZE) * SIZE_BAR_W + 8}" y="538" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.muted}" font-weight="600">${esc(data.packageSize.vercel)}</text>

  <text x="40" y="573" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.agentskill}" font-weight="600">@agentskill.sh/cli</text>
  <rect x="${BAR_X}" y="560" width="${Math.max((parseFloat(data.packageSize.agentskill.replace(/[~]/g, '')) / MAX_SIZE) * SIZE_BAR_W, 14)}" height="24" rx="3" fill="${COLORS.agentskill}" opacity="0.9"/>
  <text x="${BAR_X + Math.max((parseFloat(data.packageSize.agentskill.replace(/[~]/g, '')) / MAX_SIZE) * SIZE_BAR_W, 14) + 8}" y="576" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.muted}" font-weight="600">${esc(data.packageSize.agentskill)}</text>

  <text x="40" y="620" font-family="system-ui,sans-serif" font-size="12" fill="${COLORS.muted}">Dependencies: rolecraft ${data.deps.rolecraft} · Vercel ${data.deps.vercel} · @agentskill.sh/cli ${data.deps.agentskill}</text>

  <line x1="40" y1="660" x2="760" y2="660" stroke="${COLORS.border}" stroke-width="1"/>

  <text x="40" y="685" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.text}" font-weight="600">Agent Support</text>
  <rect x="40" y="700" width="200" height="24" rx="4" fill="${COLORS.rolecraft}"/>
  <text x="50" y="716" font-family="system-ui,sans-serif" font-size="12" fill="#fff" font-weight="600">rolecraft: ${data.agents.rolecraft}+ agents</text>
  <rect x="260" y="700" width="200" height="24" rx="4" fill="${COLORS.vercel}"/>
  <text x="270" y="716" font-family="system-ui,sans-serif" font-size="12" fill="#fff" font-weight="600">Vercel skills: ${data.agents.vercel} agents</text>
  <rect x="480" y="700" width="200" height="24" rx="4" fill="${COLORS.agentskill}"/>
  <text x="490" y="716" font-family="system-ui,sans-serif" font-size="12" fill="#fff" font-weight="600">@agentskill.sh/cli: ${esc(String(data.agents.agentskill))}</text>

  <text x="40" y="755" font-family="system-ui,sans-serif" font-size="13" fill="${COLORS.text}" font-weight="600">Unique Features</text>
  <text x="40" y="778" font-family="system-ui,sans-serif" font-size="12" fill="${COLORS.text}">✅ publish to registry   ✅ MCP server mgmt     ✅ bundle + create     ✅ watch (auto-sync)</text>
  <text x="40" y="798" font-family="system-ui,sans-serif" font-size="12" fill="${COLORS.text}">✅ profile              ✅ compose             ✅ test                ✅ doctor</text>
</svg>`

writeFileSync(resolve(ROOT, 'benchmark/comparison.svg'), svg)
console.log('✅ benchmark/comparison.svg created')
