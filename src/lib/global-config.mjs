import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { DEFAULT_BASE_URL } from './constants.mjs'
import { normalizeApiBaseUrl, normalizeBaseUrl } from './url.mjs'
import { redactKey } from './config-readers.mjs'

const ALLOWED_KEYS = new Set(['baseUrl', 'apiBaseUrl', 'apiKey', 'defaultModel'])

function envConfigDir() {
  return process.env.HYPERSHUB_CONFIG_DIR || process.env.HY_CONFIG_DIR || ''
}

export function configDir() {
  if (envConfigDir()) return envConfigDir()
  if (process.platform === 'win32' || process.env.HY_PLATFORM === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(appData, 'HypersHub')
  }
  const xdg = process.env.XDG_CONFIG_HOME
  if (xdg) return path.join(xdg, 'hypershub')
  return path.join(os.homedir(), '.hypershub')
}

export function configPath() {
  return process.env.HYPERSHUB_CONFIG_FILE || process.env.HY_CONFIG_FILE || path.join(configDir(), 'config.json')
}

export function emptyConfig() {
  return { baseUrl: DEFAULT_BASE_URL }
}

export function readGlobalConfig() {
  const file = configPath()
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    return { ...emptyConfig(), ...parsed }
  } catch {
    return emptyConfig()
  }
}

export function writeGlobalConfig(config) {
  const file = configPath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const clean = {}
  for (const [key, value] of Object.entries(config)) {
    if (ALLOWED_KEYS.has(key) && value !== undefined && value !== null && value !== '') clean[key] = value
  }
  if (!clean.baseUrl && clean.apiBaseUrl) clean.baseUrl = normalizeBaseUrl(clean.apiBaseUrl)
  fs.writeFileSync(file, `${JSON.stringify(clean, null, 2)}\n`, { mode: 0o600 })
  try { fs.chmodSync(file, 0o600) } catch {}
  return file
}

export function normalizeConfigKey(key) {
  const map = {
    url: 'baseUrl',
    base: 'baseUrl',
    base_url: 'baseUrl',
    baseURL: 'baseUrl',
    apiBaseUrl: 'apiBaseUrl',
    api_base_url: 'apiBaseUrl',
    apiKey: 'apiKey',
    api_key: 'apiKey',
    key: 'apiKey',
    token: 'apiKey',
    model: 'defaultModel',
    default_model: 'defaultModel',
    defaultModel: 'defaultModel',
  }
  return map[key] || key
}

export function assertConfigKey(key) {
  const normalized = normalizeConfigKey(key)
  if (!ALLOWED_KEYS.has(normalized)) throw new Error(`Unknown config key: ${key}. Supported keys: baseUrl, apiBaseUrl, apiKey, defaultModel`)
  return normalized
}

export function setConfigValue(key, value) {
  const normalized = assertConfigKey(key)
  const cfg = readGlobalConfig()
  if (normalized === 'baseUrl') {
    cfg.baseUrl = normalizeBaseUrl(value)
    cfg.apiBaseUrl = normalizeApiBaseUrl(value)
  } else if (normalized === 'apiBaseUrl') {
    cfg.apiBaseUrl = normalizeApiBaseUrl(value)
    cfg.baseUrl = normalizeBaseUrl(value)
  } else {
    cfg[normalized] = value
  }
  writeGlobalConfig(cfg)
  return { key: normalized, value: cfg[normalized], config: cfg }
}

export function unsetConfigValue(key) {
  const normalized = assertConfigKey(key)
  const cfg = readGlobalConfig()
  delete cfg[normalized]
  if (normalized === 'baseUrl') delete cfg.apiBaseUrl
  if (normalized === 'apiBaseUrl') delete cfg.baseUrl
  writeGlobalConfig(cfg)
  return { key: normalized, config: cfg }
}


export function saveCommonOptions({ baseUrl, apiBaseUrl, key, model } = {}) {
  const cfg = readGlobalConfig()
  if (baseUrl || apiBaseUrl) {
    const rawUrl = apiBaseUrl || baseUrl
    cfg.baseUrl = normalizeBaseUrl(rawUrl)
    cfg.apiBaseUrl = normalizeApiBaseUrl(rawUrl)
  }
  if (key) cfg.apiKey = key
  if (model) cfg.defaultModel = model
  writeGlobalConfig(cfg)
  return cfg
}

export function resolveCommonOptions(flags = {}) {
  const cfg = readGlobalConfig()
  const rawUrl = flags.url || process.env.HYPERSHUB_BASE_URL || process.env.HYPERSHUB_API_BASE_URL || cfg.apiBaseUrl || cfg.baseUrl || DEFAULT_BASE_URL
  const key = flags.key || process.env.HYPERSHUB_API_KEY || cfg.apiKey || ''
  const model = flags.model || process.env.HYPERSHUB_DEFAULT_MODEL || cfg.defaultModel || ''
  return {
    config: cfg,
    baseUrl: normalizeBaseUrl(rawUrl),
    apiBaseUrl: normalizeApiBaseUrl(rawUrl),
    key,
    model,
  }
}

export function publicGlobalConfig(config = readGlobalConfig(), { showSecrets = false } = {}) {
  return {
    baseUrl: config.baseUrl || '',
    apiBaseUrl: config.apiBaseUrl || (config.baseUrl ? normalizeApiBaseUrl(config.baseUrl) : ''),
    apiKey: showSecrets ? (config.apiKey || '') : redactKey(config.apiKey),
    defaultModel: config.defaultModel || '',
  }
}

export function formatConfigValue(key, value, { showSecrets = false } = {}) {
  if (key === 'apiKey' && !showSecrets) return redactKey(value) || ''
  return value || ''
}
