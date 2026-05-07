# OpenSyntax

OpenSyntax is a terminal-based AI coding agent for real engineering workflows. It can chat, inspect a workspace, call typed tools, edit files safely, run shell commands with permissions, understand git state, persist sessions, and stream model responses.

## File Tree

```txt
terminal-agent/
├── package.json
├── tsconfig.json
├── README.md
├── .env.example
├── .gitignore
├── src/
│   ├── index.ts
│   ├── cli.ts
│   ├── agent/
│   │   ├── loop.ts
│   │   ├── planner.ts
│   │   ├── orchestrator.ts
│   │   ├── permissions.ts
│   │   └── prompts.ts
│   ├── tools/
│   │   ├── filesystem.ts
│   │   ├── search.ts
│   │   ├── shell.ts
│   │   ├── git.ts
│   │   ├── diff.ts
│   │   ├── registry.ts
│   │   └── types.ts
│   ├── model/
│   │   ├── provider.ts
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   ├── gemini.ts
│   │   └── types.ts
│   ├── ui/
│   │   ├── chat.ts
│   │   ├── renderer.ts
│   │   ├── prompts.ts
│   │   └── markdown.ts
│   ├── session/
│   │   ├── store.ts
│   │   └── history.ts
│   ├── config/
│   │   ├── config.ts
│   │   └── defaults.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── paths.ts
│   │   ├── errors.ts
│   │   ├── schema.ts
│   │   └── streams.ts
│   └── tests/
│       ├── tools.test.ts
│       └── agent.test.ts
```

## Install

```bash
npm install
npm run build
npm link
```

## Configuration

Create a config file:

```bash
opensyntax config --provider openai --model gpt-4o-mini --api-key "$OPENAI_API_KEY"
```

Or use environment variables:

```bash
cp .env.example .env
export OPENSYNTAX_PROVIDER=openai
export OPENSYNTAX_MODEL=gpt-4o-mini
export OPENSYNTAX_API_KEY=sk-...
```

Supported providers:

- `openai`
- `openrouter`
- `anthropic`
- `gemini`

OpenAI-compatible providers support streamed text and tool calls. Anthropic and Gemini adapters provide streamed terminal output from their response text and can be extended with native tool mapping.

## Usage

```bash
agent "fix TypeScript errors"
agent "refactor auth module"
agent "add dark mode"
agent "explain this repository"
agent "find performance bottlenecks"
opensyntax
```

Interactive commands:

- `/help` shows commands
- `/clear` clears the terminal
- `/model` shows or changes the active model
- `/tools` lists registered tools
- `/plan` shows task progress
- `/session` lists saved sessions
- `/diff` asks the agent to inspect git diff
- `/undo` explains safe reversal workflow
- `/exit` quits

## Permissions

Permission levels:

- `read-only`: read/search/git inspection only
- `workspace-write`: permits workspace writes, no shell execution
- `shell-safe`: permits shell execution but asks before risky commands
- `full-access`: permits shell execution after explicit risky-action prompts from tools

Risky command patterns include `rm`, `sudo`, `git reset`, `git clean`, force push, `chmod`, `chown`, `docker prune`, recursive deletes, and system package installs.

## Architecture

The system is organized around a small autonomous loop and a typed tool registry.

- `src/agent/loop.ts` owns conversation state, plan state, model streaming, tool execution, and session persistence.
- `src/model/*` implements provider adapters with streaming support and shared request types.
- `src/tools/*` exposes validated Zod schemas for filesystem, search, shell, git, diff, and permission tools.
- `src/session/*` persists conversations, plans, and tool logs under `~/.opensyntax/sessions`.
- `src/ui/*` provides a compact terminal UX with colored panels, markdown rendering, and command prompts.

## Tool System

The model never directly manipulates files or shells. It emits structured tool calls. The orchestrator validates each call with Zod, applies permission checks, executes the tool, records the result, and feeds the observation back into the conversation.

Required tools implemented:

- `read_file`
- `write_file`
- `patch_file`
- `search_files`
- `list_files`
- `execute_command`
- `git_status`
- `git_diff`
- `ask_permission`
- `diff_preview`

## Agent Loop

For each request, OpenSyntax:

1. Records the user message.
2. Creates or updates a plan.
3. Inspects git state once per session.
4. Streams model output.
5. Executes validated tool calls.
6. Returns tool observations to the model.
7. Continues until no more tool calls are requested.
8. Persists the session and summarizes output.

## Development

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

## Automatic Releases

OpenSyntax uses GitHub Actions and semantic-release to publish production releases from `main`.

Required repository secrets:

- `NPMJS_TOKEN`: npm automation token with publish access for the `opensyntax` package.
- `GITACCESS_TOKEN`: GitHub token with permission to push release commits/tags and create GitHub Releases.

On every push to `main`, `.github/workflows/release.yml` performs the release pipeline:

1. Checks out the full git history and tags.
2. Installs dependencies with `npm ci`, falling back to `npm install` only if needed.
3. Runs `npm run lint --if-present`.
4. Runs `npm run typecheck --if-present`.
5. Runs `npm test --if-present`.
6. Runs `npm run build --if-present`.
7. Verifies the package with `npm pack --dry-run`.
8. Runs `semantic-release` to bump versions, publish to npm, create/update tags, update `CHANGELOG.md`, and create a GitHub Release.

Version bump rules:

- `BREAKING CHANGE` or conventional commit `!` triggers a major release.
- `feat:` triggers a minor release.
- Any other commit type defaults to a patch release.

Release commits use `chore(release): X.Y.Z [skip ci]` to prevent infinite release loops. Published releases include generated notes, install and upgrade commands, npm and GitHub links, and an npm tarball attachment when available.

Manual releases can be started from GitHub by opening Actions, selecting `Release`, and choosing `Run workflow` on `main`.

## Example Screen

```txt
OpenSyntax | openai/gpt-4o-mini | shell-safe | /repo
Type /help for commands. Ctrl+C or /exit to quit.

you: fix TypeScript errors
· tool git_status
· thinking with openai/gpt-4o-mini
· tool execute_command
· tool patch_file
```
