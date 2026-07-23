import { apiCi } from '../api/ci.js'

export async function ciCommand() {
  const result = await apiCi(process.cwd())

  if (result.total === 0) {
    console.log('No skills or MCP servers in lockfile to install.')
    return
  }

  if (result.skillCount > 0) {
    console.log(
      `\n🔒 Installing ${result.skillCount} skill(s) from lockfile...\n`,
    )
    for (const inst of result.installed) {
      console.log(`   ✅ ${inst.slug} installed`)
    }
    for (const f of result.failed) {
      console.error(`   ❌ ${f.slug}: ${f.reason}`)
    }
    console.log()
  }

  if (result.mcpCount > 0) {
    console.log(
      `🔌 Installing ${result.mcpCount} MCP server(s) from lockfile...\n`,
    )
    for (const inst of result.mcpInstalled) {
      console.log(
        `   ✅ ${inst.name} installed to ${inst.agents.length} agent(s)`,
      )
    }
    for (const f of result.mcpFailed) {
      console.error(`   ❌ ${f.name}: ${f.reason}`)
    }
    console.log()
  }

  if (result.allPassed) {
    console.log(`✅ All ${result.total} item(s) installed from lockfile.`)
  } else {
    throw new Error('Some items failed to install.')
  }
}
