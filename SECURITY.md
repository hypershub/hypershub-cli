# Security Policy

## Reporting a vulnerability

Please report security issues privately by contacting the HypersHub maintainers.
Do not open a public GitHub issue for sensitive reports.

## Secrets

Never commit API keys, npm tokens, `.env` files, or generated local tool configs.
This repository ignores `.env` files by default.

The CLI redacts HypersHub API keys in dry-run and diagnostic output where possible.
