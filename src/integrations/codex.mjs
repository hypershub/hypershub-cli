import { homePath } from '../lib/paths.mjs'
import { writeFileSafe } from '../lib/fs-safe.mjs'
import { normalizeApiBaseUrl } from '../lib/url.mjs'
import { DEFAULT_CODEX_MODEL } from '../lib/constants.mjs'
import { testOpenAICompatible } from '../lib/http-test.mjs'
import { fetchAvailableModels } from '../lib/models.mjs'

function configToml({ apiBaseUrl, key, model }) {
  return `model = "${model}"
model_provider = "hypershub"
model_catalog_json = "~/.codex/model-catalogs/all-models.json"

[model_providers.hypershub]
name = "HypersHub"
base_url = "${normalizeApiBaseUrl(apiBaseUrl)}"
experimental_bearer_token = "${key}"
wire_api = "responses"
`
}

function modelCatalogJson(models) {
  return JSON.stringify({
    models: models.map((m, index) => ({
      slug: m.id,
      display_name: m.displayName || `${m.id} (HypersHub)`,
      description: m.description || `通过 HypersHub 提供的 ${m.id} 模型`,
      default_reasoning_level: 'medium',
      supported_reasoning_levels: [
        { effort: 'low', description: 'Fast responses with lighter reasoning' },
        { effort: 'medium', description: 'Balances speed and reasoning depth for everyday tasks' },
        { effort: 'high', description: 'Greater reasoning depth for complex problems' },
      ],
      shell_type: 'shell_command',
      visibility: 'list',
      supported_in_api: true,
      priority: Math.max(1, 100 - index),
      additional_speed_tiers: [],
      service_tiers: [],
      availability_nux: null,
      upgrade: null,
      base_instructions: '',
      model_messages: {},
      supports_reasoning_summaries: true,
      default_reasoning_summary: 'none',
      support_verbosity: true,
      default_verbosity: 'low',
      apply_patch_tool_type: 'freeform',
      web_search_tool_type: 'text_and_image',
      truncation_policy: { mode: 'tokens', limit: 10000 },
      supports_parallel_tool_calls: true,
      supports_image_detail_original: true,
      context_window: m.contextWindow || 128000,
      max_context_window: m.contextWindow || 128000,
      effective_context_window_percent: 95,
      experimental_supported_tools: [],
      input_modalities: ['text', 'image'],
      supports_search_tool: true,
    })),
  }, null, 2) + '\n'
}

async function init(opts) {
  const configFile = homePath('.codex', 'config.toml')
  const catalogFile = homePath('.codex', 'model-catalogs', 'all-models.json')
  const models = await fetchAvailableModels(opts)
  writeFileSafe(configFile, configToml(opts))
  writeFileSafe(catalogFile, modelCatalogJson(models))
  console.log(`✓ Codex configured: ${configFile}`)
  console.log(`✓ Model catalog configured: ${catalogFile}`)
}

export const codexIntegration = {
  id: 'codex',
  defaultModel: DEFAULT_CODEX_MODEL,
  defaultUrlKind: 'api',
  init,
  test: testOpenAICompatible,
}
