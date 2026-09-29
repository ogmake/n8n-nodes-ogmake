import type { IDataObject } from 'n8n-workflow';

/** Body for POST /v1/images in raw-HTML mode. Empty optional values are omitted. */
export function buildHtmlBody(o: {
	html: string;
	css?: string;
	width: number;
	height: number;
	format?: string;
}): IDataObject {
	const body: IDataObject = { html: o.html, width: o.width, height: o.height };
	if (o.css) body.css = o.css;
	if (o.format) body.format = o.format;
	return body;
}

/** Body for POST /v1/screenshot. `fullPage` is sent only when true. */
export function buildScreenshotBody(o: {
	url: string;
	width: number;
	height?: number;
	fullPage?: boolean;
	format?: string;
}): IDataObject {
	const body: IDataObject = { url: o.url, width: o.width };
	if (o.height) body.height = o.height;
	if (o.fullPage) body.fullPage = true;
	if (o.format) body.format = o.format;
	return body;
}
