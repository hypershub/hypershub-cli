import { readIntegrationConfig, redactKey } from '../lib/config-readers.mjs'
import { allIntegrations } from '../integrations/index.mjs'
import { fetchModelsStrict } from '../lib/models.mjs'
import { normalizeApiBaseUrl } from '../lib/url.mjs'

function targetIds(target) {
  if (!target || target === 'all') return allIntegrations().map((i) => i.id)
  return [target]
}

function publicConfig(cfg) {
  return { ...cfg, key: redactKey(cfg.key) }
}

function statusIcon(ok) { return ok ? '✓' : '✗' }

async function liveCheck(cfg) {
  const apiBaseUrl = normalizeApiBaseUrl(cfg.baseUrl)
  if (!cfg.baseUrl || !cfg.key) return { ok: false, error: 'missing baseUrl or API key' }
  try {
    const models = await fetchModelsStrict({ apiBaseUrl, key: cfg.key })
    const ids = new Set(models.map((m) => m.id))
    return {
      ok: cfg.model ? ids.has(cfg.model) : true,
      apiBaseUrl,
      modelCount: models.length,
      modelExists: cfg.model ? ids.has(cfg.model) : null,
      error: cfg.model && !ids.has(cfg.model) ? `model not available: ${cfg.model}` : null,
    }
  } catch (err) {
    return { ok: false, apiBaseUrl, error: err.message }
  }
}

function localIssues(cfg) {
  const issues = []
  if (!cfg.exists) issues.push('config file not found')
  if (!cfg.baseUrl) issues.push('base URL not found')
  if (!cfg.key) issues.push('API key not found')
  if (!cfg.model) issues.push('default model not found')
  if (cfg.id === 'codex' && !cfg.catalogExists) issues.push('model catalog not found')
  if (cfg.id === 'claude-code' && !cfg.hasBlock) issues.push('HypersHub shell block not found')
  return issues
}

export async function checkCommand({ target = 'all', flags = {} } = {}) {
  const results = []
  for (const id of targetIds(target)) {
    const cfg = readIntegrationConfig(id)
    const issues = localIssues(cfg)
    const result = { id, localOk: issues.length === 0, issues, config: publicConfig(cfg) }
    if (flags.live) {
      const live = await liveCheck(cfg)
      result.live = live
      result.ok = result.localOk && live.ok
    } else {
      result.ok = result.localOk
    }
    results.push(result)
  }

  if (flags.json) {
    console.log(JSON.stringify({ ok: results.every((r) => r.ok), results }, null, 2))
  } else {
    for (const r of results) {
      console.log(`${statusIcon(r.ok)} ${r.id}`)
      console.log(`  config: ${r.config.files.configFile || r.config.files.profileFile}`)
      if (r.config.files.settingsFile) console.log(`  settings: ${r.config.files.settingsFile}`)
      console.log(`  url: ${r.config.baseUrl || '(missing)'}`)
      console.log(`  model: ${r.config.model || '(missing)'}`)
      console.log(`  key: ${r.config.key || '(missing)'}`)
      for (const issue of r.issues) console.log(`  ! ${issue}`)
      if (r.live) {
        console.log(`  live /v1/models: ${r.live.ok ? 'ok' : 'failed'}${r.live.modelCount ? ` (${r.live.modelCount} models)` : ''}`)
        if (r.live.modelExists !== null && r.live.modelExists !== undefined) console.log(`  live model exists: ${r.live.modelExists ? 'yes' : 'no'}`)
        if (r.live.error) console.log(`  ! ${r.live.error}`)
      }
    }
  }
  return results
}
