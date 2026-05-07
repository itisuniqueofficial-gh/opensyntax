# AGENTS.md

## Commands That Matter

- Use Node.js `>=20`; CI installs with `npm ci` and Node 20.
- Validate in the same order CI uses: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- `npm run lint` is intentionally `tsc --noEmit`, not ESLint; do not assume ESLint is the active lint gate.
- Use `npm pack --dry-run` before packaging/release changes; `prepack` runs `npm run build`.
- Focused tests: `npx vitest run src/tests/tools.test.ts` or `npx vitest run src/tests/agent.test.ts`.
- Smoke-test CLI routing after command changes with `node dist/cli.js --help`, `node dist/cli.js providers`, and `node dist/cli.js doctor` after `npm run build`.

## Entrypoints And Wiring

- CLI entrypoint is `src/cli.ts`; public exports are in `src/index.ts`; bundled output is `dist/cli.js` and `dist/index.js` via `tsup.config.ts`.
- `src/agent/loop.ts` is the orchestration loop: plan, stream provider output, execute tool calls, save sessions.
- Tool calls are registered in `src/tools/registry.ts`; tools must have Zod schemas and execute through `ToolContext`.
- Provider onboarding/auth is split across `src/providers/registry.ts`, `src/auth/*`, `src/ui/onboarding.ts`, and `src/commands/providers.ts`.
- `tsconfig.json` uses explicit include globs, not `src/**/*.ts`; add new source directories there or CI typecheck may skip them.

## Provider/Auth Gotchas

- `ModelConfig.provider` only supports `openai`, `anthropic`, `gemini`, and `openrouter`; extra providers like Groq/NVIDIA/Mistral/Ollama are mapped to the OpenAI-compatible adapter with provider-specific `baseUrl` in `src/auth/manager.ts`.
- Provider credentials are stored in `~/.opensyntax/providers.json`; secrets are locally AES-GCM encrypted with a machine/user-derived key, not OS keychain storage.
- Browser/device-code auth hooks exist but mostly return clear fallback messages because public CLI OAuth token exchange is not implemented for most model providers.
- Avoid logging API keys or decrypted provider secrets; use `maskSecret` from `src/auth/storage.ts` for display.

## CLI Behavior To Preserve

- The root command accepts a variadic `[prompt...]`; register subcommands before the root `.argument(...).action(...)` or words like `providers` can be treated as prompts.
- First run with no configured provider should launch onboarding instead of a broken chat loop.
- `opensyntax providers` and `opensyntax doctor` must work without configured providers.
- Slash commands are handled in `src/ui/chat.ts`; keep CLI commands and slash-command docs in README aligned.

## Git And Filesystem Safety

- `git_status` must not fail loudly outside git repositories; it should report that git features are disabled and allow the session to continue.
- Filesystem tools must stay workspace-bound through `resolveWorkspacePath` in `src/utils/paths.ts`.
- `patch_file` intentionally fails on missing or ambiguous search text; do not replace it with broad overwrite behavior.
- Shell execution risk checks live in `src/tools/shell.ts`; keep destructive commands behind permission prompts.

## Release Workflow

- Releases run on pushes to `main` through `.github/workflows/release.yml` and semantic-release.
- Required GitHub secrets are `NPMJS_TOKEN` and `GITACCESS_TOKEN`; the workflow intentionally does not use `NPM_TOKEN`.
- semantic-release updates `CHANGELOG.md`, `package.json`, and `package-lock.json`, commits `chore(release): X.Y.Z [skip ci]`, tags `vX.Y.Z`, publishes npm, and creates GitHub Releases.
- After pushing a normal commit, `origin/main` may move because the release workflow adds a release commit; fetch/rebase before pushing follow-up commits.
- The `conventionalcommits` preset requires `conventional-changelog-conventionalcommits` in devDependencies.

## Docs To Keep In Sync

- README is the primary user-facing doc for install, auth commands, provider setup, slash commands, safety, development, and release behavior.
- If adding/removing providers, update `src/providers/registry.ts`, CLI help text in `src/cli.ts`, and README provider lists together.
