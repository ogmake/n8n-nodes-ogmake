import type {
	IDataObject,
	JsonObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { buildSignedUrl } from './signing';
import { buildHtmlBody, buildScreenshotBody } from './requests';

const RESERVED = ['format', 'preset', 'scale', 'v', 'bg', 'sig', 'debug'];

/** The hosted image URL is public: plain httpRequest, so the API key is never sent to the image host. */
async function downloadPublic(helpers: IExecuteFunctions['helpers'], url: string): Promise<Buffer> {
	return (await helpers.httpRequest({ method: 'GET', url, encoding: 'arraybuffer', json: false })) as Buffer;
}

export class Ogmake implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ogmake',
		name: 'ogmake',
		icon: { light: 'file:ogmake.svg', dark: 'file:ogmake.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Render OG images and PDFs from templates, or build signed image URLs',
		defaults: { name: 'ogmake' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'ogmakeApi', required: true }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'renderImage',
				options: [
					{
						name: 'Render Image',
						value: 'renderImage',
						action: 'Render an image or PDF',
						description: 'Render a template and return the hosted URL',
					},
					{
						name: 'Render HTML',
						value: 'renderHtml',
						action: 'Render raw HTML to an image or PDF',
						description: 'Render raw HTML and CSS (2 credits) and return the hosted URL',
					},
					{
						name: 'Screenshot URL',
						value: 'screenshot',
						action: 'Screenshot a public web page',
						description: 'Capture a public web page (3 credits) and return the hosted URL',
					},
					{
						name: 'Build Signed URL',
						value: 'buildSignedUrl',
						action: 'Build a signed image URL',
						description: 'Sign an image URL locally, with no API call',
					},
				],
			},
			{
				displayName: 'Template',
				name: 'template',
				type: 'string',
				default: 'basic',
				required: true,
				description: 'Template ID, e.g. basic or blog',
				displayOptions: { show: { operation: ['renderImage', 'buildSignedUrl'] } },
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Field',
				default: {},
				description: 'Template params such as title, author or date',
				displayOptions: { show: { operation: ['renderImage', 'buildSignedUrl'] } },
				options: [
					{
						displayName: 'Field',
						name: 'field',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', default: '' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				default: 'png',
				options: [
					{ name: 'JPG', value: 'jpg' },
					{ name: 'PDF', value: 'pdf' },
					{ name: 'PNG', value: 'png' },
					{ name: 'WebP', value: 'webp' },
				],
				displayOptions: { show: { operation: ['renderImage', 'buildSignedUrl'] } },
			},
			{
				displayName: 'Preset',
				name: 'preset',
				type: 'options',
				default: 'og',
				options: [
					{ name: 'OG (1200x630)', value: 'og' },
					{ name: 'Square', value: 'square' },
					{ name: 'X', value: 'x' },
				],
				displayOptions: { show: { operation: ['renderImage', 'buildSignedUrl'] } },
			},
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				typeOptions: { rows: 6 },
				default: '',
				required: true,
				description: 'HTML to render (JavaScript never runs; request body limited to 300 KB)',
				displayOptions: { show: { operation: ['renderHtml'] } },
			},
			{
				displayName: 'CSS',
				name: 'css',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'Extra CSS, injected as a style block',
				displayOptions: { show: { operation: ['renderHtml'] } },
			},
			{
				displayName: 'Page URL',
				name: 'pageUrl',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://example.com/',
				description: 'Public http(s) page to capture',
				displayOptions: { show: { operation: ['screenshot'] } },
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				typeOptions: { minValue: 16, maxValue: 4096 },
				default: 1200,
				description: 'Viewport width in CSS px',
				displayOptions: { show: { operation: ['renderHtml', 'screenshot'] } },
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				typeOptions: { minValue: 16, maxValue: 4096 },
				default: 630,
				description: 'Viewport height in CSS px',
				displayOptions: { show: { operation: ['renderHtml', 'screenshot'] } },
			},
			{
				displayName: 'Full Page',
				name: 'fullPage',
				type: 'boolean',
				default: false,
				description: 'Whether to capture the whole page (capped at 10000 CSS px tall)',
				displayOptions: { show: { operation: ['screenshot'] } },
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				default: 'png',
				options: [
					{ name: 'JPG', value: 'jpg' },
					{ name: 'PDF', value: 'pdf' },
					{ name: 'PNG', value: 'png' },
					{ name: 'WebP', value: 'webp' },
				],
				displayOptions: { show: { operation: ['renderHtml'] } },
			},
			{
				displayName: 'Output Format',
				name: 'screenshotFormat',
				type: 'options',
				default: 'png',
				options: [
					{ name: 'JPG', value: 'jpg' },
					{ name: 'PNG', value: 'png' },
					{ name: 'WebP', value: 'webp' },
				],
				displayOptions: { show: { operation: ['screenshot'] } },
			},
			{
				displayName: 'Download Binary',
				name: 'downloadBinary',
				type: 'boolean',
				default: false,
				description: 'Whether to also download the rendered file into a binary property',
				displayOptions: { show: { operation: ['renderImage', 'renderHtml', 'screenshot'] } },
			},
			{
				displayName: 'Binary Property',
				name: 'binaryProperty',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: { operation: ['renderImage', 'renderHtml', 'screenshot'], downloadBinary: [true] },
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		const creds = await this.getCredentials('ogmakeApi');
		const baseUrl = String(creds.baseUrl || 'https://ogmake.com').replace(/\/+$/, '');

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const isTemplateOp = operation === 'renderImage' || operation === 'buildSignedUrl';
				const template = isTemplateOp ? (this.getNodeParameter('template', i) as string) : '';
				const format = isTemplateOp ? (this.getNodeParameter('format', i) as string) : '';
				const preset = isTemplateOp ? (this.getNodeParameter('preset', i) as string) : '';
				const fieldList = isTemplateOp
					? ((this.getNodeParameter('fields.field', i, []) as IDataObject[]) ?? [])
					: [];
				const params: Record<string, string> = {};
				for (const f of fieldList) {
					const name = String(f.name ?? '').trim();
					if (!name) continue;
					if (RESERVED.includes(name) || /[[\]]/.test(name)) {
						throw new NodeOperationError(this.getNode(), `Field name "${name}" is reserved`, {
							itemIndex: i,
						});
					}
					params[name] = String(f.value ?? '');
				}

				if (operation === 'buildSignedUrl') {
					const keyId = String(creds.keyId ?? '');
					const secret = String(creds.signingSecret ?? '');
					if (!keyId || !secret) {
						throw new NodeOperationError(
							this.getNode(),
							'Set Key ID and Signing Secret in the credentials to build signed URLs',
							{ itemIndex: i },
						);
					}
					const url = buildSignedUrl(baseUrl, keyId, secret, { ...params, template, format, preset });
					out.push({ json: { url }, pairedItem: { item: i } });
					continue;
				}

				let path = '/v1/images';
				let body: IDataObject;
				let outFormat = format;
				if (operation === 'renderHtml') {
					outFormat = this.getNodeParameter('outputFormat', i) as string;
					body = buildHtmlBody({
						html: this.getNodeParameter('html', i) as string,
						css: this.getNodeParameter('css', i, '') as string,
						width: this.getNodeParameter('width', i) as number,
						height: this.getNodeParameter('height', i) as number,
						format: outFormat,
					});
				} else if (operation === 'screenshot') {
					path = '/v1/screenshot';
					outFormat = this.getNodeParameter('screenshotFormat', i) as string;
					body = buildScreenshotBody({
						url: this.getNodeParameter('pageUrl', i) as string,
						width: this.getNodeParameter('width', i) as number,
						height: this.getNodeParameter('height', i) as number,
						fullPage: this.getNodeParameter('fullPage', i) as boolean,
						format: outFormat,
					});
				} else {
					body = { template, params, format, preset };
				}
				const res = (await this.helpers.httpRequestWithAuthentication.call(this, 'ogmakeApi', {
					method: 'POST',
					url: `${baseUrl}${path}`,
					body,
					json: true,
				})) as IDataObject;
				const item: INodeExecutionData = { json: res, pairedItem: { item: i } };
				if (this.getNodeParameter('downloadBinary', i, false) as boolean) {
					const prop = this.getNodeParameter('binaryProperty', i, 'data') as string;
					const buf = await downloadPublic(this.helpers, String(res.url));
					const mime =
						outFormat === 'pdf' ? 'application/pdf' : `image/${outFormat === 'jpg' ? 'jpeg' : outFormat}`;
					item.binary = {
						[prop]: await this.helpers.prepareBinaryData(Buffer.from(buf), `ogmake.${outFormat}`, mime),
					};
				}
				out.push(item);
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, {
					itemIndex: i,
					message: (error as Error).message,
				});
			}
		}
		return [out];
	}
}
