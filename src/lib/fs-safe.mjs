import fs from 'node:fs'
import path from 'node:path'
import { state } from './state.mjs'

export function ensureDir(dir) {
  if (state.dryRun) return
  fs.mkdirSync(dir, { recursive: true })
}

export function readText(file) {
  try { return fs.readFileSync(file, 'utf8') } catch { return '' }
}

export function backupFile(file) {
  if (!state.backup || state.dryRun || !fs.existsSync(file)) return null
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const bak = `${file}.bak.${stamp}`
  fs.copyFileSync(file, bak)
  return bak
}

function redactSecrets(content) {
  return content.replace(/hy-[A-Za-z0-9_-]{8,}/g, (key) => `${key.slice(0, 3)}****${key.slice(-4)}`)
}

export function writeFileSafe(file, content) {
  if (state.dryRun) {
    console.log(`\n--- dry-run: ${file} ---\n${redactSecrets(content)}\n--- end ---`)
    return
  }
  ensureDir(path.dirname(file))
  const bak = backupFile(file)
  fs.writeFileSync(file, content, { mode: 0o600 })
  if (bak) console.log(`  backup: ${bak}`)
}
