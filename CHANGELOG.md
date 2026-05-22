# Changelog

All notable changes to this project will be documented in this file.

## 0.1.11 - 2026-05-22

- Fix Windows path compatibility for Claude Code and OpenCode config files.
- Add `appDataPath`, `claudeSettingsPath`, `openCodeConfigPath` path helpers.

## 0.1.8 - 2026-05-21

- Normalize Base URL automatically for each integration.
- Use `https://apiclaw.cc` as the recommended input URL.
- Keep Codex/OpenCode on OpenAI-compatible `/v1` endpoints.
- Keep Claude Code `ANTHROPIC_BASE_URL` on the gateway root URL.
- Document URL normalization rules.

## 0.1.7 - 2026-05-21

- Add `hy use <model> [target|all]` for switching default models without re-entering URL/API Key.
- Improve Claude Code compatibility with `~/.claude/settings.json` and cc-switch style model environment keys.
- Add diagnostics with `hy check`, `hy models`, `hy test`, and `hy doctor`.
- Add prepublish preflight checks and pack smoke tests.

## 0.1.0 - 2026-05-21

- Initial CLI for configuring Codex, Claude Code, and OpenCode with HypersHub.
