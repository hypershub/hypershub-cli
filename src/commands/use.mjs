import { readIntegrationConfig, redactKey } from '../lib/config-readers.mjs'
import { readText, writeFileSafe } from '../lib/fs-safe.mjs'
import { shellKind } from '../lib/paths.mjs'
import { fetchModelsStrict, inferProvider } from '../lib/models.mjs'
import { normalizeApiBaseUrl } from '../lib/url.mjs'
import { allIntegrations } from '../integrations/index.mjs'
import { syncClaudeSettings } from '../integrations/claude-code.mjs'

function targetIds(target) {
  if (!target || target === 'all') return allIntegrations().map((i) => i.id)
  return [target]
}

async function assertModelAvailable(cfg, model) {
  if (!cfg.baseUrl || !cfg.key) throw new Error(`${cfg.id}: missing base URL or API key; run hy init ${cfg.id} first`)
  const models = await fetchModelsStrict({ apiBaseUrl: normalizeApiBaseUrl(cfg.baseUrl), key: cfg.key })
  if (!models.some((m) => m.id === model)) throw new Error(`${cfg.id}: model is not available for this API key: ${model}`)
  return models
}

function minimalCodexModel(model, index = 0) {
  return {
    slug: model,
    display_name: `${model} (HypersHub)`,
    description: `通过 HypersHub 提供的 ${model} 模型`,
    default_reasoning_level: 'medium',
    supported_reasoning_levels: [
      { effort: 'low', description: 'Fast responses with lighter reasoning' },
      { effort: 'medium', description: 'Balances speed and reasoning depth for everyday tasks' },
      { effort: 'high', description: 'Greater reasoning depth for complex problems' },
    ],
    shell_type: 'shell_command',
    visibility: 'list',
    supported_in_api: true,
    priority: Math.max(1, 100 - index),
    context_window: 128000,
    max_context_window: 128000,
    supports_parallel_tool_calls: true,
    input_modalities: ['text', 'image'],
    supports_search_tool: true,
  }
}

function updateCodex(cfg, model, models) {
  if (!cfg.exists) throw new Error('codex: config not found; run hy init codex first')
  const configFile = cfg.files.configFile
  const old = readText(configFile)
  const next = /^model\s*=\s*"[^"]*"/m.test(old)
    ? old.replace(/^model\s*=\s*"[^"]*"/m, `model = "${model}"`)
    : `model = "${model}"\n${old}`
  writeFileSafe(configFile, next)

  const catalogFile = cfg.files.catalogFile
  let catalog
  try { catalog = JSON.parse(readText(catalogFile)) } catch { catalog = { models: [] } }
  if (!Array.isArray(catalog.models)) catalog.models = []
  const existing = new Set(catalog.models.map((m) => m.slug).filter(Boolean))
  const sourceModels = models?.length ? models : [{ id: model }]
  for (const [index, m] of sourceModels.entries()) {
    if (!existing.has(m.id)) {
      catalog.models.push({ ...minimalCodexModel(m.id, index), display_name: m.displayName || `${m.id} (HypersHub)`, context_window: m.contextWindow || 128000, max_context_window: m.contextWindow || 128000 })
      existing.add(m.id)
    }
  }
  if (!existing.has(model)) catalog.models.push(minimalCodexModel(model, catalog.models.length))
  writeFileSafe(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`)
}

function updateOpenCode(cfg, model, models) {
  if (!cfg.exists) throw new Error('opencode: config not found; run hy init opencode first')
  const file = cfg.files.configFile
  const json = JSON.parse(readText(file))
  json.model = `hypershub/${model}`
  json.provider ??= {}
  json.provider.hypershub ??= { npm: '@ai-sdk/openai-compatible', name: 'HypersHub', options: {}, models: {} }
  json.provider.hypershub.models ??= {}
  const sourceModels = models?.length ? models : [{ id: model }]
  for (const m of sourceModels) {
    json.provider.hypershub.models[m.id] ??= { name: m.displayName || m.id, id: m.id }
  }
  json.provider.hypershub.models[model] ??= { name: model, id: model }
  writeFileSafe(file, `${JSON.stringify(json, null, 2)}\n`)
}

function replaceOrAppend(text, re, line) {
  return re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`
}

function updateClaudeProfile(cfg, model) {
  if (!cfg.exists) throw new Error('claude-code: config not found; run hy init claude-code first')
  const file = cfg.files.profileFile
  let text = readText(file)
  const kind = shellKind()
  if (kind === 'fish') {
    text = replaceOrAppend(text, /^set -gx ANTHROPIC_DEFAULT_SONNET_MODEL\s+"[^"]*"/m, `set -gx ANTHROPIC_DEFAULT_SONNET_MODEL "${model}"`)
  } else if (kind === 'powershell') {
    text = replaceOrAppend(text, /^\$env:ANTHROPIC_DEFAULT_SONNET_MODEL="[^"]*"/m, `$env:ANTHROPIC_DEFAULT_SONNET_MODEL="${model}"`)
  } else {
    text = replaceOrAppend(text, /^export ANTHROPIC_DEFAULT_SONNET_MODEL="[^"]*"/m, `export ANTHROPIC_DEFAULT_SONNET_MODEL="${model}"`)
  }
  writeFileSafe(file, text)
}

function updateClaudeCode(cfg, model) {
  updateClaudeProfile(cfg, model)
  syncClaudeSettings({ baseUrl: cfg.baseUrl, key: cfg.key, model })
}

function updateOne(id, cfg, model, models) {
  if (id === 'codex') updateCodex(cfg, model, models)
  else if (id === 'opencode') updateOpenCode(cfg, model, models)
  else if (id === 'claude-code') updateClaudeCode(cfg, model)
  else throw new Error(`Unknown target: ${id}`)
}

export async function useCommand({ model, target = 'all', flags = {} } = {}) {
  if (!model) throw new Error('Missing model. Usage: hy use <model> [target|all] [--live]')
  const results = []
  for (const id of targetIds(target)) {
    const cfg = readIntegrationConfig(id)
    if (!cfg.exists) {
      results.push({ id, ok: false, skipped: true, error: 'not configured' })
      continue
    }
    try {
      const models = flags.live ? await assertModelAvailable(cfg, model) : null
      updateOne(id, cfg, model, models)
      results.push({ id, ok: true, model, key: redactKey(cfg.key) })
      if (!flags.json) console.log(`✓ ${id} default model set to ${model}`)
    } catch (err) {
      results.push({ id, ok: false, error: err.message })
      if (!flags.json) console.log(`✗ ${id}: ${err.message}`)
    }
  }
  if (!flags.json) {
    console.log('')
    console.log('Tip: restart the target app or reload your shell if it is already running.')
  } else {
    console.log(JSON.stringify({ ok: results.every((r) => r.ok || r.skipped), results }, null, 2))
  }
  return results
}
