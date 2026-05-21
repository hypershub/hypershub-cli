import fs from 'node:fs'
import { homePath, shellConfigFile } from './paths.mjs'
import { readText } from './fs-safe.mjs'

function exists(file) {
  return fs.existsSync(file)
}

function matchValue(text, re) {
  const m = text.match(re)
  return m ? m[1] : null
}

export function readCodexConfig() {
  const configFile = homePath('.codex', 'config.toml')
  const catalogFile = homePath('.codex', 'model-catalogs', 'all-models.json')
  const text = readText(configFile)
  let catalogModels = []
  try {
    const catalog = JSON.parse(readText(catalogFile))
    catalogModels = Array.isArray(catalog.models) ? catalog.models.map((m) => m.slug).filter(Boolean) : []
  } catch {}
  return {
    id: 'codex',
    files: { configFile, catalogFile },
    exists: exists(configFile),
    catalogExists: exists(catalogFile),
    model: matchValue(text, /^model\s*=\s*"([^"]+)"/m),
    provider: matchValue(text, /^model_provider\s*=\s*"([^"]+)"/m),
    baseUrl: matchValue(text, /^base_url\s*=\s*"([^"]+)"/m),
    key: matchValue(text, /^experimental_bearer_token\s*=\s*"([^"]+)"/m),
    catalogModels,
  }
}

export function readOpenCodeConfig() {
  const file = homePath('.config', 'opencode', 'opencode.json')
  try {
    const cfg = JSON.parse(readText(file))
    const provider = cfg.provider?.hypershub
    return {
      id: 'opencode',
      files: { configFile: file },
      exists: exists(file),
      model: typeof cfg.model === 'string' ? cfg.model.replace(/^hypershub\//, '') : null,
      baseUrl: provider?.options?.baseURL || null,
      key: provider?.options?.apiKey || null,
      catalogModels: provider?.models ? Object.keys(provider.models) : [],
    }
  } catch {
    return { id: 'opencode', files: { configFile: file }, exists: exists(file), model: null, baseUrl: null, key: null, catalogModels: [] }
  }
}


function readClaudeSettings() {
  const file = process.env.HY_CLAUDE_SETTINGS || homePath('.claude', 'settings.json')
  try {
    const settings = JSON.parse(readText(file))
    return { file, exists: exists(file), env: settings.env || {} }
  } catch {
    return { file, exists: exists(file), env: {} }
  }
}

export function readClaudeCodeConfig() {
  const file = shellConfigFile()
  const text = readText(file)
  const settings = readClaudeSettings()
  return {
    id: 'claude-code',
    files: { profileFile: file, settingsFile: settings.file },
    exists: exists(file) || settings.exists,
    profileExists: exists(file),
    settingsExists: settings.exists,
    hasBlock: text.includes('hypershub claude-code'),
    model: settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL || matchValue(text, /ANTHROPIC_DEFAULT_SONNET_MODEL[^"]*"([^"]+)"/),
    baseUrl: settings.env.ANTHROPIC_BASE_URL || matchValue(text, /ANTHROPIC_BASE_URL[^"]*"([^"]+)"/),
    key: settings.env.HYPERSHUB_API_KEY || settings.env.ANTHROPIC_AUTH_TOKEN || matchValue(text, /(?:HYPERSHUB_API_KEY|ANTHROPIC_AUTH_TOKEN)[^"]*"(hy-[^"]+)"/),
    settingsModels: Object.fromEntries(Object.entries(settings.env).filter(([k]) => k.includes('DEFAULT') && k.includes('MODEL'))),
  }
}

export function readIntegrationConfig(target) {
  if (target === 'codex') return readCodexConfig()
  if (target === 'opencode') return readOpenCodeConfig()
  if (target === 'claude-code') return readClaudeCodeConfig()
  throw new Error(`Unknown config target: ${target}`)
}

export function redactKey(key) {
  if (!key) return key
  return /^hy-[A-Za-z0-9_-]{8,}$/.test(key) ? `${key.slice(0, 3)}****${key.slice(-4)}` : '****'
}
