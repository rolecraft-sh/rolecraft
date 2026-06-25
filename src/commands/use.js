import { resolveSource } from '../utils/resolver.js'

export async function useCommand(source) {
  console.log(`\n🔍 Resolving skill from: ${source}`)
  const resolved = await resolveSource(source)

  console.log(`\n📦 Skill: ${resolved.name}`)
  console.log(`   Slug:     ${resolved.slug}`)
  console.log(`   Owner:    ${resolved.owner}`)
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
