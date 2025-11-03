# Repository Guidelines

## Project Structure & Module Organization
- `packages/core`: TypeScript server/runtime that resolves inspected DOM nodes and launches IDE hooks; shared utilities live in `src/shared`.
- `packages/{vite,webpack,esbuild,turbopack,mako,standalone}`: Bundler adapters that wrap `core`; choose the package that matches your target toolchain.
- `packages/code-inspector-plugin`: Bundler-agnostic entry that ships the inspector overlay and re-exports adapter glue.
- `docs/` powers the VitePress site, `demos/` contains runnable examples, `assets/` stores UI sprites, and `test/` houses Vitest suites for cross-package behavior.

## Build, Test, and Development Commands
- `pnpm install`: Install dependencies using the Volta-pinned Node 18.20.8 / pnpm 9 toolchain.
- `pnpm build`: Runs filtered builds for every package and regenerates declaration files.
- `pnpm build:docs`: Rebuilds the documentation site and bundles artifacts via `scripts/zip`.
- `pnpm test`: Executes Vitest in `jsdom` mode with coverage over `packages/*/src/**`.
- `pnpm --filter packages/<name> run build`: Focus builds on a single adapter while iterating locally.

## Coding Style & Naming Conventions
Write strict TypeScript with 2-space indentation and favor named exports from index files. Keep shared enums/constants in `packages/core/src/shared` so adapters can import them through the `@/` path alias rather than relative hops. When adding configuration, mirror existing option naming (`pathType`, `hooks.afterInspectRequest`) and extend the corresponding typing exports. Ensure `pnpm build` stays warning-free before pushing.

## Testing Guidelines
Add new specs as `*.test.ts` in `test/<domain>` or beside the touched package code, following descriptive `describe` groups and intent-driven `it` names. Mock file-system or network calls sparingly to keep inspector flows realistic. Run `pnpm test` for CI parity and `pnpm exec vitest --watch` during development. Verify the coverage report still lists your module and document any deliberate exclusions in the PR.

## Commit & Pull Request Guidelines
Use Conventional Commits (`feat:`, `fix:`, `release:`) as observed in history, and squash noisy work-in-progress commits. PRs should summarize the user-facing impact, link any tracked issues, and attach screenshots or terminal transcripts for behavioral changes. Call out breaking changes explicitly, update docs/demos when interfaces shift, and request reviews from maintainers owning the affected adapter.

## Security & Configuration Tips
Avoid committing local IDE paths, generated archives from `scripts/zip`, or tokens. The inspector HTTP server enforces `DefaultPort` and host safety checks—if you alter them, keep validation in place and document new environment knobs in `docs/guide/configuration.md`. Review third-party upgrade notes before publishing via `pnpm pub` or `pnpm pub:beta`.
