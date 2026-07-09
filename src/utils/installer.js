import { mkdir, cp, writeFile, stat, symlink, rm } from 'node:fs/promises'
import { join, relative, dirname } from 'node:path'
import { addSkillToLock, getGlobalLockPath, getProjectLockPath, computeFileHashes } from './lockfile.js'
import agents, { getAgentByFlag } from '../agents.js'

function normalizeSlug(slug) {
  return slug.replace(/\//g, '-')
}

export async function installSkill(resolved, targets, mode = 'copy') {
  const slug = resolved.slug
  const results = []

  const agentNames = targets.map(t => {
    const agent = getAgentByFlag(t)
    return agent ? agent.name : t
  })

  for (const target of targets) {
    let baseDir
    let label

    if (target === 'project') {
      baseDir = join(process.cwd(), '.agents', 'skills')
      label = './.agents/skills/'
    } else {
      const agent = getAgentByFlag(target)
      if (!agent) continue
      baseDir = agent.getDir()
      label = agent.label
    }

    const slugDir = join(baseDir, normalizeSlug(slug))

    if (mode === 'symlink' && resolved.skillDir) {
      const relPath = relative(dirname(slugDir), resolved.skillDir)
      await rm(slugDir, { recursive: true, force: true })
      await mkdir(dirname(slugDir), { recursive: true })
      await symlink(relPath, slugDir)
    } else {
      await rm(slugDir, { recursive: true, force: true })
      await mkdir(slugDir, { recursive: true })
      for (const file of resolved.files) {
        const dst = join(slugDir, file)
        if (Object.hasOwn(resolved.fileContents || {}, file)) {
          await writeFile(dst, resolved.fileContents[file])
        } else if (resolved.skillDir) {
          const src = join(resolved.skillDir, file)
          try {
            await stat(src)
            await cp(src, dst, { recursive: true, force: true })
          } catch {
            // skip files that don't exist
          }
        }
      }
    }

    const lockPath = target === 'project'
      ? getProjectLockPath(process.cwd())
      : getGlobalLockPath()

    await addSkillToLock(slug, {
      slug,
      contentSha: resolved.contentSha,
      fileHashes: resolved.fileContents ? computeFileHashes(resolved.fileContents) : undefined,
      installedAt: new Date().toISOString(),
      agents: agentNames,
      source: resolved.sourcePath,
      sourceType: resolved.sourceType,
    }, lockPath)

    results.push({ target, path: slugDir, label })
  }

  return results
}
