# n8n-nodes-ogmake

n8n community node for [ogmake](https://ogmake.com): render Open Graph images and PDFs from templates.

## Operations
- **Render Image** - `POST /v1/images` with a template, fields (template params), format (png, jpg, webp, pdf) and preset. Returns the hosted URL, hash, size and cache flag. Optionally downloads the file into a binary property.
- **Render HTML** - `POST /v1/images` with raw `html` (+ optional `css`), width, height and format (png, jpg, webp, pdf). 2 credits.
- **Build Signed URL** - signs `https://ogmake.com/i/{keyId}/{sig}?...` locally (HMAC-SHA256, no API call, no quota use).

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

## Install
In n8n: Settings > Community Nodes > Install > `n8n-nodes-ogmake`.

License: MIT
