import { createHmac } from 'node:crypto';

const EXCLUDED = new Set(['sig', 'debug']);

function rfc3986(value: string): string {
	return encodeURIComponent(value).replace(
		/[!'()*]/g,
		(c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
	);
}

/** Canonical query: drop sig/debug, sort keys by codepoint, RFC3986-encode, join with `&`. */
export function canonicalQuery(params: Record<string, string>): string {
	return Object.keys(params)
		.filter((k) => !EXCLUDED.has(k))
		.sort()
		.map((k) => `${rfc3986(k)}=${rfc3986(params[k])}`)
		.join('&');
}

/** HMAC-SHA256 over the canonical query with the base64 signing secret, base64url encoded. */
export function signCanonical(secretBase64: string, canonical: string): string {
	return createHmac('sha256', Buffer.from(secretBase64, 'base64'))
		.update(canonical)
		.digest('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

export function buildSignedUrl(
	baseUrl: string,
	keyId: string,
	secretBase64: string,
	params: Record<string, string>,
): string {
	const canonical = canonicalQuery(params);
	const sig = signCanonical(secretBase64, canonical);
	return `${baseUrl.replace(/\/+$/, '')}/i/${encodeURIComponent(keyId)}/${sig}?${canonical}`;
}
