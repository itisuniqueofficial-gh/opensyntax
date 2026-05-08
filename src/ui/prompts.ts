import prompts from 'prompts';
import {suggestSlashCommands} from './autocomplete.js';

export async function promptUser(message = '> '): Promise<string | undefined> {
  const response = await prompts({
    type: 'text',
    name: 'value',
    message,
    suggest: (input: string) => input.startsWith('/') ? Promise.resolve(suggestSlashCommands(input)) : Promise.resolve([])
  } as any, {
    onCancel: () => {
      process.stdout.write('Interrupted by user. Partial progress saved.\n');
      return false;
    }
  });
  return typeof response.value === 'string' ? response.value : undefined;
}
