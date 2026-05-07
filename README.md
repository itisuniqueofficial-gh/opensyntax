<div align="center">

# OpenSyntax

### Terminal-first AI coding agent for real engineering work

OpenSyntax is a fast, workspace-aware AI coding agent that runs where developers already work: the terminal.

[![npm version](https://img.shields.io/npm/v/opensyntax?color=0ea5e9&label=npm)](https://www.npmjs.com/package/opensyntax)
[![npm downloads](https://img.shields.io/npm/dm/opensyntax?color=22c55e)](https://www.npmjs.com/package/opensyntax)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS%20recommended-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-supported-000000?logo=bun&logoColor=white)](https://bun.sh/)
[![GitHub stars](https://img.shields.io/github/stars/itisuniqueofficial-gh/opensyntax?style=flat&logo=github)](https://github.com/itisuniqueofficial-gh/opensyntax/stargazers)
[![Release](https://github.com/itisuniqueofficial-gh/opensyntax/actions/workflows/release.yml/badge.svg)](https://github.com/itisuniqueofficial-gh/opensyntax/actions/workflows/release.yml)

```bash
npm install -g opensyntax
opensyntax "fix TypeScript errors"
```

[Website](https://os.itisuniqueofficial.com/) · [npm](https://www.npmjs.com/package/opensyntax) · [GitHub](https://github.com/itisuniqueofficial-gh/opensyntax) · [Issues](https://github.com/itisuniqueofficial-gh/opensyntax/issues)

</div>

---

## What Is OpenSyntax?

OpenSyntax is a production-oriented terminal AI coding agent for developers who want AI assistance without leaving their shell. It can inspect your repository, understand git state, read and search files, apply safe patches, run validation commands, persist sessions, and stream model responses through a compact terminal interface.

It exists to make AI coding workflows feel native to engineering teams: explicit, auditable, scriptable, and close to the source code. Instead of hiding work behind a black-box editor integration, OpenSyntax exposes a clear tool loop where model decisions become validated tool calls and every filesystem, shell, and git operation is mediated by the agent runtime.

Use OpenSyntax when you want to:

- Ask questions about an unfamiliar codebase.
- Fix TypeScript, lint, build, or test failures from the terminal.
- Refactor files with minimal, reviewable diffs.
- Let an AI agent inspect git state before touching your worktree.
- Keep AI sessions local and resumable across terminal runs.

## Features

### Agent Experience

- **Interactive terminal chat** with streaming assistant output.
- **One-shot CLI prompts** for quick tasks from scripts or shell history.
- **Autonomous agent loop** that plans, acts, observes, and continues until complete.
- **Task planning** with `/plan` visibility inside interactive mode.
- **Session persistence** under `~/.opensyntax/sessions`.

### Coding Workflow

- **Workspace-aware file access** with path escape protection.
- **File search and content search** respecting project boundaries.
- **Safe file editing** through exact patch replacement and diff previews.
- **Git awareness** with branch, dirty worktree, recent commits, and diff inspection.
- **Validation command support** for tests, builds, typechecks, and custom shell tasks.

### Safety And Control

- **Permission levels** from read-only to full shell access.
- **Risky command detection** for destructive shell operations.
- **User approval prompts** before high-risk actions.
- **Concurrent modification checks** using file hashes.
- **No blind overwrite behavior** for large or unexpected file changes.

### Model And Tooling

- **Multi-provider model abstraction** for OpenAI, Anthropic, Gemini, and OpenRouter.
- **OpenAI-compatible streaming and tool calling** foundation.
- **Typed tool registry** using Zod schemas.
- **Markdown rendering** with terminal syntax highlighting.
- **Modern TypeScript ESM architecture** with minimal dependencies.

## Installation

### Requirements

- Node.js `>=20`; Node.js 22 LTS is recommended for the most predictable npm dependency support
- npm `>=10` recommended
- Bun supported for global installation and local development
- Git installed for repository-aware features
- macOS, Linux, and Windows terminals are supported

### Install Globally With npm

```bash
npm install -g opensyntax
```

### Install Globally With Bun

```bash
bun add -g opensyntax
```

### Run Without Installing

```bash
npx opensyntax
```

### Local Development Setup

```bash
git clone https://github.com/itisuniqueofficial-gh/opensyntax.git
cd opensyntax
npm install
npm run build
npm link
```

## Quick Start

Start the interactive agent:

```bash
opensyntax
```

Configure your provider:

```bash
opensyntax config --provider openai --model gpt-4o-mini --api-key "$OPENAI_API_KEY"
```

Or launch the guided provider setup wizard:

```bash
opensyntax auth
```

Ask a one-shot coding question:

```bash
opensyntax "explain this repository"
```

Run a coding workflow:

```bash
opensyntax "fix TypeScript errors and run the test suite"
```

Use the shorter binary alias:

```bash
agent "find performance bottlenecks"
```

Check local configuration and workspace state:

```bash
opensyntax doctor
```

## Configuration

OpenSyntax reads configuration from `~/.opensyntax/config.json`, environment variables, and CLI flags. CLI flags override environment and saved config for the current run.

## Workspace Instructions

OpenSyntax automatically loads workspace instructions from `OPENSYNTAX.md` and OpenCode-compatible `AGENTS.md` files and injects them into the runtime system prompt for every session.

Supported locations are merged from broadest to nearest scope:

- `~/.opensyntax/OPENSYNTAX.md`
- `OPENSYNTAX.md` or `AGENTS.md` in parent directories
- `.opensyntax/OPENSYNTAX.md` or `.opensyntax/AGENTS.md` in parent directories
- nearest workspace or subproject instruction file

Within the same directory, file priority is `OPENSYNTAX.md`, `AGENTS.md`, `.opensyntax/OPENSYNTAX.md`, then `.opensyntax/AGENTS.md`. Broader files load first; nearer files are later in the prompt and override broader guidance when instructions conflict.

Create a starter file:

```bash
opensyntax rules init
```

Example:

```md
# OPENSYNTAX.md

## Stack
- TypeScript
- Bun
- Cloudflare Pages

## Rules
- Keep code modular.
- Avoid unnecessary abstractions.
- Keep edits minimal.

## Testing
- Run typecheck after edits.
- Run tests before completion.

## Shell Rules
- Never use npm. Use bun only.

## Forbidden Paths
- Do not edit dist/, build/, coverage/, or node_modules/.
```

Interactive rule commands:

```txt
/rules
/rules debug
/rules reload
/rules open
/rules init
```

Rules can include YAML frontmatter:

```md
---
priority: high
autoTest: true
shellSafety: strict
preferredProvider: anthropic
---
```

Rules affect planning, prompt context, filesystem edits, and shell commands. For example, generated-path rules block edits to `dist/`, `build/`, `coverage/`, and `node_modules/`; package-manager rules such as "Use bun only" block `npm` commands and suggest using Bun instead.

Core safety protections always override workspace instructions. Workspace rules cannot bypass permission prompts, destructive command protection, secret masking, workspace boundary checks, or the user's latest explicit instruction. Use `.opensyntaxignore` or `.gitignore` to ignore directories such as `dist`, `build`, `.next`, or generated workspaces during rule discovery.

## Workspace Intelligence And Autonomy

OpenSyntax includes read-only repository intelligence commands that help the agent inspect a project without wasting model tokens on full-file dumps:

```txt
/repo              Summarize package metadata, file types, folders, and git state
/architecture      Show a compact architecture map
/dependencies      Show scripts, dependencies, and dev dependencies
/symbols [query]   Search TypeScript/JavaScript symbols
/search <query>    Search workspace content
/find <query>      Fuzzy file-name search
/git               Show branch, status, and recent commits
/diff              Summarize staged and unstaged diffs
/commit            Draft a commit message from current changes
/pr                Draft a pull request outline
/tasks             Show the active task plan
/progress          Show completion progress
/auto              Enable autonomous continuation for safe tool-assisted workflows
/memory            Show session memory summary
/plugins           Show built-in tools and workspace plugin manifests
```

Autonomous mode does not bypass safety. Risky shell commands, destructive git operations, external path access, and secret exposure protections still require approval or remain blocked.

### Config Command

```bash
opensyntax config \
  --provider openai \
  --model gpt-4o-mini \
  --api-key "$OPENAI_API_KEY" \
  --permission shell-safe
```

Supported provider values:

- `openai`
- `anthropic`
- `gemini`
- `openrouter`
- `groq`
- `together`
- `nvidia`
- `deepseek`
- `mistral`
- `ollama`
- `lmstudio`
- `azure-openai`

Supported permission levels:

| Level | Allowed | Requires Approval | Blocked |
| --- | --- | --- | --- |
| `read-only` | Read files, list folders, search files, `git_status`, `git_diff`. | None. | File/folder writes, deletes, moves, copies, and modifying shell commands. |
| `workspace-write` | Create/edit/patch files, create folders, copy/move/rename files and folders inside the workspace. | Overwrites, deletes, recursive operations, lockfiles, `.env`, and secret-looking paths. | Outside-workspace edits, `.git`, workspace root, home/system folders, shell execution. |
| `shell-safe` | `workspace-write` tools plus safe shell commands. | Package installs, side-effectful builds, deletes, `git reset/clean`, `chmod/chown`, Docker prune. | Silent destructive shell operations. |
| `full-access` | Broadest workspace and shell capability. | All destructive or sensitive actions still require explicit approval. | Hard blocks such as deleting `.git`, workspace root, home, or OS folders. |

### Environment Variables

```bash
export OPENSYNTAX_PROVIDER=openai
export OPENSYNTAX_MODEL=gpt-4o-mini
export OPENSYNTAX_API_KEY=sk-...
export OPENSYNTAX_BASE_URL=https://api.openai.com/v1
export OPENSYNTAX_TEMPERATURE=0.2
export OPENSYNTAX_MAX_TOKENS=4096
```

Provider-specific API key fallbacks are also supported:

```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GEMINI_API_KEY=...
```

### Provider Examples

OpenAI:

```bash
opensyntax config --provider openai --model gpt-4o-mini --api-key "$OPENAI_API_KEY"
```

Anthropic:

```bash
opensyntax config --provider anthropic --model claude-3-5-sonnet-latest --api-key "$ANTHROPIC_API_KEY"
```

Gemini:

```bash
opensyntax config --provider gemini --model gemini-1.5-pro --api-key "$GEMINI_API_KEY"
```

OpenRouter:

```bash
opensyntax config \
  --provider openrouter \
  --model openai/gpt-4o-mini \
  --api-key "$OPENROUTER_API_KEY" \
  --base-url https://openrouter.ai/api/v1
```

Local providers:

```bash
opensyntax auth --provider ollama
opensyntax auth --provider lmstudio
```

### Authentication Storage

Provider credentials are stored in `~/.opensyntax/providers.json`. Secrets are encrypted locally using Node.js crypto and are never printed in full. Environment variables remain supported as a fallback for CI and ephemeral environments.

Supported login methods are provider-specific:

- API key login for OpenAI, Anthropic, Gemini, OpenRouter, NVIDIA NIM, Groq, DeepSeek, Mistral, Together AI, and Azure OpenAI.
- Environment variable login for `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `NVIDIA_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `MISTRAL_API_KEY`, `TOGETHER_API_KEY`, and `AZURE_OPENAI_API_KEY`.
- Local provider login for Ollama and LM Studio by checking the local HTTP servers and fetching models.
- Browser OAuth and device-code helpers exist for providers that expose real public CLI OAuth/device endpoints. OpenSyntax does not show or claim these methods for providers that only support API keys.

Authentication commands:

```bash
opensyntax auth              # connect or update a provider
opensyntax login             # alias for auth
opensyntax logout openai     # remove stored credentials
opensyntax providers         # list provider connection state
opensyntax models            # discover models for current provider
opensyntax settings          # interactive settings manager
```

Inside chat, use `/auth debug` to inspect provider auth state, credential source, cached models, validation status, and endpoint without exposing secrets.

## CLI Usage

```bash
opensyntax [options] [prompt...]
agent [options] [prompt...]
```

Options:

| Option | Description |
| --- | --- |
| `-m, --model <model>` | Override the configured model for this run. |
| `-p, --provider <provider>` | Override provider: `openai`, `anthropic`, `gemini`, or `openrouter`. |
| `--permission <level>` | Override permission level for this run. |
| `--session <id>` | Resume a specific saved session. |
| `-V, --version` | Print the CLI version. |
| `-h, --help` | Show CLI help. |

Subcommands:

| Command | Description |
| --- | --- |
| `opensyntax config` | Write local provider, model, API key, base URL, and permission settings. |
| `opensyntax auth` | Launch the provider setup wizard. |
| `opensyntax login` | Alias for `auth`. |
| `opensyntax logout [provider]` | Remove stored provider credentials. |
| `opensyntax providers` | List supported and connected providers. |
| `opensyntax models [provider]` | Discover available models where the provider exposes a models endpoint. |
| `opensyntax settings` | Open the interactive settings manager. |
| `opensyntax doctor` | Print workspace, provider, model, API key, and permission diagnostics. |

## Interactive Commands

Inside the interactive terminal session, use slash commands for fast control:

| Command | Description |
| --- | --- |
| `/help` | Show available interactive commands. |
| `/clear` | Clear the terminal screen. |
| `/provider` | Switch the default provider. |
| `/provider <id>` | Switch directly to a connected provider, for example `/provider openai`. |
| `/providers` | Show provider connection state. |
| `/model` | Show the active provider and model. |
| `/model <name>` | Switch the active model for the current session. |
| `/models` | List discovered models for the active provider. |
| `/tools` | List registered tools available to the agent. |
| `/plan` | Show the current task plan and progress state. |
| `/session` | List saved local sessions. |
| `/diff` | Ask the agent to inspect and summarize the current git diff. |
| `/auth` | Show connected authentication state. |
| `/login` | Connect or update a provider. |
| `/logout` | Remove stored provider credentials. |
| `/undo` | Show the safe reversal workflow. OpenSyntax does not run destructive undo automatically. |
| `/exit` | Exit the interactive session. |

## Example Workflows

Explain a repository:

```bash
opensyntax "explain the architecture of this repository"
```

Fix failing checks:

```bash
opensyntax "run the typecheck, fix the errors, then run tests"
```

Refactor safely:

```bash
opensyntax "refactor the config loader to make provider validation clearer"
```

Review local changes:

```bash
opensyntax "review my git diff for bugs and missing tests"
```

Inspect performance:

```bash
opensyntax "find possible performance bottlenecks in the terminal rendering path"
```

## Architecture

OpenSyntax is intentionally small and modular. The model never directly manipulates files or shells; it requests typed tools, and the runtime validates and executes those tools.

```txt
User request
    ↓
Agent loop
    ↓
Planner + system prompt
    ↓
Model provider stream
    ↓
Structured tool calls
    ↓
Zod validation + permissions
    ↓
Tool execution
    ↓
Observation returned to model
    ↓
Summary + persisted session
```

Core components:

- **Agent loop**: coordinates planning, model streaming, tool execution, observations, and persistence.
- **Tool system**: exposes filesystem, folder, search, shell, git, diff, and permission tools through typed schemas.
- **Provider abstraction**: isolates model-specific APIs behind a common streaming interface.
- **Terminal UI**: renders compact status lines, markdown, code blocks, prompts, and panels.
- **Session store**: persists messages, plans, and tool logs in local JSON files.
- **Safety system**: applies permissions, approval prompts, path boundaries, git dirty warnings, diff previews, audit logs, and file hash/mtime checks.

## Project Structure

```txt
src/
├── agent/
│   ├── loop.ts            # Autonomous agent loop and tool orchestration
│   ├── orchestrator.ts    # Model provider selection
│   ├── permissions.ts     # User approval prompts
│   ├── planner.ts         # Task plan state and rendering
│   └── prompts.ts         # System prompt construction
├── config/
│   ├── config.ts          # Config loading, env overrides, and persistence
│   └── defaults.ts        # Default provider, model, and system prompt
├── model/
│   ├── anthropic.ts       # Anthropic provider adapter
│   ├── gemini.ts          # Gemini provider adapter
│   ├── openai.ts          # OpenAI/OpenRouter compatible adapter
│   ├── provider.ts        # Provider interface and shared errors
│   └── types.ts           # Model messages, tool calls, and stream events
├── session/
│   ├── history.ts         # Session and plan record types
│   └── store.ts           # Local session persistence
├── tools/
│   ├── audit.ts           # JSONL audit log for file operations
│   ├── diff.ts            # Unified diff preview tool
│   ├── filesystem.ts      # Read, write, patch, copy, move, delete, stat tools
│   ├── folder.ts          # Folder create/list/copy/move/delete tools
│   ├── git.ts             # Git status and diff tools
│   ├── patch.ts           # Text, unified diff, and JSON patch helpers
│   ├── path-safety.ts     # Workspace boundary and protected path checks
│   ├── permissions.ts     # Permission mode decisions
│   ├── registry.ts        # Tool registry and validation
│   ├── search.ts          # File listing and content search
│   ├── shell.ts           # Shell execution with risk controls
│   └── types.ts           # Tool interfaces and permissions
├── ui/
│   ├── chat.ts            # Interactive slash-command loop
│   ├── markdown.ts        # Terminal markdown rendering
│   ├── prompts.ts         # User input prompts
│   └── renderer.ts        # Status and panel rendering
├── utils/
│   ├── errors.ts          # Error helpers
│   ├── logger.ts          # Terminal logger
│   ├── paths.ts           # Workspace path safety
│   ├── schema.ts          # Zod-to-JSON-schema helper
│   └── streams.ts         # Stream utilities
├── tests/
│   ├── agent.test.ts
│   └── tools.test.ts
├── cli.ts                 # CLI entrypoint
└── index.ts               # Public exports
```

## Tool System

OpenSyntax tools are normal TypeScript modules with explicit schemas and controlled execution. The model never reads or writes the filesystem directly; every operation goes through validation, workspace boundary checks, permission checks, optional approval, diff generation, result verification, and audit logging.

Implemented tools:

| Tool | Purpose |
| --- | --- |
| `read_file` | Read a workspace file with line-windowing and hash metadata. |
| `read_many_files` | Read multiple workspace files with per-file byte limits. |
| `write_file` | Write a workspace file with diff output, overwrite checks, hash/mtime checks, and audit logging. |
| `create_file` | Create a new workspace file and parent folders. |
| `patch_file` | Apply exact text replacement, unified diff patches, or JSON patch operations. |
| `apply_patch` | Apply a unified diff patch to a workspace file. |
| `replace_in_file` | Replace exact text with optional all-occurrence mode. |
| `insert_into_file` | Insert text before/after a match or at a line boundary. |
| `append_to_file` | Append text while preserving line endings. |
| `delete_file` | Delete a file after explicit approval. |
| `rename_file` | Rename a file inside the workspace. |
| `copy_file` | Copy a file inside the workspace. |
| `move_file` | Move a file inside the workspace. |
| `list_folder` | List folder contents, optionally recursively. |
| `create_folder` | Create nested folders. |
| `delete_folder` | Delete folders with exact typed confirmation for recursive deletes. |
| `copy_folder` | Recursively copy folders with size/risk checks. |
| `move_folder` | Move folders safely inside the workspace. |
| `rename_folder` | Rename folders safely inside the workspace. |
| `list_files` | List files within the workspace. |
| `search_files` | Search workspace content. |
| `stat_path` | Return path metadata such as file/folder type, size, and mtime. |
| `file_exists` | Check whether a workspace path exists. |
| `execute_command` | Run non-interactive shell commands with timeout and risk checks. |
| `git_status` | Inspect branch, dirty state, and recent commits. |
| `git_diff` | Show staged or unstaged git diffs. |
| `diff_preview` / `generate_diff` | Generate unified diff previews. |
| `ask_permission` | Request explicit approval from the user. |

All file-operation tools return structured results with `ok`, `tool`, `path`, `changed`, `diff`, `message`, and optional `error` or `warnings` fields.

## Safety Features

OpenSyntax is designed to be useful without being reckless.

- **Workspace path guardrails** prevent tools from reading or writing outside the current workspace unless explicitly extended in code.
- **Git-first context** means the agent inspects repository state before edits in a session.
- **Patch-based editing** supports exact replacements, line inserts, appends, unified diffs, and JSON patches while preserving line endings and final newlines.
- **Concurrent modification detection** uses file hashes and optional modified-time checks to avoid overwriting changed files.
- **Git dirty warnings** are emitted before editing tracked files with uncommitted changes.
- **Audit logs** for successful mutating file/folder operations are written to `~/.opensyntax/audit/file-operations.jsonl`.
- **Hard blocks** refuse deleting or editing `.git`, the workspace root, the home directory, and common OS folders.
- **Approval prompts** are required for deletes, overwrites, recursive operations, `.env`, lockfiles, secret-looking paths, and destructive shell commands.
- **Risky command detection** prompts before commands involving `rm`, `sudo`, `git reset`, `git clean`, force push, `chmod`, `chown`, package manager installs, recursive deletes, and Docker prune operations.
- **Permission levels** let teams choose the right level of automation for each repository.
- **No automatic destructive undo**; reversals should be requested explicitly and reviewed through git diff.

## Terminal Access

OpenSyntax detects the active OS and shell before running commands. It supports Windows, macOS, Linux, WSL, Ubuntu, Debian, Kali, Arch, Fedora, CentOS, Alpine, PowerShell, PowerShell Core, CMD, Bash, Zsh, Fish, and Git Bash detection.

Command execution uses `execute_command`, which returns structured output including `command`, `cwd`, `exitCode`, `stdout`, `stderr`, `durationMs`, `timedOut`, and `cancelled`. Stdout and stderr stream live in the terminal and are secret-masked before display or model feedback.

Terminal permission modes:

| Mode | Behavior |
| --- | --- |
| `read-only` | Allows read-only commands such as `dir`, `ls`, `cat`, `type`, `git status`, `git diff`, and version checks. |
| `workspace-safe` | Allows tests, builds, lint, typecheck, git read operations, and package-manager read operations. |
| `workspace-write` | Allows workspace-generating commands and dependency installs with approval. |
| `shell-safe` | Allows normal developer commands; prompts for installs, network, unknown write, and risky commands. |
| `full-os` | Requires explicit approval for OS-level commands such as `apt install`, `winget install`, `brew install`, `systemctl`, `netsh`, or `setx`. |
| `danger` | Requires typed confirmation for destructive commands such as `rm -rf`, `Remove-Item -Recurse -Force`, `git reset --hard`, `git clean -fd`, `format`, `diskpart`, `mkfs`, or `docker system prune`. |

OpenSyntax blocks downloaded script execution such as `curl ... | sh`, `wget ... | bash`, and `Invoke-WebRequest ... | iex` unless the user explicitly confirms the exact dangerous command.

Example folder-delete approval:

```txt
OpenSyntax wants to delete folder:

docs/old

Files: 18
Folders: 2
Size: 124 KB

Type exactly:
delete docs/old
```

## Development

Clone and install:

```bash
git clone https://github.com/itisuniqueofficial-gh/opensyntax.git
cd opensyntax
npm install
```

Run in development mode:

```bash
npm run dev
```

Build production output:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Run type validation and lint gate:

```bash
npm run typecheck
npm run lint
```

Verify package contents:

```bash
npm pack --dry-run
```

Available scripts:

| Script | Description |
| --- | --- |
| `npm run dev` | Run the TypeScript CLI with `tsx`. |
| `npm run build` | Bundle ESM output and declaration files with `tsup`. |
| `npm start` | Run the built CLI from `dist/cli.js`. |
| `npm test` | Run Vitest tests. |
| `npm run lint` | Run the TypeScript lint/type gate. |
| `npm run typecheck` | Run `tsc --noEmit`. |
| `npm run release` | Run semantic-release. Intended for CI. |
| `npm run clean` | Remove `dist`. |

## Release System

OpenSyntax uses GitHub Actions and semantic-release for automated production releases.

On every push to `main`, the release workflow:

1. Checks out the full repository history and tags.
2. Installs dependencies using `npm ci`, with `npm install` fallback.
3. Runs lint, typecheck, tests, and build when scripts exist.
4. Verifies package contents with `npm pack --dry-run`.
5. Determines the next semantic version from commit messages.
6. Updates `package.json`, `package-lock.json`, and `CHANGELOG.md`.
7. Publishes the package to npm with public access.
8. Creates or updates the git tag using `vX.X.X` format.
9. Creates a GitHub Release with generated notes and tarball assets.

Required repository secrets:

- `NPMJS_TOKEN`: npm automation token with publish access for `opensyntax`.
- `GITACCESS_TOKEN`: GitHub token with repository contents write access for release commits, tags, and releases.

Version rules:

- `BREAKING CHANGE` or conventional commit `!` triggers a major release.
- `feat:` triggers a minor release.
- Other conventional commit types default to a patch release.

Release commits are created as `chore(release): X.Y.Z [skip ci]` to prevent infinite release loops. The workflow also supports manual `workflow_dispatch` runs from the GitHub Actions tab.

## Screenshots And Demos

### Terminal Session

```txt
OpenSyntax | openai/gpt-4o-mini | shell-safe | /repo
Type /help for commands. Ctrl+C or /exit to quit.

you: fix TypeScript errors and run tests
· tool git_status
· thinking with openai/gpt-4o-mini
· tool execute_command
· tool read_file
· tool patch_file
· tool execute_command
```

### Workflow Demo

```bash
opensyntax "review this repository and identify the safest next refactor"
opensyntax "implement the refactor and run npm test"
opensyntax "summarize the git diff for a pull request"
```

### Architecture Diagram

```txt
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Terminal UI │────▶│ Agent Loop  │────▶│ LLM Provider│
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Tool System │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  Filesystem            Shell                Git
```

## Roadmap

- [ ] Native local model provider support.
- [ ] Plugin system for custom tools and provider adapters.
- [ ] Multi-agent workflows for larger engineering tasks.
- [ ] Richer terminal UI with command history panes and diff panels.
- [ ] VS Code companion integration.
- [ ] Remote execution profiles for containers and SSH hosts.
- [ ] Team policy configuration for permissions and command allowlists.
- [ ] Voice mode for hands-free terminal workflows.
- [ ] Structured PR summary and changelog generation commands.

## Contributing

Contributions are welcome. OpenSyntax aims to stay small, safe, and practical, so changes should be easy to review and grounded in real developer workflows.

Before opening a pull request:

1. Fork the repository and create a focused branch.
2. Keep changes minimal and production-oriented.
3. Add or update tests for behavior changes.
4. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
5. Use conventional commits such as `fix:`, `feat:`, `docs:`, `test:`, or `ci:`.

Good issues include:

- Clear reproduction steps.
- Expected behavior and actual behavior.
- OS, Node.js version, provider, and model.
- Relevant logs with secrets removed.

Security-sensitive reports should avoid public issue details. Open a minimal issue requesting private coordination.

## Sponsors

OpenSyntax is supported by people and organizations who believe in open-source developer tooling.

See current and previous sponsors:

https://os.itisuniqueofficial.com/sponsors.html

## License

OpenSyntax is released under the [MIT License](LICENSE).

## Links

- Website: https://itisuniqueofficial.com/
- OpenSyntax docs: https://os.itisuniqueofficial.com/
- Sponsors: https://os.itisuniqueofficial.com/sponsors.html
- GitHub: https://github.com/itisuniqueofficial-gh/opensyntax
- npm: https://www.npmjs.com/package/opensyntax

<div align="center">

Made with love by [It Is Unique Official](https://itisuniqueofficial.com/)

</div>
