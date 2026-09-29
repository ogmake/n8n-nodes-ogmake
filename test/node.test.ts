import { describe, expect, it, vi } from 'vitest';
import { Ogmake } from '../nodes/Ogmake/Ogmake.node';
import { buildHtmlBody, buildScreenshotBody } from '../nodes/Ogmake/requests';

describe('request bodies', () => {
	it('html body omits empty css/format', () => {
		expect(buildHtmlBody({ html: '<p/>', css: '', width: 100, height: 50 })).toEqual({
			html: '<p/>',
			width: 100,
			height: 50,
		});
		expect(buildHtmlBody({ html: '<p/>', css: 'p{}', width: 100, height: 50, format: 'pdf' })).toEqual({
			html: '<p/>',
			css: 'p{}',
			width: 100,
			height: 50,
			format: 'pdf',
		});
	});
	it('screenshot body sends fullPage only when true', () => {
		expect(buildScreenshotBody({ url: 'https://a.test/', width: 1280, fullPage: false })).toEqual({
			url: 'https://a.test/',
			width: 1280,
		});
		expect(
			buildScreenshotBody({ url: 'https://a.test/', width: 1280, height: 800, fullPage: true, format: 'webp' }),
		).toEqual({ url: 'https://a.test/', width: 1280, height: 800, fullPage: true, format: 'webp' });
	});
});

function ctx(params: Record<string, unknown>) {
	const authed = vi.fn(async (_cred: string, opts: { url: string }) =>
		opts.url.endsWith('/v1/screenshot')
			? { url: 'https://cdn.test/s.png', credits: 3 }
			: { url: 'https://cdn.test/i.png', credits: 2 },
	);
	const plain = vi.fn(async () => Buffer.from([1, 2, 3]));
	const self = {
		getInputData: () => [{ json: {} }],
		getCredentials: async () => ({ baseUrl: 'https://api.test/', apiKey: 'k' }),
		getNodeParameter: (name: string, _i: number, dflt?: unknown) => (name in params ? params[name] : dflt),
		getNode: () => ({}),
		continueOnFail: () => false,
		helpers: {
			httpRequestWithAuthentication: authed,
			httpRequest: plain,
			prepareBinaryData: async (b: Buffer, name: string, mime: string) => ({ name, mime, len: b.length }),
		},
	};
	return { self, authed, plain };
}

async function exec(params: Record<string, unknown>) {
	const c = ctx(params);
	const out = await new Ogmake().execute.call(c.self as never);
	return { out, ...c };
}

describe('Ogmake node execute', () => {
	it('Render HTML posts html body to /v1/images', async () => {
		const { authed, out } = await exec({
			operation: 'renderHtml', html: '<h1>Hi</h1>', css: '', width: 1200, height: 630, outputFormat: 'webp',
			downloadBinary: false,
		});
		expect(authed).toHaveBeenCalledTimes(1);
		const [cred, opts] = authed.mock.calls[0] as unknown as [string, { url: string; body: unknown }];
		expect(cred).toBe('ogmakeApi');
		expect(opts.url).toBe('https://api.test/v1/images');
		expect(opts.body).toEqual({ html: '<h1>Hi</h1>', width: 1200, height: 630, format: 'webp' });
		expect(out[0][0].json.credits).toBe(2);
	});

	it('Screenshot posts to /v1/screenshot; download uses plain httpRequest (no auth header)', async () => {
		const { authed, plain, out } = await exec({
			operation: 'screenshot', pageUrl: 'https://example.com/', width: 1280, height: 800, fullPage: true,
			screenshotFormat: 'jpg', downloadBinary: true, binaryProperty: 'data',
		});
		const [, opts] = authed.mock.calls[0] as unknown as [string, { url: string; body: unknown }];
		expect(opts.url).toBe('https://api.test/v1/screenshot');
		expect(opts.body).toEqual({ url: 'https://example.com/', width: 1280, height: 800, fullPage: true, format: 'jpg' });
		expect(authed).toHaveBeenCalledTimes(1); // the image download is NOT an authenticated call
		expect(plain).toHaveBeenCalledTimes(1);
		const req = (plain.mock.calls[0] as unknown as [Record<string, unknown>])[0];
		expect(req.url).toBe('https://cdn.test/s.png');
		expect(req).not.toHaveProperty('headers');
		expect(out[0][0].binary?.data).toMatchObject({ name: 'ogmake.jpg', mime: 'image/jpeg' });
	});
});
