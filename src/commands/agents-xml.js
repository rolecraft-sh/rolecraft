import { readFileSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { readLock, getProjectLockPath, getAgentsDir } from '../utils/lockfile.js'

const SKILLS_SYSTEM_HEADER = `Only use skills listed in <available_skills> below.
Do not invoke a skill that is already loaded in your context.`

function parseNameAndDescription(slug, dir) {
  try {
    const files = readdirSync(dir)
    const skillFile = files.find(f => f === 'SKILL.md' || f.toLowerCase() === 'skill.md')
    if (!skillFile) return { name: slug, description: '' }
    const content = readFileSync(join(dir, skillFile), 'utf-8')
    const fm = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fm) return { name: slug, description: '' }
    const yaml = fm[1]
    const name = yaml.match(/^name:\s*(.+)$/m)?.[1]?.trim() || slug
    const description = yaml.match(/^description:\s*(.+)$/m)?.[1]?.trim() || ''
    return { name, description }
  } catch {
    return { name: slug, description: '' }
  }
}

function generateXml(allSkills) {
  const entries = Object.entries(allSkills)
  if (entries.length === 0) return ''

  const skillsXml = entries.map(([, entry]) => {
    const normSlug = entry.slug.replace(/\//g, '-')
    const searchDirs = [join(getAgentsDir(), normSlug), join(process.cwd(), '.agents', 'skills', normSlug)]
    const existingDir = searchDirs.find(d => {
      try { readdirSync(d); return true } catch { return false }
    })
    const { name, description } = existingDir
      ? parseNameAndDescription(entry.slug, existingDir)
      : { name: entry.slug, description: '' }

    const agentList = entry.agents || []
    const location = agentList.includes('project') ? 'project' : 'global'

    return `  <skill>
    <name>${escapeXml(name)}</name>
    <description>${escapeXml(description)}</description>
    <location>${location}</location>
  </skill>`
  }).join('\n')

  return `<skills_system>
${SKILLS_SYSTEM_HEADER}

<available_skills>
${skillsXml}
</available_skills>
</skills_system>\n`
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function agentsXmlCommand(writeToFile = false) {
  const globalLock = await readLock()
  const projectLock = await readLock(getProjectLockPath(process.cwd())).catch(() => ({ skills: {} }))
  const allSkills = { ...globalLock.skills }

  for (const [slug, entry] of Object.entries(projectLock.skills)) {
    if (!allSkills[slug]) allSkills[slug] = entry
  }

  const xml = generateXml(allSkills)

  if (!xml) {
    console.log('No skills found in lockfile.')
    return
  }

  if (writeToFile) {
    const agentsMdPath = join(process.cwd(), 'AGENTS.md')
    let existing = ''
    try {
      existing = readFileSync(agentsMdPath, 'utf-8')
    } catch {}

    const sectionStart = existing.indexOf('<skills_system>')
    const sectionEnd = existing.indexOf('</skills_system>')

    if (sectionStart !== -1 && sectionEnd !== -1) {
      existing = existing.slice(0, sectionStart) + existing.slice(sectionEnd + '</skills_system>'.length)
    }

    const { writeFile } = await import('node:fs/promises')
    await writeFile(agentsMdPath, (existing.trimEnd() + '\n\n' + xml).trimStart())
    console.log(`✅ Wrote skills XML to ${agentsMdPath}`)
  } else {
    console.log(xml)
  }
}
