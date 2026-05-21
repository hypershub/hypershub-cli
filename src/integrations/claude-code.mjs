import fs from 'node:fs'
import { expandHome, homePath, shellConfigFile, shellKind } from '../lib/paths.mjs'
import { readText, writeFileSafe } from '../lib/fs-safe.mjs'
import { normalizeBaseUrl } from '../lib/url.mjs'
import { DEFAULT_CLAUDE_MODEL } from '../lib/constants.mjs'
import { testClaudeMessages } from '../lib/http-test.mjs'

const START = '# >>> hypershub claude-code >>>'
const END = '# <<< hypershub claude-code <<<'

function envBlock({ baseUrl, key, model }, kind = shellKind()) {
  const url = normalizeBaseUrl(baseUrl)
  if (kind === 'powershell') {
    const lines = [
      START,
      `[Environment]::SetEnvironmentVariable("HYPERSHUB_API_KEY", "${key}", "User")`,
      `[Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "${url}", "User")`,
      `[Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "${key}", "User")`,
      `[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "", "User")`,
      `$env:HYPERSHUB_API_KEY="${key}"`,
      `$env:ANTHROPIC_BASE_URL="${url}"`,
      `$env:ANTHROPIC_AUTH_TOKEN="${key}"`,
      '$env:ANTHROPIC_API_KEY=""',
    ]
    if (model) {
      lines.push(`[Environment]::SetEnvironmentVariable("ANTHROPIC_DEFAULT_SONNET_MODEL", "${model}", "User")`)
      lines.push(`$env:ANTHROPIC_DEFAULT_SONNET_MODEL="${model}"`)
    }
    lines.push(
      'function hy { & (Get-Command hy -CommandType Application).Source @args; if ($args[0] -eq \'init\' -and $LASTEXITCODE -eq 0) { . $PROFILE } }',
      END, '',
    )
    return lines.join('\n')
  }

  if (kind === 'fish') {
    const lines = [
      START,
      `set -gx HYPERSHUB_API_KEY "${key}"`,
      `set -gx ANTHROPIC_BASE_URL "${url}"`,
      'set -gx ANTHROPIC_AUTH_TOKEN "$HYPERSHUB_API_KEY"',
      'set -gx ANTHROPIC_API_KEY ""',
    ]
    if (model) lines.push(`set -gx ANTHROPIC_DEFAULT_SONNET_MODEL "${model}"`)
    lines.push(
      'function hy; command hy $argv; set -l _r $status; if test (count $argv) -gt 0; and test "$argv[1]" = init; and test $_r -eq 0; source ~/.config/fish/config.fish; end; return $_r; end',
      END, '',
    )
    return lines.join('\n')
  }

  const lines = [
    START,
    `export HYPERSHUB_API_KEY="${key}"`,
    `export ANTHROPIC_BASE_URL="${url}"`,
    'export ANTHROPIC_AUTH_TOKEN="$HYPERSHUB_API_KEY"',
    'export ANTHROPIC_API_KEY=""',
  ]
  if (model) lines.push(`export ANTHROPIC_DEFAULT_SONNET_MODEL="${model}"`)
  lines.push(
    'hy() { command hy "$@"; local _r=$?; [[ "$1" == "init" ]] && [[ $_r -eq 0 ]] && source "${ZDOTDIR:-$HOME}/.zshrc" 2>/dev/null; return $_r; }',
    END, '',
  )
  return lines.join('\n')
}


function claudeSettingsFile() {
  return process.env.HY_CLAUDE_SETTINGS || homePath('.claude', 'settings.json')
}

function readJsonFile(file) {
  try { return JSON.parse(readText(file)) } catch { return {} }
}

export function syncClaudeSettings({ baseUrl, key, model }) {
  const file = claudeSettingsFile()
  const settings = readJsonFile(file)
  const env = { ...(settings.env || {}) }
  const url = normalizeBaseUrl(baseUrl)

  env.HYPERSHUB_API_KEY = key
  env.ANTHROPIC_BASE_URL = url
  env.ANTHROPIC_AUTH_TOKEN = key
  env.ANTHROPIC_API_KEY = ''

  // Claude Code and cc-switch variants may read different default model env keys.
  // Keep them aligned so /model and the welcome screen do not show a stale cc-switch model.
  if (model) {
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = model
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = model
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = model
    env.ANTHROPIC_DEFAULT_SONNET_MODEL_NAME = model
    env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME = model
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME = model
  }

  settings.env = env
  settings.experimental = { ...(settings.experimental || {}), disableModelValidation: true }
  writeFileSafe(file, `${JSON.stringify(settings, null, 2)}\n`)
  try { fs.chmodSync(file, 0o600) } catch {}
  console.log(`✓ Claude Code settings synchronized: ${file}`)
}

function reloadHint(file, kind = shellKind()) {
  if (kind === 'powershell') return `  Restart PowerShell, or run: . "${file}"\n  (Future runs of 'hy init' will reload automatically)`
  return `  Run: source ${file}\n  (Future runs of 'hy init' will reload automatically)`
}

async function init(opts) {
  const file = process.env.HY_SHELL_RC ? expandHome(process.env.HY_SHELL_RC) : shellConfigFile()
  const old = readText(file)
  const re = /# >>> hypershub claude-code >>>[\s\S]*?# <<< hypershub claude-code <<<\n?/m
  const block = envBlock(opts)
  const next = re.test(old) ? old.replace(re, block) : `${old.trimEnd()}\n\n${block}`
  writeFileSafe(file, next)
  console.log(`✓ Claude Code environment configured: ${file}`)
  syncClaudeSettings(opts)
  console.log(reloadHint(file))
}

export const claudeCodeIntegration = {
  id: 'claude-code',
  defaultModel: DEFAULT_CLAUDE_MODEL,
  init,
  test: testClaudeMessages,
}

export const __test__ = { envBlock, reloadHint, syncClaudeSettings, claudeSettingsFile }
