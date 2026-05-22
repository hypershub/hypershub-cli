import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { configCommand } from '../src/commands/config.mjs'
import { configPath, readGlobalConfig, resolveCommonOptions } from '../src/lib/global-config.mjs'
import { modelsCommand } from '../src/commands/models.mjs'

const originalEnv = { ...process.env }
const originalFetch = globalThis.fetch

function tempConfigDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hy-config-'))
  process.env.HYPERSHUB_CONFIG_DIR = dir
  delete process.env.HYPERSHUB_CONFIG_FILE
  delete process.env.HYPERSHUB_API_KEY
  delete process.env.HYPERSHUB_BASE_URL
  delete process.env.HYPERSHUB_API_BASE_URL
  delete process.env.HYPERSHUB_DEFAULT_MODEL
  return dir
}

test.afterEach(() => {
  process.env = { ...originalEnv }
  globalThis.fetch = originalFetch
})

test('config set/list/get stores config in cross-platform config file and redacts key', async () => {
  const dir = tempConfigDir()
  await configCommand({ action: 'set', key: 'baseUrl', value: 'https://example.com/v1', flags: {} })
  await configCommand({ action: 'set', key: 'apiKey', value: 'hy-1234567890abcdef', flags: {} })
  await configCommand({ action: 'set', key: 'defaultModel', value: 'gpt-5.5', flags: {} })

  assert.equal(configPath(), path.join(dir, 'config.json'))
  const cfg = readGlobalConfig()
  assert.equal(cfg.baseUrl, 'https://example.com')
  assert.equal(cfg.apiBaseUrl, 'https://example.com/v1')
  assert.equal(cfg.apiKey, 'hy-1234567890abcdef')
  assert.equal(cfg.defaultModel, 'gpt-5.5')

  const logs = []
  const oldLog = console.log
  console.log = (msg) => logs.push(msg)
  try {
    await configCommand({ action: 'list', flags: {} })
    await configCommand({ action: 'get', key: 'apiKey', flags: {} })
  } finally {
    console.log = oldLog
  }
  const out = logs.join('\n')
  assert.match(out, /hy-\*\*\*\*cdef/)
  assert.doesNotMatch(out, /hy-1234567890abcdef/)
})

test('resolveCommonOptions uses flags over env over config', async () => {
  tempConfigDir()
  await configCommand({ action: 'set', key: 'baseUrl', value: 'https://config.example', flags: {} })
  await configCommand({ action: 'set', key: 'apiKey', value: 'hy-config-key', flags: {} })
  await configCommand({ action: 'set', key: 'defaultModel', value: 'gpt-config', flags: {} })

  process.env.HYPERSHUB_API_KEY = 'hy-env-key'
  process.env.HYPERSHUB_BASE_URL = 'https://env.example/v1'
  process.env.HYPERSHUB_DEFAULT_MODEL = 'gpt-env'

  const envResolved = resolveCommonOptions({})
  assert.equal(envResolved.baseUrl, 'https://env.example')
  assert.equal(envResolved.apiBaseUrl, 'https://env.example/v1')
  assert.equal(envResolved.key, 'hy-env-key')
  assert.equal(envResolved.model, 'gpt-env')

  const flagResolved = resolveCommonOptions({ url: 'https://flag.example', key: 'hy-flag-key', model: 'gpt-flag' })
  assert.equal(flagResolved.baseUrl, 'https://flag.example')
  assert.equal(flagResolved.apiBaseUrl, 'https://flag.example/v1')
  assert.equal(flagResolved.key, 'hy-flag-key')
  assert.equal(flagResolved.model, 'gpt-flag')
})

test('modelsCommand reads api key and url from hy config without prompting', async () => {
  tempConfigDir()
  await configCommand({ action: 'set', key: 'baseUrl', value: 'https://configured.example', flags: {} })
  await configCommand({ action: 'set', key: 'apiKey', value: 'hy-configured-key', flags: {} })

  globalThis.fetch = async (url, opts) => {
    assert.equal(url, 'https://configured.example/v1/models')
    assert.equal(opts.headers.authorization, 'Bearer hy-configured-key')
    return new Response(JSON.stringify({ data: [{ id: 'gpt-5.5', provider: 'OpenAI' }] }), { status: 200 })
  }
  const models = await modelsCommand({ flags: { json: true } })
  assert.equal(models.length, 1)
})

test('config path uses APPDATA on Windows simulation', () => {
  delete process.env.HYPERSHUB_CONFIG_DIR
  delete process.env.HYPERSHUB_CONFIG_FILE
  process.env.HY_PLATFORM = 'win32'
  process.env.APPDATA = path.join(os.tmpdir(), 'AppDataRoaming')
  assert.equal(configPath(), path.join(process.env.APPDATA, 'HypersHub', 'config.json'))
})

test('hy init writes global config for future commands', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hy-init-config-home-'))
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hy-init-config-'))
  const { spawnSync } = await import('node:child_process')
  const { fileURLToPath } = await import('node:url')
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const cli = path.join(root, 'bin/hy.mjs')
  const res = spawnSync(process.execPath, [cli, 'init', 'codex', '--yes', '--url', 'https://example.com/v1', '--key', 'hy-init-key', '--model', 'gpt-5.5', '--no-backup'], {
    cwd: root,
    env: { ...process.env, HOME: home, USERPROFILE: home, HYPERSHUB_CONFIG_DIR: configDir, SHELL: '/bin/zsh' },
    encoding: 'utf8',
  })
  assert.equal(res.status, 0, res.stderr)
  assert.match(res.stdout, /Global config updated/)
  const cfg = JSON.parse(fs.readFileSync(path.join(configDir, 'config.json'), 'utf8'))
  assert.equal(cfg.baseUrl, 'https://example.com')
  assert.equal(cfg.apiBaseUrl, 'https://example.com/v1')
  assert.equal(cfg.apiKey, 'hy-init-key')
  assert.equal(cfg.defaultModel, 'gpt-5.5')
})
