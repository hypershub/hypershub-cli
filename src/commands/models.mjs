import { DEFAULT_API_BASE_URL } from '../lib/constants.mjs'
import { fetchModelsStrict } from '../lib/models.mjs'
import { normalizeApiBaseUrl } from '../lib/url.mjs'

function table(models) {
  const rows = models.map((m) => ({
    id: m.id,
    provider: m.provider || '',
    context: m.contextWindow || '',
  }))
  const widths = {
    id: Math.max(2, ...rows.map((r) => r.id.length)),
    provider: Math.max(8, ...rows.map((r) => String(r.provider).length)),
    context: Math.max(7, ...rows.map((r) => String(r.context).length)),
  }
  const line = (id, provider, context) => `${String(id).padEnd(widths.id)}  ${String(provider).padEnd(widths.provider)}  ${String(context).padStart(widths.context)}`
  console.log(line('ID', 'Provider', 'Context'))
  console.log(line('-'.repeat(widths.id), '-'.repeat(widths.provider), '-'.repeat(widths.context)))
  for (const r of rows) console.log(line(r.id, r.provider, r.context))
}

export async function modelsCommand({ flags = {}, prompter } = {}) {
  const apiBaseUrl = normalizeApiBaseUrl(flags.url || DEFAULT_API_BASE_URL)
  let key = flags.key || process.env.HYPERSHUB_API_KEY || ''
  if (!key && prompter) key = await prompter.text('key', 'API Key', '', { secret: true })
  if (!key) throw new Error('API Key is required. Pass --key hy-xxx or set HYPERSHUB_API_KEY.')
  const models = await fetchModelsStrict({ apiBaseUrl, key })
  if (flags.json) console.log(JSON.stringify({ apiBaseUrl, count: models.length, models }, null, 2))
  else {
    console.log(`✓ ${models.length} models available from ${apiBaseUrl}/models`)
    table(models)
  }
  return models
}
