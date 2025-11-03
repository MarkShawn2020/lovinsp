# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**code-inspector** is a developer productivity tool that enables click-to-code workflow: developers click any DOM element in a running web app and automatically open their IDE at the exact source code location. Current version: 1.2.10.

**Core Architecture:**
- **Monorepo Structure:** pnpm workspace with multiple packages (`core`, `vite`, `webpack`, `esbuild`, `turbopack`, `mako`, `code-inspector-plugin`)
- **Adapter Pattern:** Platform-agnostic core logic (`@code-inspector/core`) + bundler-specific adapters
- **Dual-Layer System:** Build-time AST transformation + runtime web component overlay

## Development Commands

### Building
```bash
pnpm build                    # Build all packages (clears dist, compiles TypeScript, bundles with Vite)
pnpm build:docs              # Build documentation site + create ZIP archive
cd packages/<package-name>   # Build specific package
pnpm build                   # In package directory
```

### Testing
```bash
pnpm test                    # Run all tests with Vitest (jsdom environment, coverage enabled)
pnpm test -- -t "test name"  # Run specific test by name
pnpm test -- path/to/test    # Run specific test file
```

Test files are in `/test/` directory organized as:
- `test/core/shared/utils/` - Utility function tests
- `test/core/client/index/` - Client component tests

### Publishing
```bash
pnpm pub                     # Publish all packages to npm
pnpm pub:beta                # Publish beta versions
pnpm version:patch           # Bump patch version (1.2.10 → 1.2.11)
pnpm version:minor           # Bump minor version (1.2.10 → 1.3.0)
pnpm version:major           # Bump major version (1.2.10 → 2.0.0)
```

### Package Management
- **Tool:** pnpm (v9.15.9)
- **Node Version:** 18.20.8 (Volta-locked)
- **Lock File:** Always commit `pnpm-lock.yaml`
- **Installing:** `pnpm install` (run from root, installs all workspace packages)

### Development Workflow
```bash
# For core package development
cd packages/core
pnpm dev                     # Start Vite dev server
pnpm build:client:watch      # Watch mode for client component

# For testing changes with demo projects
cd demos/<demo-name>         # e.g., demos/vite-react
pnpm dev                     # Start demo dev server
```

## Architecture Deep Dive

### Package Structure
```
packages/
├── core/                    # Core transformation & server logic
│   ├── src/server/         # HTTP server, IDE launching, transforms
│   ├── src/client/         # Web component (LitElement-based overlay)
│   └── src/shared/         # Types, constants, utilities
├── vite/                    # Vite plugin adapter
├── webpack/                 # Webpack plugin + loaders
├── esbuild/                 # Esbuild plugin adapter
├── turbopack/               # Turbopack rule adapter
├── mako/                    # Mako plugin adapter
└── code-inspector-plugin/   # Main entry point (aggregates all adapters)
```

### Data Flow

**Build Time:**
1. User configures `codeInspectorPlugin({ bundler: 'vite' })` in build config
2. Plugin identifies bundler type and activates corresponding adapter
3. For each source file (Vue/JSX/Svelte):
   - Parse AST using appropriate parser (`@vue/compiler-dom`, `@babel`, custom Svelte)
   - Inject metadata attributes: `data-insp-path`, `data-insp-row`, `data-insp-col`
   - Transform code with `magic-string`
4. Inject web component client code into bundle
5. Start HTTP server on available port (default: 5678, uses `portfinder`)

**Runtime:**
1. User presses hotkey (Mac: `Option+Shift`, Windows: `Alt+Shift`)
2. Client listens for `mousemove` events
3. Overlay renders with metadata display
4. User clicks element
5. Client sends GET request: `http://localhost:5678?file=...&line=...&column=...`
6. Server invokes `launch-ide` to open editor at location

### Key Design Patterns

**1. Transformation Strategy**
- File type detection: Extension + content analysis
- AST-based injection: Framework-specific parsers
- Graceful degradation: Return original code on transformation failure
- No runtime errors: Transformations never break user code

**2. Configuration System**
- Type: `CodeOptions` interface in `packages/core/src/shared/type.ts`
- 20+ configuration options including:
  - `hotKeys`: Custom keyboard shortcuts
  - `editor`: Target IDE (vscode, webstorm, etc.)
  - `pathType`: relative | absolute
  - `match`: File pattern matching (performance optimization)
  - `escapeTags`: Skip framework internals
  - `skipSnippets`: Special handling for Next.js/Nuxt snippets

**3. Performance Considerations**
- Optional caching for webpack/rspack (enable with `cache: true`)
- File pattern matching to reduce transformation overhead
- Lazy loading of transformation utilities
- Minimal runtime footprint (web component is lightweight)

## Code Quality Standards

**TypeScript:**
- Strict mode enabled (`strict: true` in `tsconfig.json`)
- Avoid `any` types (use `unknown` with type narrowing)
- Use `readonly` for immutable data

**Transformations:**
- Always handle transformation errors gracefully
- Return original source code if transformation fails
- Log warnings but never throw in production transforms
- Test transformations with edge cases (nested components, TypeScript generics, etc.)

**Testing:**
- Write tests for new utilities in `test/core/shared/utils/`
- Test client interactions in `test/core/client/index/`
- Run `pnpm test` before committing
- Coverage targets: Core utilities should be well-covered

**Plugin Development:**
- Each bundler adapter should implement consistent interface
- Defer to core logic for transformations
- Handle bundler-specific quirks in adapter layer
- Document bundler version compatibility

## Critical Implementation Details

### Webpack Plugin Order
The webpack plugin MUST run before framework plugins (React, Vue, etc.) to inject metadata before JSX/template compilation. Use `enforcePre: true` option or configure webpack rules carefully.

### Next.js / Nuxt Handling
These frameworks have special snippet handling. Use `skipSnippets: true` option to avoid transforming framework-generated code.

### Path Handling
- `pathType: 'relative'` (default) - Relative to project root, safer for containerized environments
- `pathType: 'absolute'` - Full file paths, works better for some editors
- Custom formatting via `pathFormat` function

### IDE Integration
Uses `launch-ide` library (v1.2.0) which supports:
- VSCode, Cursor, Windsurf, WebStorm, PhpStorm, PyCharm, IntelliJ IDEA, HBuilderX, Atom

Protocol format: `vscode://file/{filepath}:{line}:{column}`

## Common Debugging Scenarios

**Issue: Plugin not working in production**
- Ensure `dev` option is correctly set (defaults to `process.env.NODE_ENV === 'development'`)
- For esbuild, `dev` function must be provided manually

**Issue: IDE not opening**
- Check if HTTP server is running: Look for console output with port number
- Verify editor configuration: `editor` option must match installed IDE
- Check firewall/security settings blocking localhost connections

**Issue: Wrong file location opened**
- Verify source maps are enabled
- Check `pathFormat` customization if using non-standard project structure
- Ensure `mappings` option is configured for monorepos with nested packages

**Issue: Performance degradation**
- Use `match` option to limit transformation to specific file patterns
- Enable `cache` option for webpack/rspack
- Use `escapeTags` to skip framework internal components

## Demo Projects

15+ demo projects in `/demos/` for testing:
- Vite: React, Vue2, Vue3, Svelte, Qwik, Solid, Astro, Preact
- Webpack: React, Vue3+TSX
- Alternative: esbuild, rspack, farm, turbopack, mako
- Meta frameworks: Nuxt, Next.js (multiple versions)

To test changes: `cd demos/<demo-name> && pnpm dev`

## Documentation

- **Official site:** https://inspector.fe-dev.cn/en
- **Chinese docs:** https://inspector.fe-dev.cn
- **Source:** `/docs/` directory
- **Build:** `pnpm build:docs`

## Publishing to Private Registry (Cloudsmith)

For private npm registry deployment:

1. Build: `pnpm build` (from root)
2. Pack: `cd packages/<pkg> && pnpm pack` (resolves workspace:* deps)
3. Publish: `cloudsmith push npm <org>/<repo> <tarball> --republish`
4. Install via tarball URL or `.npmrc` registry config

See README.md for detailed Cloudsmith instructions.

## File Path Conventions

**Absolute paths for key files:**
- Core: `/Users/mark/projects/code-inspector/packages/core/`
- Types: `packages/core/src/shared/type.ts`
- Transforms: `packages/core/src/server/transform/`
- Client: `packages/core/src/client/index.ts`
- Tests: `/test/core/`

**When referencing code locations:**
Use format `file:line` for easy navigation (e.g., `packages/core/src/server/server.ts:45`)
