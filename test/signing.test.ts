import { describe, expect, it } from 'vitest';
import { buildSignedUrl, canonicalQuery, signCanonical } from '../nodes/Ogmake/signing';

// Fixed vector shared with the ogmake repo's signing tests.
const VECTOR_KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => i)).toString('base64');

describe('signing', () => {
	it('builds the canonical query', () => {
		expect(canonicalQuery({ template: 'basic', title: 'Hello World', format: 'png' })).toBe(
			'format=png&template=basic&title=Hello%20World',
		);
	});
	it('drops sig/debug and escapes !\'()*', () => {
		expect(canonicalQuery({ a: "x!'()*", sig: 's', debug: '1' })).toBe('a=x%21%27%28%29%2A');
	});
	it('matches the fixed signature vector', () => {
		expect(signCanonical(VECTOR_KEY, 'format=png&template=basic&title=Hello%20World')).toBe(
			'W8Xvrf9UTFKbVVQtofHq7A2ljK9z-nvJUL3B-rB7MY8',
		);
	});
	it('builds a signed URL', () => {
		expect(
			buildSignedUrl('https://ogmake.com/', 'k_1', VECTOR_KEY, {
				template: 'basic',
				title: 'Hello World',
				format: 'png',
			}),
		).toBe(
			'https://ogmake.com/i/k_1/W8Xvrf9UTFKbVVQtofHq7A2ljK9z-nvJUL3B-rB7MY8?format=png&template=basic&title=Hello%20World',
		);
	});
});

describe('signing keyId', () => {
	it('URL-encodes the key id path segment', () => {
		const url = buildSignedUrl('https://ogmake.com', 'k/1 x', VECTOR_KEY, { template: 'basic' });
		expect(url.startsWith('https://ogmake.com/i/k%2F1%20x/')).toBe(true);
	});
});
