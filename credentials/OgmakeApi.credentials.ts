import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OgmakeApi implements ICredentialType {
	name = 'ogmakeApi';

	displayName = 'Ogmake API';

	icon = 'file:ogmake.svg' as const;

	documentationUrl = 'https://ogmake.com/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your og_live_… API key from the ogmake dashboard',
		},
		{
			displayName: 'Key ID',
			name: 'keyId',
			type: 'string',
			default: '',
			description: 'The k_… key ID. Only needed for the Build Signed URL operation.',
		},
		{
			displayName: 'Signing Secret',
			name: 'signingSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Base64 signing secret shown once when the key was created. Only needed for Build Signed URL; it never leaves n8n.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://ogmake.com',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
	};

	test: ICredentialTestRequest = {
		request: { baseURL: '={{$credentials.baseUrl}}', url: '/v1/usage' },
	};
}
