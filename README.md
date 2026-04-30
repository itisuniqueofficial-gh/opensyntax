# OpenSyntax

OpenSyntax is a professional fullscreen terminal AI chatbot CLI with provider setup inside the terminal UI.

## Install

```bash
npm install -g opensyntax
```

## First Run

Run OpenSyntax and complete the provider setup modal inside the same terminal window:

```bash
opensyntax
```

Config is saved to `~/.opensyntax/config.json`. No `.env` file is required.

## Providers

OpenSyntax uses an OpenAI-compatible provider adapter system.

- NVIDIA: `https://integrate.api.nvidia.com/v1`
- OpenAI: `https://api.openai.com/v1`
- OpenRouter: `https://openrouter.ai/api/v1`
- Groq: `https://api.groq.com/openai/v1`
- Together AI: `https://api.together.xyz/v1`
- Mistral: `https://api.mistral.ai/v1`
- DeepSeek: `https://api.deepseek.com/v1`
- Cerebras: `https://api.cerebras.ai/v1`
- Ollama local: `http://localhost:11434/v1`
- Custom OpenAI-compatible endpoint

Ollama does not require an API key. All other built-in hosted providers require one.

## Fullscreen Chat UI

The default `opensyntax` command opens a same-window fullscreen UI with:

- Fixed header: `OpenSyntax | Provider | Model | Mode: Chat`
- Internally rendered chat panel
- Responsive side or bottom status panel
- Fixed multiline input at the bottom
- Provider setup modal
- Loading and streaming response state
- Markdown and fenced-code rendering
- API health, token placeholder, and response time status

## Markdown And Syntax Highlighting

Assistant responses support terminal-safe Markdown rendering:

- headings
- bold and italic text
- inline code
- fenced code blocks
- links
- ordered and unordered lists
- blockquotes

Code blocks are rendered in bordered panels and highlighted with `cli-highlight` for common languages including JavaScript, TypeScript, JSX, TSX, HTML, CSS, JSON, Markdown, Bash, Python, Java, C, C++, SQL, and YAML.

## Chat Commands

Inside the fullscreen UI:

- `/help` shows commands
- `/clear` clears messages
- `/exit` closes OpenSyntax
- `/config` opens provider setup
- `/provider` shows provider details
- `/model` shows the current model
- `/model <name>` changes the model
- `/stream on` enables streaming
- `/stream off` disables streaming
- `/reset` resets the chat session
- `/about` shows version info
- `/doctor` runs diagnostics in the UI
- `/copy last` copies the last assistant response
- `/copy all` copies the current conversation
- `/paste` sends clipboard text as a prompt

## Keyboard Shortcuts

- `Enter` sends the message
- `Shift+Enter` or `Alt+Enter` inserts a newline when supported by the terminal
- `Ctrl+V` pastes clipboard text
- `Ctrl+A` moves to the start of input
- `Ctrl+E` moves to the end of input
- `Ctrl+U` clears text before the cursor
- `Ctrl+K` clears text after the cursor
- `Ctrl+W` deletes the previous word
- `Up` and `Down` navigate input history
- `Ctrl+L` clears chat
- `Ctrl+O` opens config
- `Ctrl+R` copies the last assistant response
- `Ctrl+C` cancels the current request
- Press `Ctrl+C` again to exit
- `Esc` closes modal panels

## Direct Ask Mode

```bash
opensyntax ask "Explain closures in JavaScript"
opensyntax ask "Write a React button" --provider nvidia --model meta/llama-3.1-70b-instruct
opensyntax ask "Return JSON only" --json
```

Options:

- `--provider <provider>` overrides the saved provider
- `--model <model>` overrides the saved model
- `--base-url <url>` overrides the saved base URL
- `--no-stream` disables streaming for the request
- `--json` asks for JSON-only output
- `--markdown` asks for Markdown output

## Config Command

```bash
opensyntax config
opensyntax config --view
opensyntax config --test
opensyntax config --reset
```

The config command never prints full API keys. Secrets are masked like `sk-****abcd`.

## Doctor Command

```bash
opensyntax doctor
```

Doctor checks:

- Node.js version
- OpenSyntax package version
- config file path and parse status
- provider support
- API key presence where required
- base URL validity
- model setting
- provider network/API health
- write permission for `~/.opensyntax`
- warning if config would be inside the project folder

## Troubleshooting

- Invalid API key: run `opensyntax config` and update the key.
- Model not found: use `/model <name>` or `opensyntax config`.
- Rate limit: wait and retry, or use another provider.
- Network failure: check base URL and provider status.
- Ollama failure: ensure `ollama serve` is running and the model is pulled.

## Security

- Never commit API keys or npm tokens.
- OpenSyntax never prints full secrets.
- Config files are written with private permissions where supported.
- NPM publishing uses the GitHub repository secret `NPM_TOKEN`.

## Development

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## Roadmap

- Better model discovery per provider
- Theme customization
- Export chat transcripts
- More robust keyboard handling across terminal emulators
- Coding agent features later, not in v0.2.0
