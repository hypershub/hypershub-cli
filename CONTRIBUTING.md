# Contributing

Thanks for contributing to `@hypershub/cli`.

## Development

Requirements:

- Node.js 18+
- npm

Run checks locally:

```bash
npm test
npm run pack:check
npm run smoke:pack
npm run preflight
```

## URL normalization

Users may enter either:

```text
https://hypershub.com
https://hypershub.com/v1
```

Keep the integration-specific behavior centralized in `src/lib/url.mjs`:

- OpenAI-compatible integrations use `normalizeApiBaseUrl()` and should write `/v1`.
- Claude Code uses `normalizeBaseUrl()` for `ANTHROPIC_BASE_URL` and should not write `/v1` there.

## Release checklist

1. Update `package.json` version.
2. Update `CHANGELOG.md`.
3. Run `npm run preflight`.
4. Commit and tag the release.
5. Create a GitHub Release for the tag, or manually run the `Publish` workflow.
6. Verify with `npm view @hypershub/cli version`.

Publishing uses npm Trusted Publisher with GitHub Actions OIDC. Do not add `NPM_TOKEN` unless you intentionally switch back to token-based publishing.
