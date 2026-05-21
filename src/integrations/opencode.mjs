import { homePath } from '../lib/paths.mjs'
import { writeFileSafe } from '../lib/fs-safe.mjs'
import { normalizeApiBaseUrl } from '../lib/url.mjs'
import { DEFAULT_CODEX_MODEL } from '../lib/constants.mjs'
import { testOpenAICompatible } from '../lib/http-test.mjs'
import { fetchAvailableModels } from '../lib/models.mjs'

function modelsObject(models, selectedModel) {
  const entries = models.map((m) => [m.id, { name: m.displayName || m.id, id: m.id }])
  if (!entries.find(([id]) => id === selectedModel)) entries.push([selectedModel, { name: selectedModel, id: selectedModel }])
  return Object.fromEntries(entries)
}

function configJson({ apiBaseUrl, key, model }, models) {
  return JSON.stringify({
    $schema: 'https://opencode.ai/config.json',
    model: `hypershub/${model}`,
    provider: {
      hypershub: {
        npm: '@ai-sdk/openai-compatible',
        name: 'HypersHub',
        options: { baseURL: normalizeApiBaseUrl(apiBaseUrl), apiKey: key },
        models: modelsObject(models, model),
      },
    },
  }, null, 2) + '\n'
}

async function init(opts) {
  const file = homePath('.config', 'opencode', 'opencode.json')
  const models = await fetchAvailableModels(opts)
  writeFileSafe(file, configJson(opts, models))
  console.log(`✓ OpenCode configured: ${file}`)
}

export const opencodeIntegration = {
  id: 'opencode',
  defaultModel: DEFAULT_CODEX_MODEL,
  defaultUrlKind: 'api',
  init,
  test: testOpenAICompatible,
}
