import { resolveSkills } from '../utils/resolver.js'

export async function apiUse(source, options = {}) {
  const allSkills = await resolveSkills(source)
  let selectedSkills = allSkills

  if (options.skill && options.skill.length > 0) {
    const skillNames = options.skill.map(n => n.toLowerCase())
    selectedSkills = allSkills.filter(s =>
      skillNames.includes(s.name.toLowerCase()) || skillNames.includes(s.slug.toLowerCase())
    )
    if (selectedSkills.length === 0) {
      throw new Error(`No matching skills found for: ${options.skill.join(', ')}. Available: ${allSkills.map(s => s.name).join(', ')}`)
    }
  }

  return {
    source,
    skills: selectedSkills.map(s => ({
      name: s.name,
      slug: s.slug,
      owner: s.owner,
      description: s.description,
      files: s.files,
      fileContents: s.fileContents,
    })),
  }
}
