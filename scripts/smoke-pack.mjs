#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hy-pack-smoke-'))
const packDir = path.join(tmp, 'pack')
const installDir = path.join(tmp, 'install')
const home = path.join(tmp, 'home')
const cache = path.join(tmp, 'npm-cache')
fs.mkdirSync(packDir, { recursive: true })
fs.mkdirSync(installDir, { recursive: true })
fs.mkdirSync(home, { recursive: true })

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd || root,
    env: {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      SHELL: '/bin/zsh',
      npm_config_cache: cache,
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      ...opts.env,
    },
    encoding: 'utf8',
  })
  if (res.status !== 0) {
    process.stderr.write(res.stdout || '')
    process.stderr.write(res.stderr || '')
    throw new Error(`${cmd} ${args.join(' ')} failed with exit code ${res.status}`)
  }
  return res
}

const pack = run('npm', ['pack', '--json', '--pack-destination', packDir])
const info = JSON.parse(pack.stdout)[0]
const tarball = path.join(packDir, info.filename)

run('npm', ['install', '--prefix', installDir, tarball])

const bin = process.platform === 'win32'
  ? path.join(installDir, 'node_modules', '.bin', 'hy.cmd')
  : path.join(installDir, 'node_modules', '.bin', 'hy')

const help = run(bin, ['--help'])
if (!help.stdout.includes('hy init <codex|claude-code|opencode|all>')) {
  throw new Error('smoke check failed: help output did not include expected usage')
}

const check = run(bin, ['check', 'all', '--json'])
const payload = JSON.parse(check.stdout)
if (payload.ok !== false || !Array.isArray(payload.results)) {
  throw new Error('smoke check failed: check all --json returned unexpected payload')
}

const dryRun = run(bin, ['init', 'codex', '--yes', '--url', 'https://example.invalid/v1', '--key', 'hy-1234567890abcdef', '--model', 'gpt-5.4', '--dry-run', '--no-backup'])
if (dryRun.stdout.includes('hy-1234567890abcdef') || !dryRun.stdout.includes('hy-****cdef')) {
  throw new Error('smoke check failed: dry-run did not redact API key')
}

console.log(`✓ pack smoke test passed (${info.name}@${info.version})`)
console.log(`  tarball: ${tarball}`)
