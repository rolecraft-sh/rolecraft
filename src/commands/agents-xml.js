import { agentsXmlApi } from '../api/agents-xml.js'

export async function agentsXmlCommand(writeToFile = false) {
  const result = await agentsXmlApi(writeToFile)

  if (!result.xml) {
    console.log('No skills found in lockfile.')
    return
  }

  if (result.written) {
    console.log(`✅ Wrote skills XML to ${result.path}`)
  } else {
    console.log(result.xml)
  }
}
