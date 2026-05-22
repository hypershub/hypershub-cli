import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CLI = path.join(ROOT, 'bin/hy.mjs')

function run(args, home = fs.mkdtempSync(path.join(os.tmpdir(), 'hy-check-'))) {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    env: { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'), SHELL: '/bin/zsh' },
    encoding: 'utf8',
  })
  return { ...res, home }
}

test('check codex reports local config as json with redacted key', () => {
  let res = run(['init', 'codex', '--yes', '--url', 'https://example.com/v1', '--key', 'hy-1234567890abcdef', '--model', 'gpt-5.4', '--no-backup'])
  assert.equal(res.status, 0, res.stderr)
  res = run(['check', 'codex', '--json'], res.home)
  assert.equal(res.status, 0, res.stderr)
  const payload = JSON.parse(res.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.results[0].id, 'codex')
  assert.equal(payload.results[0].config.key, 'hy-****cdef')
  assert.equal(payload.results[0].config.model, 'gpt-5.4')
  assert.doesNotMatch(res.stdout, /hy-1234567890abcdef/)
})

test('check all reports missing configs', () => {
  const res = run(['check', 'all'])
  assert.equal(res.status, 0, res.stderr)
  assert.match(res.stdout, /✗ codex/)
  assert.match(res.stdout, /config file not found/)
})
