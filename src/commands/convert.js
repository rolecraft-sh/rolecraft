import { convertApi } from '../api/convert.js'

export async function convertCommand(source, options = {}) {
  const results = await convertApi(source, options)

  for (const item of results) {
    if (item.dryRun) {
      console.log(`  Would convert: ${item.from}`)
      console.log(`  To:           ${item.to}`)
    } else {
      console.log(`  Converted:    ${item.from}`)
      console.log(`  To:           ${item.to}`)
    }
  }
}
