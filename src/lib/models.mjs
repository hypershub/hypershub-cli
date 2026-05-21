import { normalizeApiBaseUrl } from './url.mjs'

export const FALLBACK_MODELS = [
  { id: 'gpt-5.4', provider: 'OpenAI', context_window: 128000 },
  { id: 'deepseek-v4-pro', provider: 'DeepSeek', context_window: 128000 },
]

function pickArray(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.models)) return payload.models
  return []
}

function normalizeModel(item) {
  const id = item?.id || item?.slug || item?.model || item?.name
  if (!id || typeof id !== 'string') return null
  return {
    id,
    provider: item.provider || item.owned_by || item.vendor || item.provider_name || inferProvider(id),
    displayName: item.display_name || item.displayName || item.name || id,
    description: item.description || `通过 HypersHub 提供的 ${id} 模型`,
    contextWindow: Number(item.context_window || item.contextWindow || item.max_context_window || item.maxContextWindow || 128000),
  }
}

export function inferProvider(id) {
  const s = id.toLowerCase()
  if (s.includes('claude')) return 'Anthropic'
  if (s.includes('deepseek')) return 'DeepSeek'
  if (s.includes('gemini')) return 'Google'
  if (s.includes('gpt') || s.includes('openai')) return 'OpenAI'
  return 'HypersHub'
}

export async function fetchModelsStrict({ apiBaseUrl, key } = {}) {
  const url = `${normalizeApiBaseUrl(apiBaseUrl)}/models`
  const res = await fetch(url, { headers: { authorization: `Bearer ${key}` } })
  const text = await res.text()
  let payload
  try { payload = JSON.parse(text) } catch { payload = null }
  if (!res.ok) {
    const msg = payload ? JSON.stringify(payload).slice(0, 200) : text.slice(0, 200)
    throw new Error(`HTTP ${res.status}: ${msg}`)
  }
  const models = pickArray(payload).map(normalizeModel).filter(Boolean)
  const deduped = [...new Map(models.map((m) => [m.id, m])).values()]
  if (deduped.length === 0) throw new Error('empty model list')
  return deduped
}

export async function fetchAvailableModels({ apiBaseUrl, key, silent = false } = {}) {
  try {
    const deduped = await fetchModelsStrict({ apiBaseUrl, key })
    if (!silent) console.log(`✓ Fetched ${deduped.length} available models from /v1/models`)
    return deduped
  } catch (err) {
    if (!silent) console.log(`! Could not fetch /v1/models, using fallback models: ${err.message}`)
    return FALLBACK_MODELS.map(normalizeModel)
  }
}
