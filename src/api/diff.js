import { readFileSync, existsSync } from 'node:fs'
import { parseFrontmatter } from '../utils/converter.js'

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

function diffLines(aLines, bLines) {
  const added = []
  const removed = []
  const aSet = new Set(aLines)
  const bSet = new Set(bLines)

  for (const line of aLines) {
    if (!bSet.has(line)) removed.push(line)
  }
  for (const line of bLines) {
    if (!aSet.has(line)) added.push(line)
  }

  return { added, removed }
}

function diffFrontmatter(attrsA, attrsB) {
  const changes = {}
  const allKeys = new Set([...Object.keys(attrsA), ...Object.keys(attrsB)])

  for (const key of allKeys) {
    const valA = attrsA[key]
    const valB = attrsB[key]
    if (JSON.stringify(valA) !== JSON.stringify(valB)) {
      changes[key] = { from: valA, to: valB }
    }
  }

  return changes
}

export async function apiDiff(skillA, skillB, _options = {}) {
  if (!existsSync(skillA)) throw new Error(`Skill file not found: ${skillA}`)
  if (!existsSync(skillB)) throw new Error(`Skill file not found: ${skillB}`)

  const rawA = readFileSync(skillA, 'utf-8')
  const rawB = readFileSync(skillB, 'utf-8')

  const { attrs: attrsA, body: bodyA } = parseFrontmatter(rawA)
  const { attrs: attrsB, body: bodyB } = parseFrontmatter(rawB)

  const frontmatter = diffFrontmatter(attrsA, attrsB)

  const sectionsA = splitSections(bodyA)
  const sectionsB = splitSections(bodyB)

  const mapA = new Map(sectionsA.map((s) => [s.heading, s]))
  const mapB = new Map(sectionsB.map((s) => [s.heading, s]))

  const allHeadings = new Set([...mapA.keys(), ...mapB.keys()])
  const sections = []

  for (const heading of allHeadings) {
    const secA = mapA.get(heading)
    const secB = mapB.get(heading)

    if (secA && secB) {
      const diff = diffLines(secA.lines, secB.lines)
      if (diff.added.length > 0 || diff.removed.length > 0) {
        sections.push({
          heading,
          status: 'changed',
          ...diff,
        })
      }
    } else if (secA) {
      sections.push({
        heading,
        status: 'removed',
        added: [],
        removed: [...secA.lines],
      })
    } else if (secB) {
      sections.push({
        heading,
        status: 'added',
        added: [...secB.lines],
        removed: [],
      })
    }
  }

  const changedSections = sections.filter((s) => s.status === 'changed')
  const addedSections = sections.filter((s) => s.status === 'added')
  const removedSections = sections.filter((s) => s.status === 'removed')
  const unchangedSections = [...allHeadings].filter((h) => {
    const secA = mapA.get(h)
    const secB = mapB.get(h)
    if (!secA || !secB) return false
    const diff = diffLines(secA.lines, secB.lines)
    return diff.added.length === 0 && diff.removed.length === 0
  })

  return {
    a: skillA,
    b: skillB,
    frontmatter,
    sections,
    stats: {
      changedSections: changedSections.length,
      addedSections: addedSections.length,
      removedSections: removedSections.length,
      unchangedSections: unchangedSections.length,
      frontmatterChanges: Object.keys(frontmatter).length,
    },
  }
}
