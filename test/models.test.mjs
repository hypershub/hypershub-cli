import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchAvailableModels, fetchModelsStrict } from '../src/lib/models.mjs'
import { modelsCommand } from '../src/commands/models.mjs'

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

test('fetchAvailableModels reads /v1/models and normalizes data array', async () => {
  globalThis.fetch = async (url, opts) => {
    assert.equal(url, 'https://example.com/v1/models')
    assert.equal(opts.headers.authorization, 'Bearer hy-test')
    return new Response(JSON.stringify({ data: [
      { id: 'gpt-5.4', provider: 'OpenAI', display_name: 'GPT 5.4', context_window: 256000 },
      { id: 'claude-sonnet-4-6' },
    ] }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const models = await fetchAvailableModels({ apiBaseUrl: 'https://example.com', key: 'hy-test', silent: true })
  assert.equal(models.length, 2)
  assert.deepEqual(models[0], {
    id: 'gpt-5.4',
    provider: 'OpenAI',
    displayName: 'GPT 5.4',
    description: '通过 HypersHub 提供的 gpt-5.4 模型',
    contextWindow: 256000,
  })
  assert.equal(models[1].provider, 'Anthropic')
})

test('fetchAvailableModels falls back when /v1/models fails', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'boom' }), { status: 500 })
  const models = await fetchAvailableModels({ apiBaseUrl: 'https://example.com', key: 'hy-test', silent: true })
  assert.ok(models.find((m) => m.id === 'gpt-5.4'))
  assert.ok(models.find((m) => m.id === 'deepseek-v4-pro'))
})


test('fetchModelsStrict throws instead of falling back', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'boom' }), { status: 401 })
  await assert.rejects(() => fetchModelsStrict({ apiBaseUrl: 'https://example.com', key: 'hy-test' }), /HTTP 401/)
})

test('modelsCommand prints json model list', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ id: 'gpt-5.5', provider: 'OpenAI' }] }), { status: 200 })
  const logs = []
  const oldLog = console.log
  console.log = (msg) => logs.push(msg)
  try {
    await modelsCommand({ flags: { url: 'https://example.com', key: 'hy-test', json: true } })
  } finally {
    console.log = oldLog
  }
  const payload = JSON.parse(logs.join('\n'))
  assert.equal(payload.count, 1)
  assert.equal(payload.models[0].id, 'gpt-5.5')
})
