import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { parseFrontmatter } from '../converter.js'

describe('templates registry', () => {
  let templatesModule

  before(async () => {
    templatesModule = await import('./index.js')
  })

  it('getTemplateNames returns all expected templates', () => {
    const names = templatesModule.getTemplateNames()
    const expected = [
      'basic',
      'code-review',
      'git-workflow',
      'testing',
      'security',
      'react',
    ]
    assert.deepEqual(names.sort(), expected.sort())
  })

  it('getTemplate returns description and generate function', () => {
    const tmpl = templatesModule.getTemplate('basic')
    assert.equal(tmpl.name, 'basic')
    assert.equal(typeof tmpl.description, 'string')
    assert.ok(tmpl.description.length > 0)
    assert.equal(typeof tmpl.generate, 'function')
  })

  it('getTemplate throws for unknown template', () => {
    assert.throws(
      () => templatesModule.getTemplate('nonexistent'),
      /Unknown template/,
    )
  })

  describe('generateSkill', () => {
    const opts = {
      name: 'my-test-skill',
      slug: 'test/my-test-skill',
      description:
        'A test skill for verifying template generation works correctly',
      agents: ['claude', 'cursor'],
      owner: 'test-owner',
    }

    const templates = [
      'basic',
      'code-review',
      'git-workflow',
      'testing',
      'security',
      'react',
    ]

    for (const templateName of templates) {
      it(`${templateName} generates valid SKILL.md content`, () => {
        const content = templatesModule.generateSkill(templateName, opts)
        const { attrs, body } = parseFrontmatter(content)

        assert.ok(attrs.name, 'name is defined')
        assert.ok(attrs.slug, 'slug is defined')
        assert.ok(attrs.description, 'description is defined')
        assert.ok(
          String(attrs.description).length >= 20,
          'description >= 20 chars',
        )
        assert.ok(attrs.agents, 'agents is defined')
        assert.ok(attrs.category, 'category is defined')

        const sections = body.match(/^##\s+.+/gm)
        assert.ok(sections, 'has section headings')
        assert.ok(
          sections.length >= 2,
          `has at least 2 sections, got ${sections.length}`,
        )

        const words = body.trim().split(/\s+/)
        assert.ok(
          words.length >= 50,
          `content has at least 50 words, got ${words.length}`,
        )

        const hasCodeBlock = /```[\s\S]*?```/.test(body)
        assert.ok(hasCodeBlock, 'has a code block')

        const hasExampleCmd =
          /\$ /.test(body) || /```(?:bash|sh|zsh)/.test(body)
        assert.ok(hasExampleCmd, 'has example commands')

        const dangerous = [
          /\brm\s+-rf\b/,
          /\beval\s*\(/,
          /\bexec\s*\(/,
          /\bexecSync\s*\(/,
          /child_process/,
          /\bsudo\s+/,
          /\/etc\/(?:passwd|shadow)/,
        ]
        for (const pattern of dangerous) {
          assert.ok(!pattern.test(body), `no dangerous pattern: ${pattern}`)
        }

        const lines = body.split('\n')
        const longLines = lines.filter((l) => l.length > 120)
        assert.equal(
          longLines.length,
          0,
          `no lines exceed 120 chars, got ${longLines.length} long line(s)`,
        )
      })
    }
  })
})
