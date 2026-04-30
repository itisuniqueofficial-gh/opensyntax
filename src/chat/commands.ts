export const commandHelp = [
	'/help - show commands',
	'/clear - clear messages',
	'/exit - close OpenSyntax',
	'/config - open provider setup',
	'/provider - show provider',
	'/model [name] - show or change model',
	'/stream on - enable streaming',
	'/stream off - disable streaming',
	'/reset - reset chat session',
	'/about - show version info',
	'/doctor - run local diagnostics',
	'/copy last - copy last assistant response',
	'/copy all - copy conversation',
	'/paste - send clipboard text as prompt'
];

export function isCommand(value: string): boolean {
	return value.trim().startsWith('/');
}

export function parseCommand(value: string): {name: string; arg: string} {
	const [name = '', ...rest] = value.trim().split(/\s+/);
	return {name: name.toLowerCase(), arg: rest.join(' ')};
}
