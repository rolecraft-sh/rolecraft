import {
  fetchIndex,
  searchRegistry,
  resolveSlug,
  createPublishPR,
  checkUpdates,
  clearCache,
} from '../utils/registry-client.js'

export {
  fetchIndex,
  searchRegistry,
  resolveSlug,
  createPublishPR,
  checkUpdates,
  clearCache,
}

export async function apiRegistryInfo(slug) {
  const index = await fetchIndex()
  const skill = index.skills.find((s) => s.slug === slug)
  if (!skill) {
    const err = new Error(`Skill "${slug}" not found in registry`)
    throw err
  }
  return skill
}

export async function apiRegistryList() {
  const index = await fetchIndex()
  return index.skills
}
