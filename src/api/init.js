import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function initApi(name) {
  const skillName = name || 'my-skill'
  const slug = skillName.includes('/') ? skillName : skillName
  const displayName = slug.includes('/') ? slug.split('/')[1] : slug
  const dirName = slug.replace(/\//g, '-')
  const dir = join(process.cwd(), dirName)
  const owner = slug.includes('/') ? slug.split('/')[0] : 'local'

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

  return { path: join(dir, 'SKILL.md'), slug, name: displayName, owner }
}
