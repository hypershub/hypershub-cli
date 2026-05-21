import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CLI = path.join(ROOT, 'bin/hy.mjs')

function run(args) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hy-cli-flags-'))
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    env: { ...process.env, HOME: home, USERPROFILE: home, SHELL: '/bin/zsh' },
    encoding: 'utf8',
  })
}

test('help exits successfully', () => {
  const res = run(['--help'])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /hy init <codex\|claude-code\|opencode\|all>/)
})

test('unknown target exits with error', () => {
  const res = run(['init', 'missing', '--yes', '--key', 'hy-test'])
  assert.equal(res.status, 1)
  assert.match(res.stderr, /Unknown target: missing/)
})

test('dry-run redacts HypersHub API keys', () => {
  const res = run(['init', 'codex', '--yes', '--url', 'https://example.invalid', '--key', 'hy-1234567890abcdef', '--model', 'gpt-5.4', '--dry-run', '--no-backup'])
  assert.equal(res.status, 0, res.stderr)
  assert.match(res.stdout, /hy-\*\*\*\*cdef/)
  assert.doesNotMatch(res.stdout, /hy-1234567890abcdef/)
})
