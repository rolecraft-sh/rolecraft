import { resolveSkills } from '../utils/resolver.js'
import { installSkill } from '../utils/installer.js'
import { parseMcpServersFromSkill } from '../utils/mcp.js'
import { assertSkillScanAllowed } from '../utils/scan-gate.js'
import { UserError } from '../utils/errors.js'
import { detectAgents } from '../utils/agent-detection.js'

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

  const requestedSkills = options.skill ? [].concat(options.skill) : []

  // Read the resolved list without deciding anything and without writing
  // anything. The CLI needs the names to show its picker; a library caller can
  // do the same before committing to a selection (#306).
  if (options.candidates) {
    return {
      agents: agents.map((a) => ({ flag: a.flag, label: a.label })),
      candidates: allSkills.map((s) => ({
        name: s.name,
        slug: s.slug,
        description: s.description,
      })),
    }
  }

  let selectedSkills
  if (requestedSkills.length > 0) {
    const skillNames = requestedSkills.map((n) => n.toLowerCase())
    selectedSkills = allSkills.filter(
      (s) =>
        skillNames.includes(s.name.toLowerCase()) ||
        skillNames.includes(s.slug.toLowerCase()),
    )
    if (selectedSkills.length === 0) {
      throw new UserError(
        `No matching skills found for: ${requestedSkills.join(', ')}. Available: ${allSkills.map((s) => s.name).join(', ')}`,
        {
          suggestion:
            'Check the spelling, or drop --skill to install everything the source offers.',
          code: 'SETUP_SKILL_NOT_FOUND',
        },
      )
    }
  } else if (allSkills.length === 1 || options.yes) {
    selectedSkills = allSkills
  } else {
    throw new UserError(
      `Multiple skills found (${allSkills.length}). Provide --skill or --yes.`,
      {
        suggestion:
          'Pass the names you want, or `candidates: true` to read the list and choose yourself.',
        code: 'SETUP_MULTIPLE_SKILLS',
      },
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

    // The shared policy layer, not a private copy of it: `commands/setup.js`
    // already routed every install through this, and a second implementation
    // here is how the two drifted -- `setup --yes` on a `review` skill used to
    // install it silently while `install --yes` warned (#306).
    assertSkillScanAllowed(resolved, options)

    const results = await installSkill(resolved, targets)
    installed.push({
      name: resolved.name,
      slug: resolved.slug,
      owner: resolved.owner,
      files: resolved.files,
      results,
      // The declared MCP servers travel with the result so a caller does not
      // have to re-parse the skill body to find them.
      mcpServers: parseMcpServersFromSkill(resolved.content || ''),
    })
  }

  return {
    agents: agents.map((a) => ({ flag: a.flag, label: a.label })),
    installed,
  }
}
