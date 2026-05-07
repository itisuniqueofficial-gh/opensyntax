import prompts from 'prompts';

export async function promptUser(message = '> '): Promise<string | undefined> {
  const response = await prompts({type: 'text', name: 'value', message});
  return typeof response.value === 'string' ? response.value : undefined;
}
