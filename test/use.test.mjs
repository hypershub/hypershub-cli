import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CLI = path.join(ROOT, 'bin/hy.mjs')

function run(args, home = fs.mkdtempSync(path.join(os.tmpdir(), 'hy-use-'))) {
  const env = { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'), SHELL: '/bin/zsh', HY_CLAUDE_SETTINGS: path.join(home, '.claude/settings.json') }
  const res = spawnSync(process.execPath, [CLI, ...args], { cwd: ROOT, env, encoding: 'utf8' })
  return { ...res, home }
}

test('use switches codex model without re-entering key', () => {
  let res = run(['init', 'codex', '--yes', '--url', 'https://example.com/v1', '--key', 'hy-test', '--model', 'gpt-5.4', '--no-backup'])
  assert.equal(res.status, 0, res.stderr)
  res = run(['use', 'gpt-5.5', 'codex', '--no-backup'], res.home)
  assert.equal(res.status, 0, res.stderr)
  const config = fs.readFileSync(path.join(res.home, '.codex/config.toml'), 'utf8')
  assert.match(config, /^model = "gpt-5.5"/m)
  const catalog = JSON.parse(fs.readFileSync(path.join(res.home, '.codex/model-catalogs/all-models.json'), 'utf8'))
  assert.ok(catalog.models.some((m) => m.slug === 'gpt-5.5'))
})

test('use switches claude-code settings model', () => {
  let res = run(['init', 'claude-code', '--yes', '--url', 'https://example.com', '--key', 'hy-test', '--model', 'claude-sonnet-4-6', '--no-backup'])
  assert.equal(res.status, 0, res.stderr)
  res = run(['use', 'claude-deepseek-v4-pro', 'claude-code', '--no-backup'], res.home)
  assert.equal(res.status, 0, res.stderr)
  const rc = fs.readFileSync(path.join(res.home, '.zshrc'), 'utf8')
  assert.match(rc, /ANTHROPIC_DEFAULT_SONNET_MODEL="claude-deepseek-v4-pro"/)
  const settings = JSON.parse(fs.readFileSync(path.join(res.home, '.claude/settings.json'), 'utf8'))
  assert.equal(settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL, 'claude-deepseek-v4-pro')
  assert.equal(settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL, 'claude-deepseek-v4-pro')
})

test('use switches opencode model', () => {
  let res = run(['init', 'opencode', '--yes', '--url', 'https://example.com/v1', '--key', 'hy-test', '--model', 'gpt-5.4', '--no-backup'])
  assert.equal(res.status, 0, res.stderr)
  res = run(['use', 'deepseek-v4-pro', 'opencode', '--no-backup'], res.home)
  assert.equal(res.status, 0, res.stderr)
  const cfg = JSON.parse(fs.readFileSync(path.join(res.home, '.config/opencode/opencode.json'), 'utf8'))
  assert.equal(cfg.model, 'hypershub/deepseek-v4-pro')
  assert.ok(cfg.provider.hypershub.models['deepseek-v4-pro'])
})
