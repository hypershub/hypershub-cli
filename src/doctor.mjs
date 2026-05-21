import fs from 'node:fs'
import { homePath, shellConfigFile } from './lib/paths.mjs'
import { readText } from './lib/fs-safe.mjs'

function checkExists(label, file) {
  const ok = fs.existsSync(file)
  console.log(`${ok ? '✓' : '✗'} ${label}: ${file}`)
  return ok
}

export function doctor() {
  checkExists('Codex config', homePath('.codex', 'config.toml'))
  checkExists('Codex model catalog', homePath('.codex', 'model-catalogs', 'all-models.json'))
  checkExists('OpenCode config', homePath('.config', 'opencode', 'opencode.json'))
  const rc = shellConfigFile()
  const shellText = readText(rc)
  console.log(`${shellText.includes('hypershub claude-code') ? '✓' : '✗'} Claude Code env block: ${rc}`)
  console.log(`${process.env.ANTHROPIC_BASE_URL ? '✓' : '✗'} Current ANTHROPIC_BASE_URL: ${process.env.ANTHROPIC_BASE_URL || '(not set)'}`)
}
