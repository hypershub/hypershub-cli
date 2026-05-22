import path from 'node:path'
import os from 'node:os'

export function homePath(...parts) {
  return path.join(os.homedir(), ...parts)
}

export function expandHome(p) {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

export function isWindows() {
  return process.platform === 'win32' || process.env.HY_PLATFORM === 'win32'
}

/** AppData directory: Windows: %APPDATA%, macOS/Linux: ~/.config */
function appDataDir() {
  if (isWindows()) {
    return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
  }
  return process.env.XDG_CONFIG_HOME || homePath('.config')
}

export function appDataPath(...parts) {
  return path.join(appDataDir(), ...parts)
}

/** Claude Code settings path: Windows: %APPDATA%/Claude/settings.json, macOS/Linux: ~/.claude/settings.json */
export function claudeSettingsPath() {
  return process.env.HY_CLAUDE_SETTINGS || (isWindows() ? appDataPath('Claude', 'settings.json') : homePath('.claude', 'settings.json'))
}

/** OpenCode config path: Windows: %APPDATA%/opencode/opencode.json, macOS/Linux: ~/.config/opencode/opencode.json */
export function openCodeConfigPath() {
  return appDataPath('opencode', 'opencode.json')
}

export function shellConfigFile() {
  if (isWindows()) {
    return process.env.HY_POWERSHELL_PROFILE || path.join(os.homedir(), 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1')
  }
  const shell = process.env.SHELL || ''
  if (shell.includes('fish')) return homePath('.config', 'fish', 'config.fish')
  if (shell.includes('bash')) return homePath('.bashrc')
  return homePath('.zshrc')
}

export function shellKind() {
  if (isWindows()) return 'powershell'
  const shell = process.env.SHELL || ''
  if (shell.includes('fish')) return 'fish'
  return 'posix'
}
