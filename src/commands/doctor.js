import { apiDoctor } from '../api/doctor.js'
import { ICONS, renderTable } from '../utils/tui.js'

function statusText(status) {
  if (status === 'pass') return `${ICONS.pass} pass`
  if (status === 'warn') return `${ICONS.warn} warn`
  return `${ICONS.error} error`
}

export async function doctorCommand(options = {}) {
  const result = await apiDoctor(process.cwd(), options)

  if (options.json) {
    const jsonOutput = {
      status: result.status,
      checks: {},
      summary: result.summary,
    }
    for (const c of result.checks) {
      jsonOutput.checks[c.label] = { status: c.status, detail: c.detail }
    }
    console.log(JSON.stringify(jsonOutput, null, 2))
    return
  }

  console.log('\n🔬 rolecraft doctor — System Health Check\n')

  const rows = result.checks.map((c) => [
    c.label,
    statusText(c.status),
    c.detail,
  ])

  for (const agent of result.agents || []) {
    rows.push([
      `Agent · ${agent.label}`,
      statusText('pass'),
      `${agent.skillCount} skill(s)`,
    ])
  }

  for (const m of result.mcp || []) {
    let detail = m.detail
    if (m.issues?.length > 0) {
      const issues = m.issues.map((i) => `${i.name}: ${i.issue}`).join('; ')
      detail += ` — ${issues}`
    }
    rows.push([`MCP · ${m.agent}`, statusText(m.status), detail])
  }

  for (const line of renderTable(['CHECK', 'STATUS', 'DETAIL'], rows)) {
    console.log(line)
  }

  if (result.conflicts?.length > 0) {
    console.log('\n🔍 Skill Conflict Analysis\n')
    for (const c of result.conflicts) {
      console.log(`   ${ICONS.warn} "${c.a}" ve "${c.b}" arasında çelişki:`)
      for (const sec of c.sections) {
        const quoteA = sec.a[0] || ''
        const quoteB = sec.b[0] || ''
        console.log(`       - ${sec.heading}: "${quoteA}" vs "${quoteB}"`)
      }
    }
  }

  const { passed, warnings, errors, total } = result.summary
  console.log(
    `\n📋 Summary: ${passed}/${total} passed · ${warnings} warnings · ${errors} errors\n`,
  )
}
