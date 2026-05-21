import { DEFAULT_API_BASE_URL, DEFAULT_BASE_URL } from './constants.mjs'

export function normalizeApiBaseUrl(url) {
  const trimmed = String(url || DEFAULT_API_BASE_URL).replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

export function normalizeBaseUrl(url) {
  const trimmed = String(url || DEFAULT_BASE_URL).replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? trimmed.slice(0, -3) : trimmed
}
