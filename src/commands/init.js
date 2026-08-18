import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  getTemplateNames,
  getTemplate,
  generateSkill,
} from '../utils/templates/index.js'
import { normalizeSlug } from '../utils/lockfile.js'

export async function initCommand(name, options = {}) {
  // Handle --list
  if (options.list) {
    console.log('\nAvailable templates:\n')
    for (const t of getTemplateNames()) {
      const tmpl = getTemplate(t)
      console.log(`  ${t.padEnd(20)} ${tmpl.description}`)
    }
    console.log()
    return
  }

  const skillName = name || 'my-skill'
  const slug = skillName.includes('/') ? skillName : skillName
  const displayName = slug.includes('/') ? slug.split('/')[1] : slug
  const dirName = normalizeSlug(slug)
  const dir = join(process.cwd(), dirName)
  const owner = slug.includes('/') ? slug.split('/')[0] : 'local'

  // Handle --template
  if (options.template) {
    const opts = {
      name: displayName,
      slug,
      owner,
      description: options.description || `Describe what this skill does`,
      agents: options.agents || ['claude'],
    }

    const content = generateSkill(options.template, opts)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'SKILL.md'), content)

    console.log(
      `\n✅ Created skill with "${options.template}" template at: ${dir}/SKILL.md`,
    )
    console.log(`   Slug: ${slug}`)
    console.log(`   Name: ${displayName}\n`)
    console.log('Next steps:')
    console.log(`  1. Edit ${dir}/SKILL.md with your skill details`)
    console.log(`  2. rolecraft install ${dir}`)
    console.log()
    return
  }

  // Default: basic scaffold (backward compatible)
  await mkdir(dir, { recursive: true })

  const content = `---
name: ${displayName}
slug: ${slug}
owner: ${owner}
description: Describe what this skill does
---

Write your skill instructions here.
`

  await writeFile(join(dir, 'SKILL.md'), content)

  console.log(`\n✅ Created skill scaffold at: ${dir}/SKILL.md`)
  console.log(`   Slug: ${slug}`)
  console.log(`   Name: ${displayName}\n`)
  console.log('Next steps:')
  console.log(`  1. Edit ${dir}/SKILL.md with your skill details`)
  console.log(`  2. rolecraft install ${dir}`)
  console.log()
}
