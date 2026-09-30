import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { apiUse } from './use.js'

let tempDir
let sourceDir
let originalCwd
let originalHome

function skillContent({ name, slug, description }) {
  return `---\nname: ${name}\nslug: ${slug}\nowner: team\ndescription: ${description}\n---\n\n# ${name}\n`
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'rolecraft-api-use-test-'))
  originalCwd = process.cwd()
  originalHome = process.env.HOME
  process.env.HOME = tempDir
  process.chdir(tempDir)

  sourceDir = join(tempDir, 'source')
  const alphaDir = join(sourceDir, 'skills', 'alpha')
  const betaDir = join(sourceDir, 'skills', 'beta')
  await mkdir(alphaDir, { recursive: true })
  await mkdir(betaDir, { recursive: true })
  await writeFile(
    join(alphaDir, 'SKILL.md'),
    skillContent({
      name: 'Alpha',
      slug: 'team/alpha',
      description: 'First skill',
    }),
  )
  await writeFile(join(alphaDir, 'guide.md'), 'Alpha guide')
  await writeFile(
    join(betaDir, 'SKILL.md'),
    skillContent({
      name: 'Beta',
      slug: 'team/beta',
      description: 'Second skill',
    }),
  )
})

after(async () => {
  process.chdir(originalCwd)
  if (originalHome === undefined) delete process.env.HOME
  else process.env.HOME = originalHome
  await rm(tempDir, { recursive: true, force: true })
})

describe('apiUse', () => {
  it('returns multiple local skills without writing to an agents directory', async () => {
    const result = await apiUse(sourceDir)

    assert.equal(result.source, sourceDir)
    assert.deepEqual(
      result.skills
        .map(({ name, slug, owner, description }) => ({
          name,
          slug,
          owner,
          description,
        }))
        .sort((a, b) => a.slug.localeCompare(b.slug)),
      [
        {
          name: 'Alpha',
          slug: 'team/alpha',
          owner: 'team',
          description: 'First skill',
        },
        {
          name: 'Beta',
          slug: 'team/beta',
          owner: 'team',
          description: 'Second skill',
        },
      ],
    )

    const alpha = result.skills.find((skill) => skill.slug === 'team/alpha')
    assert.deepEqual(Object.keys(alpha).sort(), [
      'description',
      'fileContents',
      'files',
      'name',
      'owner',
      'slug',
    ])
    assert.ok(alpha.files.includes('SKILL.md'))
    assert.ok(alpha.files.includes('guide.md'))
    assert.equal(alpha.fileContents['guide.md'], 'Alpha guide')
    assert.equal(existsSync(join(tempDir, '.agents')), false)
    assert.equal(existsSync(join(sourceDir, '.agents')), false)
  })

  it('filters skills by a case-insensitive name or slug', async () => {
    const result = await apiUse(sourceDir, { skill: ['TEAM/BETA'] })

    assert.deepEqual(
      result.skills.map((skill) => skill.slug),
      ['team/beta'],
    )
  })

  // The slug case above only reaches the slug half of the filter. Without these
  // two, deleting the `s.name` comparison in use.js leaves every test green.
  it('matches a skill by display name, ignoring case', async () => {
    const result = await apiUse(sourceDir, { skill: ['alpha'] })

    assert.deepEqual(
      result.skills.map((skill) => skill.slug),
      ['team/alpha'],
    )
  })

  it('matches a lower-case slug against its mixed-case form', async () => {
    const result = await apiUse(sourceDir, { skill: ['Team/Beta'] })

    assert.deepEqual(
      result.skills.map((skill) => skill.slug),
      ['team/beta'],
    )
  })
})
