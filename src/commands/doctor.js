import { apiDoctor } from '../api/doctor.js'

function icon(status) {
  return status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌'
}

export async function doctorCommand(options = {}) {
  const result = await apiDoctor(process.cwd(), options)

  if (options.json) {
    const jsonOutput = { status: result.status, checks: {}, summary: result.summary }
    for (const c of result.checks) {
      jsonOutput.checks[c.label] = { status: c.status, detail: c.detail }
    }
    console.log(JSON.stringify(jsonOutput, null, 2))
    return
  }

  console.log('\n🔬 rolecraft doctor — System Health Check\n')

  for (const c of result.checks) {
    console.log(`   ${icon(c.status)} ${c.label.padEnd(38)} ${c.detail}`)
  }

  if (result.agents?.length > 0) {
    for (const agent of result.agents) {
      const skillInfo = `${agent.skillCount} skill(s)`
      console.log(`   ${icon('pass')} ${`  └ ${agent.label}`.padEnd(38)} ${skillInfo}`)
    }
  }

  if (result.mcp?.length > 0) {
    for (const m of result.mcp) {
      let detail = m.detail
      if (m.issues) {
        for (const issue of m.issues) {
          detail += `\n       ${m.status === 'error' ? '❌' : '⚠️'} ${issue.name}: ${issue.issue}`
        }
      }
      console.log(`   ${icon(m.status)} ${`  └ ${m.agent}`.padEnd(38)} ${detail}`)
    }
  }

  const { passed, warnings, errors, total } = result.summary
  console.log(`\n📋 Summary: ${passed}/${total} passed, ${warnings} warnings, ${errors} errors\n`)
}
