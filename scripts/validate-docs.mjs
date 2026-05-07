import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const docsDir = join(root, 'docs');
const requiredFiles = [
  'index.html',
  'installation.html',
  'getting-started.html',
  'providers.html',
  'commands.html',
  'configuration.html',
  'usage.html',
  'troubleshooting.html',
  'safety.html',
  'release-system.html',
  'contributing.html',
  '404.html',
  'sitemap.xml',
  'robots.txt',
  'manifest.json',
  '.nojekyll',
  'CNAME',
  'assets/css/style.css',
  'assets/js/main.js',
];

const errors = [];

function fail(message) {
  errors.push(message);
}

if (!existsSync(docsDir) || !statSync(docsDir).isDirectory()) {
  fail('docs directory is missing');
} else {
  for (const file of requiredFiles) {
    if (!existsSync(join(docsDir, file))) fail(`required docs file is missing: ${file}`);
  }

  const cnamePath = join(docsDir, 'CNAME');
  if (existsSync(cnamePath)) {
    const cname = readFileSync(cnamePath, 'utf8').trim();
    if (cname !== 'os.itisuniqueofficial.com') fail('docs/CNAME must contain only os.itisuniqueofficial.com');
  }

  const htmlFiles = walk(docsDir).filter((file) => extname(file) === '.html');
  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    const relative = normalize(file.slice(docsDir.length + 1)).replaceAll('\\', '/');

    for (const token of ['<title>', 'name="description"', 'rel="canonical"', 'property="og:title"', 'property="og:url"', 'name="twitter:card"']) {
      if (!html.includes(token)) fail(`${relative} is missing ${token}`);
    }

    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = match[1];
      if (isExternalOrPageLocal(url)) continue;
      const target = url.split('#')[0].split('?')[0];
      if (!target) continue;
      if (target.startsWith('/')) {
        fail(`${relative} uses root-relative path ${url}; use docs-relative paths for GitHub Pages compatibility`);
        continue;
      }
      if (!existsSync(join(docsDir, target))) fail(`${relative} references missing asset/page: ${url}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Docs validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Docs validation passed.');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function isExternalOrPageLocal(url) {
  return /^(https?:|mailto:|tel:|#)/.test(url) || url.startsWith('//');
}
