import {execFileSync} from 'node:child_process';

const [version, lastGitHead] = process.argv.slice(2);
const range = lastGitHead ? `${lastGitHead}..HEAD` : 'HEAD';
const raw = execFileSync('git', ['log', range, '--pretty=format:%B%x1e'], {encoding: 'utf8'}).trim();
const commits = raw.split('\x1e').map((entry) => entry.trim()).filter(Boolean);

const changes = commits
  .map((entry) => entry.split('\n')[0].trim())
  .filter((subject) => subject && !subject.startsWith('chore(release):'))
  .map((subject) => `- ${subject}`);

const summary = changes.length > 0
  ? `This release includes ${changes.length} validated change${changes.length === 1 ? '' : 's'} for the OpenSyntax terminal AI coding agent.`
  : 'This release publishes the latest validated OpenSyntax package build.';

process.stdout.write(`# OpenSyntax v${version}

## Summary
${summary}

## Changes
${changes.length > 0 ? changes.join('\n') : '- No user-facing commit messages were detected in this release range.'}

## Installation
\`\`\`bash
npm install -g opensyntax
\`\`\`

## Upgrade
\`\`\`bash
npm update -g opensyntax
\`\`\`

## Links
- NPM package: https://www.npmjs.com/package/opensyntax
- GitHub repository: https://github.com/itisuniqueofficial-gh/opensyntax
`);
