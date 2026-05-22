# HypersHub CLI

[![CI](https://github.com/hypershub/hypershub-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/hypershub/hypershub-cli/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@hypershub/cli.svg)](https://www.npmjs.com/package/@hypershub/cli)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

`hy` imports HypersHub integration settings into local AI coding tools, switches default models, and verifies connectivity.


## Repository

- GitHub: <https://github.com/hypershub/hypershub-cli>
- npm: <https://www.npmjs.com/package/@hypershub/cli>
- Issues: <https://github.com/hypershub/hypershub-cli/issues>

## Install

```bash
npm install -g @hypershub/cli
hy --help
```

Requirements: Node.js 18+.

## Quick start

```bash
hy init codex
hy init claude-code
hy init opencode
hy config set baseUrl https://apiclaw.cc
hy config set apiKey hy-xxx
hy models
hy check all
hy check all --live
hy use gpt-5.5
hy use claude-deepseek-v4-pro claude-code --live
hy test codex
hy doctor
```

Non-interactive examples:

```bash
hy init codex --url https://apiclaw.cc --key hy-xxx --model gpt-5.4 --yes
hy init claude-code --url https://apiclaw.cc --key hy-xxx --model claude-sonnet-4-6 --yes
hy init opencode --url https://apiclaw.cc --key hy-xxx --model gpt-5.4 --yes
```

## Global config

Use `hy config` to save common settings once. This avoids entering the API key every time you run `hy models`, `hy init`, or other commands. `hy init` also writes the confirmed Base URL, API key, and selected model back to this global config, so future commands can reuse them automatically.

```bash
hy config set baseUrl https://apiclaw.cc
hy config set apiKey hy-xxx
hy config set defaultModel gpt-5.5
hy config list
hy config get apiKey
hy config path
hy models
```

Supported keys:

- `baseUrl`: HypersHub base URL. You can use `https://apiclaw.cc` or `https://apiclaw.cc/v1`; the CLI normalizes it automatically.
- `apiBaseUrl`: OpenAI-compatible API URL. Setting this also updates `baseUrl`.
- `apiKey`: HypersHub API key.
- `defaultModel`: default model used by commands when `--model` is omitted.

Precedence, from highest to lowest:

```text
command flags > environment variables > hy config > interactive prompt/defaults
```

Environment variables:

```bash
HYPERSHUB_BASE_URL=https://apiclaw.cc
HYPERSHUB_API_KEY=hy-xxx
HYPERSHUB_DEFAULT_MODEL=gpt-5.5
```

Config file locations are cross-platform:

- macOS/Linux default: `~/.hypershub/config.json`
- Linux with `XDG_CONFIG_HOME`: `$XDG_CONFIG_HOME/hypershub/config.json`
- Windows default: `%APPDATA%\HypersHub\config.json`

Run `hy config path` to see the exact path. API keys are redacted by default in output. Use `--show-secrets` only when you explicitly need the full value. The file is written with `0600` permissions where the platform supports it.


## Base URL normalization

You can enter either form when prompted or when using `--url`:

```text
https://apiclaw.cc
https://apiclaw.cc/v1
```

The recommended input is `https://apiclaw.cc`. The CLI automatically normalizes URLs for each integration:

- Codex / OpenCode / `/v1/models` / `/v1/responses`: uses `https://apiclaw.cc/v1`.
- Claude Code / `ANTHROPIC_BASE_URL`: uses `https://apiclaw.cc`; Claude-compatible requests are sent to `/v1/messages` automatically.

So users do not need to remember which tool needs `/v1`.

## Daily workflow

Most users only need to initialize once, then use `hy use` for day-to-day model switching:

```bash
hy init all                 # one-time setup
hy check all --live         # verify local config and model availability
hy use gpt-5.5              # switch all configured tools
hy use gpt-5.5 codex        # switch one tool only
hy use claude-deepseek-v4-pro claude-code --live
```

`hy use` reads the existing local config, reuses the saved Base URL/API Key, and updates only the default model. This is the recommended way to switch models after setup.

## Commands

- `hy init codex`: writes `~/.codex/config.toml` and `~/.codex/model-catalogs/all-models.json`.
- `hy init claude-code`: updates shell profile and `~/.claude/settings.json` with `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, default model variables, and related settings.
- `hy init opencode`: writes `~/.config/opencode/opencode.json`.
- `hy init all`: applies all supported integrations.
- `hy models`: queries `/v1/models` and lists all models available to the API key. It reads `hy config` automatically. Use `--json` for scripts.
- `hy config list|get|set|unset|path`: manages global CLI settings such as `baseUrl`, `apiKey`, and `defaultModel`.
- `hy check [target|all]`: inspects local generated configs, redacts API keys, and reports missing URL/key/model/catalog fields.
- `hy check [target|all] --live`: additionally calls `/v1/models` and verifies the configured default model exists for the current key.
- `hy use <model> [target|all]`: switches the default model in existing local configs without re-entering URL/API Key. Use `--live` to verify availability first. If target is omitted, it applies to all configured integrations.
- `hy test <codex|claude-code|opencode>`: sends a small test request to `/v1/responses` or `/v1/messages`.
- `hy doctor`: checks common config files and environment variables.

## Dynamic model catalog

For `hy init codex` and `hy init opencode`, the CLI calls:

```http
GET /v1/models
Authorization: Bearer hy-xxx
```

The generated local model catalog only contains models available to that API key. If the request fails, the CLI falls back to a small built-in catalog so initialization can still complete.

## Switch models

After `hy init`, use `hy use` to change the default model without re-entering the Base URL or API Key:

```bash
hy use gpt-5.5                    # switch all configured integrations
hy use gpt-5.5 codex              # switch Codex only
hy use claude-deepseek-v4-pro claude-code
hy use deepseek-v4-pro opencode
hy use gpt-5.5 all --live         # verify /v1/models before writing
```

What it updates:

- Codex: `~/.codex/config.toml`, and ensures the model exists in `~/.codex/model-catalogs/all-models.json`.
- Claude Code: shell profile plus `~/.claude/settings.json`, including cc-switch-compatible model keys.
- OpenCode: `~/.config/opencode/opencode.json`.

Use `--json` for scripts:

```bash
hy use gpt-5.5 codex --live --json
```

Restart the target app after switching. For Claude Code, reload your shell if needed:

```bash
source ~/.zshrc
```

## Platform notes

### macOS / Linux / WSL

`hy init claude-code` updates `~/.claude/settings.json` as well as one of:

- `~/.zshrc`
- `~/.bashrc`
- `~/.config/fish/config.fish`

The `~/.claude/settings.json` sync is used for compatibility with Claude Code and cc-switch style model overrides, so `/model` should show the model selected during `hy init`. Reload your shell after initialization, for example:

```bash
source ~/.zshrc
```

### Windows PowerShell

`hy init claude-code` writes a HypersHub block to the PowerShell profile and sets user-scoped environment variables when that profile is loaded.

Default profile path:

```text
~/Documents/PowerShell/Microsoft.PowerShell_profile.ps1
```

After initialization, restart PowerShell or run:

```powershell
. $PROFILE
```

## Safety

- Existing files are backed up by default with `.bak.YYYYMMDDHHmmss` suffix.
- `--no-backup` disables backup.
- `--dry-run` prints generated config without writing files.
- API keys are redacted in dry-run output and prompts.
- Config files are written with `0600` permissions where the platform supports it.
- `.env` files are not published.

## Query, check, and test

After configuration, use these commands to find problems quickly:

```bash
hy config set apiKey hy-xxx
hy models
hy models --json
hy check codex
hy check all --live
hy use gpt-5.5
hy use claude-deepseek-v4-pro claude-code --live
hy test codex --model gpt-5.4
hy test claude-code --model claude-sonnet-4-6
```

`hy check --live` is the most useful first diagnostic: it reads the local config, calls `/v1/models`, and confirms the configured model is actually available to that API key. Use `hy use <model> --live` when the config is valid but you want to switch models safely.

## Troubleshooting

### `/v1/models` fails during init

The CLI will continue with fallback models. Check:

- URL should normally be `https://apiclaw.cc` or `https://apiclaw.cc/v1`.
- API key should start with `hy-`.
- Network/DNS can reach your HypersHub gateway.

### Claude Code still uses Anthropic directly

Run:

```bash
hy doctor
```

Then reload the shell profile. The CLI also synchronizes `~/.claude/settings.json`; if another switcher changes the model later, run `hy use <model> claude-code` or re-run `hy init claude-code`. If you previously logged into Anthropic inside Claude Code, run `/logout` in Claude Code and restart the terminal.

### Codex does not show custom models

Re-run:

```bash
hy init codex
```

Then restart Codex Desktop/CLI. The model catalog is written to:

```text
~/.codex/model-catalogs/all-models.json
```

## Development

```bash
git clone git@github.com:hypershub/hypershub-cli.git
cd hypershub-cli
npm test
npm run pack:check
npm run smoke:pack
npm run preflight
```

See also:

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CHANGELOG.md](CHANGELOG.md)
- [SECURITY.md](SECURITY.md)


Publish beta:

```bash
npm publish --access public --tag beta
```

Publish dry-run:

```bash
npm publish --dry-run --access public
```

Publish stable via GitHub Trusted Publisher:

1. Bump `package.json` version and update `CHANGELOG.md`.
2. Commit and push to `main`.
3. Create and push a tag, for example `v0.1.9`.
4. Publish a GitHub Release for that tag, or run the `Publish` workflow manually.

The workflow uses npm Trusted Publisher / OIDC, so it does not need an `NPM_TOKEN` secret. `prepublishOnly` still runs `npm run preflight` before publishing.
