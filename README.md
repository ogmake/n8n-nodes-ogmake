# n8n-nodes-ogmake

n8n community node for [ogmake](https://ogmake.com): render Open Graph images and PDFs from templates.

## Operations
- **Render Image** - `POST /v1/images` with a template, fields (template params), format (png, jpg, webp, pdf) and preset. Returns the hosted URL, hash, size and cache flag. Optionally downloads the file into a binary property.
- **Render HTML** - `POST /v1/images` with raw `html` (+ optional `css`), width, height and format (png, jpg, webp, pdf). 2 credits.
- **Screenshot URL** - `POST /v1/screenshot` of a public page: width, height, full page, format (png, jpg, webp). 3 credits.
- **Build Signed URL** - signs `https://ogmake.com/i/{keyId}/{sig}?...` locally (HMAC-SHA256, no API call, no quota use).

Check URL (the OG checker) is not included: `/v1/check` is admin-gated and not part of the public API.

## Credentials
Create an API key in the ogmake dashboard. API Key (`og_live_...`) is required. Key ID (`k_...`) and Signing Secret are only needed for Build Signed URL; the secret is shown once at key creation and never leaves n8n.

## Support
support@ogmake.com

## Development
```
npm install
npm run lint     # n8n eslint plugin
npm test         # signing unit tests (vitest)
npm run build
npm run dev      # local n8n with the node loaded
```

## Publish (not done)
1. npm account; `npm login`. Package name `n8n-nodes-ogmake` must be free.
2. Publish from GitHub Actions with provenance (required for n8n verified nodes since 2026): `npm run release` or `npm publish --provenance`.
3. For the verified/cloud listing submit the package through the n8n Creator Portal.
