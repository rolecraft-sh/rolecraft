import { resolveSkills } from '../utils/resolver.js'

export async function useCommand(source, options = {}) {
  const allSkills = await resolveSkills(source)

  if (options.list) {
    console.log(`\nFound ${allSkills.length} skill(s) from: ${source}\n`)
    for (const s of allSkills) {
      console.log(`  ${s.name}`)
      console.log(`    Slug:       ${s.slug}`)
      console.log(`    Owner:      ${s.owner}`)
      if (s.description) console.log(`    Description: ${s.description}`)
      console.log(`    Files:      ${s.files.join(', ')}`)
      console.log()
    }
    return
  }

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

  for (const resolved of selectedSkills) {
    console.log(`\n📦 Skill: ${resolved.name}`)
    console.log(`   Slug:     ${resolved.slug}`)
    console.log(`   Owner:    ${resolved.owner}`)
    if (resolved.description) console.log(`   Desc:     ${resolved.description}`)
    console.log(`   Files:    ${resolved.files.join(', ')}\n`)

    for (const file of resolved.files) {
      const content = resolved.fileContents?.[file]
      if (!content) continue
      const separator = `─── ${file} ${'─'.repeat(Math.max(0, 50 - file.length))}`
      console.log(separator)
      console.log(content)
      if (!content.endsWith('\n')) console.log()
      console.log()
    }
  }
}
