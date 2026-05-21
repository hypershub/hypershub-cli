import test from 'node:test'
import assert from 'node:assert/strict'
import { testOpenAICompatible, testClaudeMessages } from '../src/lib/http-test.mjs'

const originalFetch = globalThis.fetch
let logs = []
const originalLog = console.log

test.beforeEach(() => {
  logs = []
  console.log = (...args) => logs.push(args.join(' '))
})

test.afterEach(() => {
  globalThis.fetch = originalFetch
  console.log = originalLog
})

test('testOpenAICompatible posts to /v1/responses', async () => {
  globalThis.fetch = async (url, opts) => {
    assert.equal(url, 'https://example.com/v1/responses')
    assert.equal(opts.method, 'POST')
    assert.equal(opts.headers.authorization, 'Bearer hy-test')
    assert.deepEqual(JSON.parse(opts.body), {
      model: 'gpt-5.4',
      input: 'Reply with OK only.',
      max_output_tokens: 16,
    })
    return new Response(JSON.stringify({ output_text: 'OK' }), { status: 200 })
  }
  await testOpenAICompatible({ apiBaseUrl: 'https://example.com', key: 'hy-test', model: 'gpt-5.4' })
  assert.match(logs.join('\n'), /responses test passed/)
})

test('testClaudeMessages posts to /v1/messages', async () => {
  globalThis.fetch = async (url, opts) => {
    assert.equal(url, 'https://example.com/v1/messages')
    assert.equal(opts.method, 'POST')
    assert.equal(opts.headers['x-api-key'], 'hy-test')
    assert.equal(opts.headers['anthropic-version'], '2023-06-01')
    assert.deepEqual(JSON.parse(opts.body), {
      model: 'claude-sonnet-4-6',
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Reply with OK only.' }],
    })
    return new Response(JSON.stringify({ content: [{ type: 'text', text: 'OK' }] }), { status: 200 })
  }
  await testClaudeMessages({ baseUrl: 'https://example.com/v1', key: 'hy-test', model: 'claude-sonnet-4-6' })
  assert.match(logs.join('\n'), /messages test passed/)
})

test('test helpers throw on non-2xx responses', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'bad key' }), { status: 401 })
  await assert.rejects(
    () => testOpenAICompatible({ apiBaseUrl: 'https://example.com', key: 'hy-bad', model: 'gpt-5.4' }),
    /HTTP 401/,
  )
})
