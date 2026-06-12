import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { readLock, removeSkillFromLock, getAgentsDir } from '../utils/lockfile.js'

function normalizeSlug(slug) {
  return slug.replace(/\//g, '-')
}

export async function removeCommand(slug) {
  const lock = await readLock()

  let actualSlug = slug
  if (!lock.skills[slug]) {
    const normalized = normalizeSlug(slug)
    const found = Object.keys(lock.skills).find(k => normalizeSlug(k) === normalized)
    if (found) {
      actualSlug = found
    } else {
      console.error(`Skill "${slug}" not found.`)
      process.exit(1)
    }
  }

  const dir = join(getAgentsDir(), normalizeSlug(actualSlug))
  try {
    await rm(dir, { recursive: true, force: true })
  } catch {
    // directory might not exist
  }

  await removeSkillFromLock(actualSlug)
  console.log(`Removed ${actualSlug}.`)
}
