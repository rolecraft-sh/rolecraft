import { readFileSync, existsSync } from 'node:fs'
import { parseFrontmatter, serializeFrontmatter } from '../utils/converter.js'

function splitSections(body) {
  const lines = body.split('\n')
  const sections = []
  let current = null

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)/)
    if (headingMatch) {
      if (current) sections.push(current)
      current = { heading: headingMatch[1].trim(), lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  if (current) sections.push(current)

  return sections
}

function mergeSectionLines(existingLines, newLines) {
  const seen = new Set(existingLines)
  const merged = [...existingLines]
  for (const line of newLines) {
    if (!seen.has(line)) {
      merged.push(line)
      seen.add(line)
    }
  }
  return merged
}

function mergeFrontmatter(attrsList) {
  const merged = {}
  for (const attrs of attrsList) {
    for (const [key, val] of Object.entries(attrs)) {
      if (val !== undefined && val !== null && val !== '') {
        if (key === 'name' && merged.name && val !== merged.name) {
          continue
        }
        if (key === 'slug' && merged.slug) continue
        merged[key] = val
      }
    }
  }
  return merged
}

export async function apiCompose(sources, options = {}) {
  if (!sources || sources.length < 2) {
    throw new Error('At least 2 skill files are required for compose.')
  }

  for (const src of sources) {
    if (!existsSync(src)) throw new Error(`Skill file not found: ${src}`)
  }

  const mode = options.mode || 'merge'
  const allAttrs = []
  const allSections = []

  for (const src of sources) {
    const raw = readFileSync(src, 'utf-8')
    const { attrs, body } = parseFrontmatter(raw)
    allAttrs.push(attrs)
    allSections.push(splitSections(body))
  }

  let composedSections

  if (mode === 'chain') {
    const sectionMap = new Map()
    for (const sections of allSections) {
      for (const sec of sections) {
        sectionMap.set(sec.heading, [...sec.lines])
      }
    }
    composedSections = [...sectionMap.entries()].map(([heading, lines]) => ({
      heading,
      lines,
    }))
  } else {
    const sectionMap = new Map()
    for (const sections of allSections) {
      for (const sec of sections) {
        if (sectionMap.has(sec.heading)) {
          const existing = sectionMap.get(sec.heading)
          sectionMap.set(sec.heading, mergeSectionLines(existing, sec.lines))
        } else {
          sectionMap.set(sec.heading, [...sec.lines])
        }
      }
    }
    composedSections = [...sectionMap.entries()].map(([heading, lines]) => ({
      heading,
      lines,
    }))
  }

  const mergedAttrs = mergeFrontmatter(allAttrs)
  if (options.name) mergedAttrs.name = options.name

  if (!mergedAttrs.description) {
    const names = sources.map((s) => {
      const raw = readFileSync(s, 'utf-8')
      const { attrs } = parseFrontmatter(raw)
      return attrs.name || s
    })
    mergedAttrs.description = `Composed from: ${names.join(', ')}`
  }

  const bodyLines = []
  for (const sec of composedSections) {
    bodyLines.push(`## ${sec.heading}`)
    for (const line of sec.lines) {
      bodyLines.push(line)
    }
  }

  const content = serializeFrontmatter(mergedAttrs) + bodyLines.join('\n')

  const sectionCounts = allSections.map((s) => s.length)
  const uniqueHeadings = new Set(allSections.flat().map((s) => s.heading))

  const totalInput = sectionCounts.reduce((a, b) => a + b, 0)
  const totalOutput = composedSections.length

  return {
    content,
    stats: {
      sources: sources.length,
      totalInputSections: totalInput,
      totalOutputSections: totalOutput,
      mergedSections: uniqueHeadings.size,
      frontmatterFields: Object.keys(mergedAttrs).length,
    },
  }
}
