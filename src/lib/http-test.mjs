import { DEFAULT_ANTHROPIC_VERSION } from './constants.mjs'
import { normalizeApiBaseUrl, normalizeBaseUrl } from './url.mjs'

async function postJson(url, headers, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  if (!res.ok) {
    const msg = typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300)
    throw new Error(`HTTP ${res.status}: ${msg}`)
  }
  return data
}

export async function testOpenAICompatible({ apiBaseUrl, key, model }) {
  const url = `${normalizeApiBaseUrl(apiBaseUrl)}/responses`
  await postJson(url, { authorization: `Bearer ${key}` }, {
    model,
    input: 'Reply with OK only.',
    max_output_tokens: 16,
  })
  console.log(`✓ /v1/responses test passed (${model})`)
}

export async function testClaudeMessages({ baseUrl, apiBaseUrl, key, model }) {
  const url = `${normalizeBaseUrl(baseUrl || apiBaseUrl)}/v1/messages`
  await postJson(url, { 'x-api-key': key, 'anthropic-version': DEFAULT_ANTHROPIC_VERSION }, {
    model,
    max_tokens: 16,
    messages: [{ role: 'user', content: 'Reply with OK only.' }],
  })
  console.log(`✓ /v1/messages test passed (${model})`)
}
