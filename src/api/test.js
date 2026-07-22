import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { parseFrontmatter } from '../utils/converter.js'
import { readLock } from '../utils/lockfile.js'

const ASSERTIONS = [
  {
    name: 'name-defined',
    weight: 10,
    description: 'frontmatter.name is defined',
    run(attrs) {
      return !!attrs.name
    },
  },
  {
    name: 'description-defined',
    weight: 10,
    description: 'frontmatter.description is defined',
    run(attrs) {
      return !!attrs.description
    },
  },
  {
    name: 'description-length',
    weight: 5,
    description: 'description has sufficient length (>= 20 chars)',
    run(attrs) {
      if (!attrs.description) return false
      return String(attrs.description).length >= 20
    },
  },
  {
    name: 'frontmatter-valid',
    weight: 10,
    description: 'Frontmatter is valid YAML',
    run(_attrs, _body, raw) {
      const match = raw.match(/^---\n[\s\S]*?\n(?:---|\.\.\.)/)
      return !!match
    },
  },
  {
    name: 'slug-defined',
    weight: 5,
    description: 'frontmatter.slug is defined',
    run(attrs) {
      return !!attrs.slug
    },
  },
  {
    name: 'content-not-empty',
    weight: 10,
    description: 'Content is not empty (>= 50 words)',
    run(_attrs, body) {
      const words = body.trim().split(/\s+/)
      return words.length >= 50
    },
  },
  {
    name: 'code-block-lang',
    weight: 10,
    description: 'Code blocks have language tags',
    run(_attrs, body) {
      const fences = body.match(/```[\s\S]*?```/g) || []
      if (fences.length === 0) return null
      const langless = fences.filter(f => {
        const firstLine = f.split('\n')[0].replace(/```/, '').trim()
        return !firstLine
      })
      return langless.length === 0
    },
  },
  {
    name: 'dangerous-patterns',
    weight: 15,
    description: 'No dangerous patterns detected',
    run(_attrs, body) {
      const dangerous = [
        /\brm\s+-rf\b/,
        /\beval\s*\(/,
        /\bexec\s*\(/,
        /\bexecSync\s*\(/,
        /child_process/,
        /\bsudo\s+/,
        /\/etc\/(?:passwd|shadow)/,
      ]
      for (const p of dangerous) {
        if (p.test(body)) return false
      }
      return true
    },
  },
  {
    name: 'line-length',
    weight: 5,
    description: 'No lines exceed 120 characters',
    run(_attrs, body) {
      const lines = body.split('\n')
      const long = lines.filter(l => l.length > 120)
      if (long.length === 0) return true
      return { pass: false, detail: `${long.length} line(s)` }
    },
  },
  {
    name: 'example-commands',
    weight: 10,
    description: 'Example commands are present',
    run(_attrs, body) {
      return /\$ /.test(body) || /```(?:bash|sh|zsh)/.test(body)
    },
  },
  {
    name: 'mcp-referenced',
    weight: 5,
    description: 'MCP server reference has matching definition',
    run(attrs) {
      const bodyRefs = /mcp_servers|mcp-server|mcp\./i.test(attrs.body || '')
      const hasMcpInFrontmatter = !!(attrs.mcp_servers || attrs.mcp)
      if (bodyRefs || hasMcpInFrontmatter) {
        return hasMcpInFrontmatter
      }
      return null
    },
  },
  {
    name: 'agent-targets',
    weight: 5,
    description: 'Agent targets are specified',
    run(attrs) {
      return !!(attrs.agents || attrs.scope)
    },
  },
  {
    name: 'has-sections',
    weight: 5,
    description: 'At least 2 section headings exist',
    run(_attrs, body) {
      const sections = body.match(/^##\s+.+/gm)
      return sections ? sections.length >= 2 : false
    },
  },
]

function calculateGrade(score) {
  if (score >= 90) return { grade: 'A', label: 'Excellent' }
  if (score >= 75) return { grade: 'B', label: 'Good' }
  if (score >= 50) return { grade: 'C', label: 'Adequate' }
  if (score >= 25) return { grade: 'D', label: 'Poor' }
  return { grade: 'F', label: 'Unusable' }
}

function generateSuggestions(assertions) {
  const map = {
    'name-defined': 'Add "name" field to frontmatter',
    'description-defined': 'Add "description" field to frontmatter',
    'description-length': 'Description must be at least 20 characters',
    'frontmatter-valid': 'Frontmatter is not valid YAML, must start with --- and end with ---',
    'slug-defined': 'Add "slug" field to frontmatter',
    'content-not-empty': 'Skill content is too short, must be at least 50 words',
    'code-block-lang': 'Use language tags in code blocks (```javascript, ```bash, etc.)',
    'dangerous-patterns': 'Dangerous patterns detected (rm -rf, eval, exec)',
    'line-length': 'Reduce line length (max 120 characters)',
    'example-commands': 'Add example commands ($ prefix or ```bash block)',
    'mcp-referenced': 'If MCP servers are referenced, define mcp_servers in frontmatter',
    'agent-targets': 'Specify which agents this skill is for (agents: or scope: field)',
    'has-sections': 'Add at least 2 "## " section headings',
  }
  return assertions
    .filter(a => a.pass === false)
    .map(a => map[a.name] || `${a.name}: failed`)
}

function runAssertions(attrs, body, raw, filterNames) {
  const results = []

  for (const assertion of ASSERTIONS) {
    if (filterNames && filterNames.length > 0 && !filterNames.includes(assertion.name)) {
      continue
    }

    let pass = assertion.run(attrs, body, raw)
    let detail = ''

    if (pass === null) {
      results.push({
        name: assertion.name,
        pass: null,
        detail: `${assertion.description} — skipped`,
        weight: assertion.weight,
      })
      continue
    }

    if (typeof pass === 'object' && pass !== null) {
      detail = pass.detail || ''
      pass = pass.pass
    }

    if (pass) {
      results.push({
        name: assertion.name,
        pass: true,
        detail: `${assertion.description}`,
        weight: assertion.weight,
      })
    } else {
      results.push({
        name: assertion.name,
        pass: false,
        detail: detail || `${assertion.description} — failed`,
        weight: assertion.weight,
      })
    }
  }

  return results
}

function calculateScore(assertions) {
  let totalWeight = 0
  let earnedWeight = 0

  for (const a of assertions) {
    if (a.pass === null) continue
    totalWeight += a.weight
    if (a.pass) earnedWeight += a.weight
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0
  const { grade, label } = calculateGrade(score)

  return { score, grade, label }
}

function readSkillFile(skillPath) {
  const raw = readFileSync(skillPath, 'utf-8')
  const { attrs, body } = parseFrontmatter(raw)
  return { raw, attrs, body, skillPath }
}

export async function apiTest(skillPath, options = {}) {
  const onlyNames = options.only
    ? (Array.isArray(options.only) ? options.only : [options.only])
    : null

  if (options.all) {
    return testAllSkills(options)
  }

  const { raw, attrs, body } = readSkillFile(skillPath)
  const assertions = runAssertions(attrs, body, raw, onlyNames)
  const { score, grade, label } = calculateScore(assertions)
  const suggestions = generateSuggestions(assertions)

  const skillName = attrs.name || skillPath.replace(/.*\//, '')

  return {
    skill: skillName,
    score,
    grade,
    label,
    assertions,
    suggestions,
  }
}

async function testAllSkills(options) {
  const home = homedir()
  const agentsDir = join(home, '.agents', 'skills')
  const results = []

  const globalLock = await readLock()
  const allSlugs = [...new Set([
    ...Object.keys(globalLock.skills),
  ])]

  let projectLock = null
  try {
    projectLock = await readLock(join(process.cwd(), '.agents', '.skill-lock.json'))
    for (const slug of Object.keys(projectLock.skills)) {
      if (!allSlugs.includes(slug)) allSlugs.push(slug)
    }
  } catch {}

  if (allSlugs.length === 0) {
    return { results: [], summary: { total: 0, passed: 0, failed: 0, skipped: 0 } }
  }

  for (const slug of allSlugs) {
    const normSlug = slug.replace(/\//g, '-')
    let skillFile = join(agentsDir, normSlug, 'SKILL.md')

    if (!existsSync(skillFile)) {
      const projectDir = join(process.cwd(), '.agents', 'skills', normSlug)
      skillFile = join(projectDir, 'SKILL.md')
    }

    if (!existsSync(skillFile)) {
      results.push({ skill: slug, score: 0, grade: 'F', label: 'Unusable', error: 'SKILL.md not found' })
      continue
    }

    try {
      const result = await apiTest(skillFile, { ...options, all: false })
      results.push(result)
    } catch (err) {
      results.push({ skill: slug, score: 0, grade: 'F', label: 'Unusable', error: err.message })
    }
  }

  const passed = results.filter(r => r.score >= (options.minScore || 50))
  const failed = results.filter(r => r.score < (options.minScore || 50))

  return {
    results,
    summary: {
      total: results.length,
      passed: passed.length,
      failed: failed.length,
      skipped: 0,
    },
  }
}
