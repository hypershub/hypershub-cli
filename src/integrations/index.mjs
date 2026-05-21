import { codexIntegration } from './codex.mjs'
import { claudeCodeIntegration } from './claude-code.mjs'
import { opencodeIntegration } from './opencode.mjs'

export const integrations = new Map([
  [codexIntegration.id, codexIntegration],
  [claudeCodeIntegration.id, claudeCodeIntegration],
  [opencodeIntegration.id, opencodeIntegration],
])

export function getIntegration(id) {
  return integrations.get(id)
}

export function allIntegrations() {
  return [...integrations.values()]
}
