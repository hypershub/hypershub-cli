# Changelog

All notable changes to this project will be documented in this file.

## 0.1.9 - 2026-05-22

- Add `hy config` for global Base URL, API key, and default model management.
- Make `hy models` reuse saved config so users do not need to re-enter API keys.
- Make `hy init` write confirmed settings back to the global config for future commands.
- Add cross-platform config paths for macOS, Linux, XDG, and Windows.
- Redact API keys in config output by default and add config tests.
- Allow tag pushes like `v0.1.9` to trigger GitHub Actions npm publishing.

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
