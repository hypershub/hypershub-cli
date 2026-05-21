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
https://apiclaw.cc
https://apiclaw.cc/v1
```

Keep the integration-specific behavior centralized in `src/lib/url.mjs`:

- OpenAI-compatible integrations use `normalizeApiBaseUrl()` and should write `/v1`.
- Claude Code uses `normalizeBaseUrl()` for `ANTHROPIC_BASE_URL` and should not write `/v1` there.

## Release checklist

1. Update `package.json` version.
2. Update `CHANGELOG.md`.
3. Run `npm run preflight`.
4. Commit and tag the release.
5. Publish with `npm publish --access public`.
6. Verify with `npm view @hypershub/cli version`.
