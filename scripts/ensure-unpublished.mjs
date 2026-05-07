const [version] = process.argv.slice(2);

if (!version) {
  throw new Error('Expected a semantic-release next version argument.');
}

const response = await fetch(`https://registry.npmjs.org/opensyntax/${version}`);

if (response.status === 404) {
  process.exit(0);
}

if (!response.ok) {
  throw new Error(`Unable to verify npm publish status for opensyntax@${version}: ${response.status} ${response.statusText}`);
}

console.error(`opensyntax@${version} is already published on npm. Refusing to publish a duplicate version.`);
process.exit(1);
