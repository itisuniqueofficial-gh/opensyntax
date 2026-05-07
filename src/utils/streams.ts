export async function collectStream(stream: AsyncIterable<string>, onChunk?: (chunk: string) => void): Promise<string> {
  let output = '';
  for await (const chunk of stream) {
    output += chunk;
    onChunk?.(chunk);
  }
  return output;
}
