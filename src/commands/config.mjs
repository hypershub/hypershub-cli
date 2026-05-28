import { configPath, publicGlobalConfig, readGlobalConfig, setConfigValue, unsetConfigValue, assertConfigKey, formatConfigValue } from '../lib/global-config.mjs'

function printRows(rows) {
  const keyWidth = Math.max(3, ...rows.map(([k]) => k.length))
  for (const [key, value] of rows) console.log(`${key.padEnd(keyWidth)}  ${value || '(unset)'}`)
}

function configUsage() {
  console.log(`Usage:
  hy config list [--show-secrets] [--json]
  hy config get <key> [--show-secrets]
  hy config set <key> <value>
  hy config unset <key>
  hy config path

Keys:
  baseUrl       HypersHub base URL, for example https://hypershub.com
  apiBaseUrl    OpenAI-compatible API URL; normalized with /v1
  apiKey        HypersHub API key
  defaultModel  Default model used by commands when --model is omitted
`)
}

export async function configCommand({ action = 'list', key, value, flags = {} } = {}) {
  const showSecrets = Boolean(flags['show-secrets'])

  if (flags.help || action === 'help') return configUsage()

  if (action === 'path') {
    console.log(configPath())
    return configPath()
  }

  if (action === 'list' || !action) {
    const cfg = publicGlobalConfig(readGlobalConfig(), { showSecrets })
    if (flags.json) console.log(JSON.stringify({ path: configPath(), config: cfg }, null, 2))
    else {
      console.log(`Config file: ${configPath()}`)
      printRows(Object.entries(cfg))
    }
    return cfg
  }

  if (action === 'get') {
    if (!key) throw new Error('Missing config key. Usage: hy config get <key>')
    const normalized = assertConfigKey(key)
    const cfg = readGlobalConfig()
    const publicCfg = publicGlobalConfig(cfg, { showSecrets })
    const output = publicCfg[normalized] || ''
    if (flags.json) console.log(JSON.stringify({ key: normalized, value: output }, null, 2))
    else console.log(output)
    return output
  }

  if (action === 'set') {
    if (!key) throw new Error('Missing config key. Usage: hy config set <key> <value>')
    if (value === undefined) throw new Error('Missing config value. Usage: hy config set <key> <value>')
    const result = setConfigValue(key, value)
    const shown = formatConfigValue(result.key, result.value, { showSecrets })
    if (flags.json) console.log(JSON.stringify({ path: configPath(), key: result.key, value: shown }, null, 2))
    else console.log(`✓ ${result.key} set to ${shown || '(unset)'}`)
    return result
  }

  if (action === 'unset') {
    if (!key) throw new Error('Missing config key. Usage: hy config unset <key>')
    const result = unsetConfigValue(key)
    if (flags.json) console.log(JSON.stringify({ path: configPath(), key: result.key, unset: true }, null, 2))
    else console.log(`✓ ${result.key} unset`)
    return result
  }

  throw new Error(`Unknown config action: ${action}`)
}
