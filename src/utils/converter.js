function parseYamlValue(raw) {
  const v = raw.trim()
  if (v === '' || v === '>-' || v === '>' || v === '|') return ''
  return v
}

export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n(?:---|\.\.\.)/)
  if (!match) return { attrs: {}, body: content }

  const yaml = match[1]
  const bodyStart = match[0].length
  const body =
    content[bodyStart] === '\n'
      ? content.slice(bodyStart + 1)
      : content.slice(bodyStart)

  const attrs = {}
  const lines = yaml.split('\n')
  let currentKey = null

  for (const line of lines) {
    const keyMatch = line.match(/^(\w+):\s*(.*)$/)
    if (keyMatch) {
      currentKey = keyMatch[1]
      const val = parseYamlValue(keyMatch[2])
      if (val.startsWith('[')) {
        try {
          attrs[currentKey] = JSON.parse(val.replace(/'/g, '"'))
        } catch {
          attrs[currentKey] = val
        }
      } else {
        attrs[currentKey] = val
      }
    } else if (currentKey && /^\s+-\s/.test(line)) {
      if (!Array.isArray(attrs[currentKey])) attrs[currentKey] = []
      const itemStr = line.trim().slice(2).trim()
      const subMatch = itemStr.match(/^(\w+):\s*(.*)$/)
      if (subMatch) {
        const obj = { [subMatch[1]]: parseYamlValue(subMatch[2]) }
        attrs[currentKey].push(obj)
      } else {
        attrs[currentKey].push(itemStr)
      }
    } else if (
      currentKey &&
      Array.isArray(attrs[currentKey]) &&
      /^\s{4,}\w+:/.test(line)
    ) {
      const last = attrs[currentKey][attrs[currentKey].length - 1]
      if (typeof last === 'object') {
        const sub = line.trim().match(/^(\w+):\s*(.*)$/)
        if (sub) last[sub[1]] = parseYamlValue(sub[2])
      }
    }
  }

  return { attrs, body }
}

export function serializeFrontmatter(attrs) {
  const lines = ['---']
  for (const [key, val] of Object.entries(attrs)) {
    if (Array.isArray(val)) {
      lines.push(`${key}:`)
      for (const item of val) {
        if (typeof item === 'object' && item !== null) {
          const entries = Object.entries(item)
          lines.push(`  - ${entries[0][0]}: ${entries[0][1]}`)
          for (const [sk, sv] of entries.slice(1)) {
            lines.push(`    ${sk}: ${sv}`)
          }
        } else {
          lines.push(`  - ${item}`)
        }
      }
    } else if (typeof val === 'boolean') {
      lines.push(`${key}: ${val}`)
    } else if (val !== undefined && val !== null) {
      lines.push(`${key}: ${val}`)
    }
  }
  lines.push('---')
  return `${lines.join('\n')}\n`
}

export function skillToMdc(content) {
  const { attrs, body } = parseFrontmatter(content)

  const mdc = {
    alwaysApply: false,
  }

  if (attrs.description || attrs.name) {
    mdc.description = attrs.description || attrs.name
  }

  if (attrs.mcp_servers) {
    mdc.mcp_servers = attrs.mcp_servers
  }

  if (attrs.slug) mdc._slug = attrs.slug

  return serializeFrontmatter(mdc) + body
}

export function mdcToSkill(content, filename) {
  const { attrs, body } = parseFrontmatter(content)

  const desc = attrs.description || ''
  const baseName = filename.replace(/\.mdc$/i, '')
  const name = desc || baseName || 'untitled'
  const slug = attrs._slug || baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  const skill = {
    name,
    slug,
    owner: 'local',
    description: desc,
  }

  if (attrs.mcp_servers) {
    skill.mcp_servers = attrs.mcp_servers
  }

  return serializeFrontmatter(skill) + body
}

export function detectFormat(filePath) {
  if (filePath.endsWith('.mdc')) return 'mdc'
  if (filePath.endsWith('SKILL.md')) return 'skill'
  return null
}
