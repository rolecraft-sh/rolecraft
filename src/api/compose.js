import { readFile } from 'node:fs/promises'
import {
  parseFrontmatter,
  serializeFrontmatter,
  splitSections,
} from '../utils/converter.js'

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

  const mode = options.mode || 'merge'
  const allAttrs = []
  const allSections = []

  for (const src of sources) {
    const raw = await readFile(src, 'utf-8').catch(() => {
      throw new Error(`Skill file not found: ${src}`)
    })
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
    const names = await Promise.all(
      sources.map(async (s) => {
        try {
          const raw = await readFile(s, 'utf-8')
          const { attrs } = parseFrontmatter(raw)
          return attrs.name || s
        } catch {
          return s
        }
      }),
    )
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
