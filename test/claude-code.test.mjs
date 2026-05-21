import test from 'node:test'
import assert from 'node:assert/strict'
import { __test__ } from '../src/integrations/claude-code.mjs'

test('claude-code renders POSIX env block', () => {
  const block = __test__.envBlock({ baseUrl: 'https://apiclaw.cc/v1', key: 'hy-test', model: 'claude-sonnet-4-6' }, 'posix')
  assert.match(block, /export ANTHROPIC_BASE_URL="https:\/\/apiclaw.cc"/)
  assert.match(block, /export ANTHROPIC_AUTH_TOKEN="\$HYPERSHUB_API_KEY"/)
})

test('claude-code renders fish env block', () => {
  const block = __test__.envBlock({ baseUrl: 'https://apiclaw.cc', key: 'hy-test', model: 'claude-sonnet-4-6' }, 'fish')
  assert.match(block, /set -gx ANTHROPIC_BASE_URL "https:\/\/apiclaw.cc"/)
})

test('claude-code renders PowerShell user env block', () => {
  const block = __test__.envBlock({ baseUrl: 'https://apiclaw.cc', key: 'hy-test', model: 'claude-sonnet-4-6' }, 'powershell')
  assert.match(block, /SetEnvironmentVariable\("ANTHROPIC_BASE_URL", "https:\/\/apiclaw.cc", "User"\)/)
  assert.match(block, /\$env:ANTHROPIC_AUTH_TOKEN="hy-test"/)
  assert.match(__test__.reloadHint('C:/Users/me/Documents/PowerShell/Microsoft.PowerShell_profile.ps1', 'powershell'), /Restart PowerShell/)
})

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

test('claude-code syncs settings.json for cc-switch compatibility', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hy-claude-settings-'))
  const settings = path.join(dir, 'settings.json')
  process.env.HY_CLAUDE_SETTINGS = settings
  try {
    fs.writeFileSync(settings, JSON.stringify({ env: { ANTHROPIC_DEFAULT_SONNET_MODEL: 'gpt-5.5' } }))
    __test__.syncClaudeSettings({ baseUrl: 'https://apiclaw.cc/v1', key: 'hy-test', model: 'claude-deepseek-v4-pro' })
    const cfg = JSON.parse(fs.readFileSync(settings, 'utf8'))
    assert.equal(cfg.env.ANTHROPIC_BASE_URL, 'https://apiclaw.cc')
    assert.equal(cfg.env.ANTHROPIC_DEFAULT_SONNET_MODEL, 'claude-deepseek-v4-pro')
    assert.equal(cfg.env.ANTHROPIC_DEFAULT_OPUS_MODEL, 'claude-deepseek-v4-pro')
    assert.equal(cfg.env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME, 'claude-deepseek-v4-pro')
    assert.equal(cfg.experimental.disableModelValidation, true)
  } finally {
    delete process.env.HY_CLAUDE_SETTINGS
  }
})
