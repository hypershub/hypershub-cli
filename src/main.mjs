import { parseArgv, usage } from './lib/args.mjs'
import { state } from './lib/state.mjs'
import { makePrompter } from './lib/prompt.mjs'
import { DEFAULT_API_BASE_URL, DEFAULT_BASE_URL } from './lib/constants.mjs'
import { normalizeApiBaseUrl, normalizeBaseUrl } from './lib/url.mjs'
import { allIntegrations, getIntegration } from './integrations/index.mjs'
import { doctor } from './doctor.mjs'
import { fetchAvailableModels } from './lib/models.mjs'
import { modelsCommand } from './commands/models.mjs'
import { checkCommand } from './commands/check.mjs'
import { useCommand } from './commands/use.mjs'

function resolveTargets(target) {
  if (target === 'all') return allIntegrations()
  const integration = getIntegration(target)
  if (!integration) throw new Error(`Unknown target: ${target}`)
  return [integration]
}

function defaultUrlFor(integration) {
  return integration.defaultUrlKind === 'base' ? DEFAULT_BASE_URL : DEFAULT_API_BASE_URL
}

async function collectOptions({ prompter, targetIntegration }) {
  const url = await prompter.text('url', 'API Base URL', defaultUrlFor(targetIntegration))
  const key = await prompter.text('key', 'API Key', process.env.HYPERSHUB_API_KEY || '', { secret: true })
  if (!key) throw new Error('API Key is required')
  const models = await fetchAvailableModels({ apiBaseUrl: normalizeApiBaseUrl(url), key, silent: true })
  const modelIds = models.map((m) => m.id)
  const model = await prompter.select('model', 'Default model', modelIds, targetIntegration.defaultModel)
  return {
    apiBaseUrl: normalizeApiBaseUrl(url),
    baseUrl: normalizeBaseUrl(url),
    key,
    model,
  }
}

export async function main(argv = process.argv.slice(2)) {
  const { positional, flags } = parseArgv(argv)
  if (flags.help || positional.length === 0) return usage()

  state.dryRun = Boolean(flags['dry-run'])
  state.yes = Boolean(flags.yes)
  state.backup = !flags['no-backup']

  const [cmd, target] = positional
  if (cmd === 'doctor') return doctor()
  if (cmd === 'check') return checkCommand({ target: target || 'all', flags })
  if (cmd === 'models') {
    const prompter = await makePrompter(flags)
    try { return await modelsCommand({ flags, prompter }) } finally { prompter.close() }
  }
  if (cmd === 'use') return useCommand({ model: target, target: positional[2] || flags.target || 'all', flags })
  if (!['init', 'test'].includes(cmd)) throw new Error(`Unknown command: ${cmd}`)
  if (!target) throw new Error(`Missing target for ${cmd}`)

  const targets = resolveTargets(target)
  if (cmd === 'test' && targets.length !== 1) throw new Error('hy test requires a single target')

  const prompter = await makePrompter(flags)
  try {
    const opts = await collectOptions({ prompter, targetIntegration: targets[0] })
    if (cmd === 'init') {
      state.backup = flags['no-backup'] ? false : await prompter.confirm('backup', 'Backup existing config before writing', true)
      for (const integration of targets) await integration.init(opts)
      if (await prompter.confirm('test', 'Run connectivity test now', false)) await targets[0].test(opts)
    } else {
      await targets[0].test(opts)
    }
  } finally {
    prompter.close()
  }
}
