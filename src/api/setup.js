import { resolveSkills } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import { scanSkill } from '../utils/security.js'
import { classifyScore } from '../utils/security.js'
import { UserError } from '../utils/errors.js'
import { detectAgents } from '../commands/setup.js'

export async function setupApi(source, options = {}) {
  const agents = detectAgents()

  if (!source) {
    return { agents: agents.map((a) => ({ flag: a.flag, label: a.label })) }
  }

  const allSkills = await resolveSkills(source)

  if (options.list) {
    return {
      agents: agents.map((a) => ({ flag: a.flag, label: a.label })),
      skills: allSkills.map((s) => ({
        name: s.name,
        slug: s.slug,
        owner: s.owner,
        description: s.description,
        files: s.files,
      })),
    }
  }

  let selectedSkills
  if (options.skill && options.skill.length > 0) {
    const skillNames = options.skill.map((n) => n.toLowerCase())
    selectedSkills = allSkills.filter(
      (s) =>
        skillNames.includes(s.name.toLowerCase()) ||
        skillNames.includes(s.slug.toLowerCase()),
    )
    if (selectedSkills.length === 0) {
      throw new Error(
        `No matching skills found for: ${options.skill.join(', ')}`,
      )
    }
  } else if (allSkills.length === 1 || options.yes) {
    selectedSkills = allSkills
  } else {
    throw new Error(
      `Multiple skills found (${allSkills.length}). Provide --skill or --yes.`,
    )
  }

  const targets = agents.map((a) => a.flag)
  targets.push('project')

  if (options.dryRun) {
    return {
      agents: agents.map((a) => ({ flag: a.flag, label: a.label })),
      dryRun: true,
      skills: selectedSkills.map((s) => ({
        name: s.name,
        slug: s.slug,
        source,
        files: s.files,
        targets,
      })),
    }
  }

  const installed = []
  for (const skill of selectedSkills) {
    const resolved = {
      ...skill,
      sourcePath: skill.sourcePath || source,
      sourceType: skill.sourceType || 'local',
    }

    // Security scan before install
    const security = scanSkill(resolved)
    const level = classifyScore(security.score)
    if ((level === 'danger' || level === 'review') && !options.yes) {
      const issues = security.issues
        .filter((i) => i.severity !== 'low')
        .map(
          (i) =>
            `  [${i.severity}] ${i.description}${i.file ? ` (${i.file})` : ''}`,
        )
        .join('\n')
      throw new UserError(
        `"${resolved.name}" blocked by security scan (score: ${security.score}/100).`,
        {
          suggestion:
            'Review the flagged issues, or use --yes to skip the security check.',
          detail: issues,
          code: 'SECURITY_DANGER',
        },
      )
    }

    const results = await installSkill(resolved, targets)
    installed.push({ name: resolved.name, slug: resolved.slug, results })
  }

  return {
    agents: agents.map((a) => ({ flag: a.flag, label: a.label })),
    installed,
  }
}
