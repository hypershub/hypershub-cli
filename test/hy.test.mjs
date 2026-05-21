import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CLI = path.join(ROOT, 'bin/hy.mjs')

function run(args, env = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hy-cli-test-'))
  const res = spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    env: { ...process.env, HOME: home, USERPROFILE: home, SHELL: '/bin/zsh', ...env },
    encoding: 'utf8',
  })
  return { ...res, home }
}

test('init codex writes config and catalog', () => {
  const res = run(['init', 'codex', '--yes', '--url', 'https://example.com/v1', '--key', 'hy-test', '--model', 'gpt-5.4', '--no-backup'])
  assert.equal(res.status, 0, res.stderr)
  const config = fs.readFileSync(path.join(res.home, '.codex/config.toml'), 'utf8')
  assert.match(config, /model_provider = "hypershub"/)
  assert.match(config, /base_url = "https:\/\/example.com\/v1"/)
  assert.match(config, /experimental_bearer_token = "hy-test"/)
  const catalog = JSON.parse(fs.readFileSync(path.join(res.home, '.codex/model-catalogs/all-models.json'), 'utf8'))
  assert.ok(catalog.models.find((m) => m.slug === 'gpt-5.4'))
})

test('init claude-code is idempotent', () => {
  const env = { HY_SHELL_RC: '~/.zshrc' }
  let res = run(['init', 'claude-code', '--yes', '--url', 'https://example.com', '--key', 'hy-test', '--model', 'claude-sonnet-4-6', '--no-backup'], env)
  assert.equal(res.status, 0, res.stderr)
  const home = res.home
  res = spawnSync(process.execPath, [CLI, 'init', 'claude-code', '--yes', '--url', 'https://example.org', '--key', 'hy-test2', '--model', 'claude-opus-4-7', '--no-backup'], {
    cwd: ROOT,
    env: { ...process.env, HOME: home, USERPROFILE: home, SHELL: '/bin/zsh', ...env },
    encoding: 'utf8',
  })
  assert.equal(res.status, 0, res.stderr)
  const rc = fs.readFileSync(path.join(home, '.zshrc'), 'utf8')
  assert.equal((rc.match(/hypershub claude-code/g) || []).length, 2)
  assert.match(rc, /https:\/\/example.org/)
  assert.doesNotMatch(rc, /https:\/\/example.com/)
})

test('init opencode writes provider config', () => {
  const res = run(['init', 'opencode', '--yes', '--url', 'https://example.com', '--key', 'hy-test', '--model', 'deepseek-v4-pro', '--no-backup'])
  assert.equal(res.status, 0, res.stderr)
  const cfg = JSON.parse(fs.readFileSync(path.join(res.home, '.config/opencode/opencode.json'), 'utf8'))
  assert.equal(cfg.provider.hypershub.options.baseURL, 'https://example.com/v1')
  assert.equal(cfg.model, 'hypershub/deepseek-v4-pro')
})


test('init claude-code writes PowerShell profile', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hy-cli-test-win-'))
  const profile = path.join(home, 'PowerShell_profile.ps1')
  const res = spawnSync(process.execPath, [CLI, 'init', 'claude-code', '--yes', '--url', 'https://example.com', '--key', 'hy-test', '--model', 'claude-sonnet-4-6', '--no-backup'], {
    cwd: ROOT,
    env: { ...process.env, HOME: home, USERPROFILE: home, HY_PLATFORM: 'win32', HY_POWERSHELL_PROFILE: profile },
    encoding: 'utf8',
  })
  assert.equal(res.status, 0, res.stderr)
  const rc = fs.readFileSync(profile, 'utf8')
  assert.match(rc, /SetEnvironmentVariable\("ANTHROPIC_BASE_URL"/)
  assert.match(res.stdout, /Restart PowerShell/)
})
