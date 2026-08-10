import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  detectFormat,
  mdcToSkill,
  parseFrontmatter,
  serializeFrontmatter,
  skillToMdc,
  splitSections,
} from './converter.js'

describe('parseFrontmatter', () => {
  it('parses frontmatter attributes and preserves the body', () => {
    const content = [
      '---',
      'name: review',
      "tags: ['code', 'quality']",
      'mcp_servers:',
      '  - name: github',
      '    source: gh:example/server',
      '---',
      '# Review',
      '',
      'Inspect the change.',
    ].join('\n')

    assert.deepEqual(parseFrontmatter(content), {
      attrs: {
        name: 'review',
        tags: ['code', 'quality'],
        mcp_servers: [{ name: 'github', source: 'gh:example/server' }],
      },
      body: '# Review\n\nInspect the change.',
    })
  })

  it('returns unchanged content when frontmatter is missing', () => {
    const content = '# Plain markdown\n\nNo metadata.'

    assert.deepEqual(parseFrontmatter(content), { attrs: {}, body: content })
  })

  it('handles empty content', () => {
    assert.deepEqual(parseFrontmatter(''), { attrs: {}, body: '' })
  })

  it('accepts the YAML document-end delimiter', () => {
    assert.deepEqual(parseFrontmatter('---\nname: review\n...\nBody'), {
      attrs: { name: 'review' },
      body: 'Body',
    })
  })
})

describe('serializeFrontmatter', () => {
  it('serializes arrays, object arrays, and booleans while skipping nullish values', () => {
    const result = serializeFrontmatter({
      tags: ['code', 'quality'],
      mcp_servers: [
        { name: 'github', source: 'gh:example/server' },
        { name: 'local', source: 'stdio' },
      ],
      alwaysApply: false,
      omitted: undefined,
      absent: null,
    })

    assert.equal(
      result,
      [
        '---',
        'tags:',
        '  - code',
        '  - quality',
        'mcp_servers:',
        '  - name: github',
        '    source: gh:example/server',
        '  - name: local',
        '    source: stdio',
        'alwaysApply: false',
        '---',
        '',
      ].join('\n'),
    )
  })
})

describe('skillToMdc', () => {
  it('maps the description, preserves MCP metadata, and keeps the body', () => {
    const content = [
      '---',
      'name: Review fallback',
      'description: Review pull requests',
      'slug: review',
      'mcp_servers:',
      '  - name: github',
      '    source: gh:example/server',
      '---',
      '# Review',
      '',
      'Inspect the change.',
    ].join('\n')

    const converted = skillToMdc(content)
    const { attrs, body } = parseFrontmatter(converted)

    assert.deepEqual(attrs, {
      alwaysApply: 'false',
      description: 'Review pull requests',
      mcp_servers: [{ name: 'github', source: 'gh:example/server' }],
      _slug: 'review',
    })
    assert.equal(body, '# Review\n\nInspect the change.')
  })

  it('uses the skill name when a description is absent', () => {
    const converted = skillToMdc('---\nname: Review fallback\n---\nBody')

    assert.equal(
      parseFrontmatter(converted).attrs.description,
      'Review fallback',
    )
  })
})

describe('mdcToSkill', () => {
  it('maps description metadata, drops MDC-only fields, and preserves the body', () => {
    const content = [
      '---',
      'description: Review pull requests',
      'alwaysApply: true',
      'globs: src/**/*.js',
      '_slug: custom-review',
      'mcp_servers:',
      '  - name: github',
      '    source: gh:example/server',
      '---',
      '# Review',
      '',
      'Inspect the change.',
    ].join('\n')

    const converted = mdcToSkill(content, 'review.mdc')
    const { attrs, body } = parseFrontmatter(converted)

    assert.deepEqual(attrs, {
      name: 'Review pull requests',
      slug: 'custom-review',
      owner: 'local',
      description: 'Review pull requests',
      mcp_servers: [{ name: 'github', source: 'gh:example/server' }],
    })
    assert.equal(body, '# Review\n\nInspect the change.')
    assert.ok(!('alwaysApply' in attrs))
    assert.ok(!('globs' in attrs))
  })

  it('derives a normalized slug from an unusual filename', () => {
    const converted = mdcToSkill(
      'Body without frontmatter',
      'My Review Rule.MDC',
    )

    assert.deepEqual(parseFrontmatter(converted), {
      attrs: {
        name: 'My Review Rule',
        slug: 'my-review-rule',
        owner: 'local',
        description: '',
      },
      body: 'Body without frontmatter',
    })
  })
})

describe('detectFormat', () => {
  it('recognizes MDC and SKILL.md paths', () => {
    assert.equal(detectFormat('rules/review.mdc'), 'mdc')
    assert.equal(detectFormat('/tmp/review/SKILL.md'), 'skill')
  })

  it('returns null for unsupported or differently cased names', () => {
    assert.equal(detectFormat('rules/review.md'), null)
    assert.equal(detectFormat('rules/review.MDC'), null)
    assert.equal(detectFormat('rules/skill.md'), null)
  })
})

describe('splitSections', () => {
  it('splits second-level headings and keeps their content lines', () => {
    const body = [
      'Preamble is ignored.',
      '## Install',
      'Run the installer.',
      '',
      '### Notes',
      'Use a supported runtime.',
      '## Usage',
      'Run the command.',
    ].join('\n')

    assert.deepEqual(splitSections(body), [
      {
        heading: 'Install',
        lines: [
          'Run the installer.',
          '',
          '### Notes',
          'Use a supported runtime.',
        ],
      },
      { heading: 'Usage', lines: ['Run the command.'] },
    ])
  })

  it('returns no sections when the body has no second-level headings', () => {
    assert.deepEqual(splitSections('# Title\n\nPlain body.'), [])
  })
})
