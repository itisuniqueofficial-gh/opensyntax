# OpenSyntax

OpenSyntax is a terminal-based AI chatbot CLI with provider setup inside the terminal UI.

## Install

```bash
npm install -g opensyntax
```

## Usage

Open the fullscreen terminal chat UI:

```bash
opensyntax
```

Ask a single prompt from the command line:

```bash
opensyntax ask "hello"
```

Other commands:

```bash
opensyntax config
opensyntax doctor
opensyntax version
```

## Provider Setup

On first run, OpenSyntax opens a setup modal inside the terminal UI.

You can select:

- NVIDIA
- OpenAI Compatible
- OpenRouter
- Custom API

The setup asks for:

- API key
- Base URL
- Model name

Configuration is saved locally to `~/.opensyntax/config.json`. OpenSyntax does not require a `.env` file or manual config file before first use.

Default NVIDIA base URL:

```text
https://integrate.api.nvidia.com/v1
```

Default NVIDIA model example:

```text
meta/llama-3.1-70b-instruct
```

## Chat Commands

Inside the chat UI:

- `/exit` closes OpenSyntax
- `/clear` clears messages
- `/config` opens provider setup
- `/model` shows or changes the model
- `/copy last` copies the last assistant response
- `/copy all` copies the current conversation
- `/paste` sends clipboard text as a prompt
- `/shortcuts` shows keyboard shortcuts
- `/help` shows command help

## Keyboard Shortcuts

- `Ctrl+V` pastes clipboard text into the input box
- `Left` and `Right` move the input cursor
- `Backspace` and `Delete` edit text around the cursor
- `Ctrl+A` moves to the start of input
- `Ctrl+E` moves to the end of input
- `Ctrl+U` clears text before the cursor
- `Ctrl+K` clears text after the cursor
- `Ctrl+W` deletes the previous word
- `Ctrl+L` clears chat messages
- `Ctrl+O` opens provider config
- `Ctrl+R` copies the last assistant response
- `Ctrl+C` exits OpenSyntax

## Release Automation

OpenSyntax uses GitHub Actions and semantic-release.

Conventional commit release rules:

- `feat:` creates a minor release
- `fix:` creates a patch release
- `BREAKING CHANGE:` creates a major release
- `chore:` does not create a release unless semantic-release is configured to do so

The release workflow runs type checks, lint, tests, and build before publishing to npm and creating a GitHub release.

## Security

Never commit API keys or NPM tokens.

NPM publishing uses the GitHub repository secret `NPM_TOKEN`. Do not hardcode tokens in source code, workflows, or config files.

## Development

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```
