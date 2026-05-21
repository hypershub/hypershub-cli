import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { state } from './state.mjs'

function maskDefault(def) {
  if (!def) return ''
  if (/^hy-[A-Za-z0-9_-]{8,}$/.test(def)) return `${def.slice(0, 3)}****${def.slice(-4)}`
  return def
}

export async function makePrompter(flags) {
  const rl = readline.createInterface({ input, output })
  return {
    async text(name, message, def, { secret = false } = {}) {
      if (flags[name]) return flags[name]
      if (state.yes && def !== undefined) return def
      const shownDefault = secret ? maskDefault(def) : def
      const suffix = shownDefault ? ` (${shownDefault})` : ''
      const answer = await rl.question(`${message}${suffix}: `)
      return answer.trim() || def || ''
    },
    async select(name, message, options, def) {
      if (flags[name]) return flags[name]
      if (state.yes && def !== undefined) return def
      if (options.length > 0) {
        options.forEach((opt, i) => {
          const marker = opt === def ? '*' : ' '
          process.stdout.write(`  ${marker} ${i + 1}. ${opt}\n`)
        })
      }
      const suffix = def ? ` (${def})` : ''
      const answer = (await rl.question(`${message}${suffix}: `)).trim()
      if (!answer) return def || options[0] || ''
      const num = parseInt(answer, 10)
      if (!isNaN(num) && num >= 1 && num <= options.length) return options[num - 1]
      return answer
    },
    async confirm(name, message, def = true) {
      if (flags[name] !== undefined) return Boolean(flags[name])
      if (state.yes) return def
      const label = def ? 'Y/n' : 'y/N'
      const answer = (await rl.question(`${message} (${label}): `)).trim().toLowerCase()
      if (!answer) return def
      return ['y', 'yes', '是'].includes(answer)
    },
    close() { rl.close() },
  }
}

export const __test__ = { maskDefault }
