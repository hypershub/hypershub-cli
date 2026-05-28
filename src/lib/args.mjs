export function parseArgv(argv) {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const eq = arg.indexOf('=')
    if (eq >= 0) {
      flags[arg.slice(2, eq)] = arg.slice(eq + 1)
      continue
    }
    const name = arg.slice(2)
    if (['yes', 'dry-run', 'no-backup', 'help', 'json', 'live', 'show-secrets'].includes(name)) flags[name] = true
    else flags[name] = argv[++i]
  }
  return { positional, flags }
}

export function usage() {
  console.log(`HypersHub CLI

Usage:
  hy init <codex|claude-code|opencode|all> [--url URL] [--key KEY] [--model MODEL] [--yes] [--dry-run]
  hy test <codex|claude-code|opencode> [--url URL] [--key KEY] [--model MODEL]
  hy models [--url URL] [--key KEY] [--json]
  hy config list|get|set|unset|path [key] [value]
  hy check [codex|claude-code|opencode|all] [--live] [--json]
  hy use <model> [codex|claude-code|opencode|all] [--live] [--json]
  hy doctor

Examples:
  hy init codex
  hy init codex --url https://hypershub.com --key hy-xxx --model gpt-5.4
  hy init claude-code --url https://hypershub.com --key hy-xxx
  hy test claude-code --url https://hypershub.com --key hy-xxx
  hy config set apiKey hy-xxx
  hy config set baseUrl https://hypershub.com
  hy models
  hy check all --live
  hy use gpt-5.5
`)
}
