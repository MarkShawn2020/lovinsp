<p align="center">
  <img src="docs/images/cover.png" alt="Lovinsp Cover" width="100%">
</p>

<h1 align="center">
  <img src="assets/logo.svg" width="32" height="32" alt="Logo" align="top">
  Lovinsp
</h1>

<p align="center">
  <strong>Click any DOM element → Jump to source code in your IDE</strong><br>
  <sub>Vue · React · Svelte · Solid · Astro · Preact · Qwik</sub>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/lovinsp"><img src="https://img.shields.io/npm/v/lovinsp.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/lovinsp"><img src="https://img.shields.io/npm/dm/lovinsp.svg" alt="npm downloads"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/lovinsp.svg" alt="MIT License"></a>
</p>

---

## Features

- **Click-to-Code**: Hold hotkey + click any element to open its source in your IDE
- **Copy Path Mode**: Copy file paths for AI-assisted coding workflows
- **Multi-Framework**: Vue, React, Svelte, Solid, Astro, Preact, Qwik
- **Multi-Bundler**: Vite, Webpack, Rspack, Esbuild, Turbopack, Farm, Mako
- **IDE Support**: VSCode, Cursor, WebStorm, and more

## Installation

```bash
npm install lovinsp
# or
pnpm add lovinsp
```

## Quick Start

### Vite

```js
// vite.config.js
import { lovinspPlugin } from 'lovinsp';

export default {
  plugins: [
    lovinspPlugin({ bundler: 'vite' })
  ]
};
```

### Webpack

```js
// webpack.config.js
const { lovinspPlugin } = require('lovinsp');

module.exports = {
  plugins: [
    lovinspPlugin({ bundler: 'webpack' })
  ]
};
```

### Next.js (Turbopack)

```js
// next.config.js
import { lovinspPlugin } from 'lovinsp';

export default {
  turbopack: {
    rules: lovinspPlugin({ bundler: 'turbopack' })
  }
};
```

## Usage

1. Start your dev server
2. Hold `Option+Shift` (Mac) or `Alt+Shift` (Windows)
3. Click any element
4. Your IDE opens at the exact source location

### Hotkeys

| Mode | Mac | Windows |
|------|-----|---------|
| Copy Path | `Shift+Option` | `Shift+Alt` |
| Open IDE | `Shift+Option+Cmd` | `Shift+Alt+Ctrl` |

### Configuration

```js
lovinspPlugin({
  bundler: 'vite',           // Required: 'vite' | 'webpack' | 'rspack' | 'esbuild' | 'turbopack' | 'mako'
  editor: 'vscode',          // IDE to open (auto-detected)
  behavior: {
    defaultAction: 'copy',   // 'copy' | 'locate' | 'target' | 'all'
    copy: true,              // Enable copy mode
    locate: true,            // Enable IDE opening
  },
  hotKeys: ['shiftKey', 'altKey'],  // Custom hotkeys
  hideConsole: false,        // Hide console hints
})
```

## Bundler Support

<details>
<summary><b>All bundler configurations</b></summary>

### Rspack / Rsbuild

```js
// rspack.config.js
const { lovinspPlugin } = require('lovinsp');

module.exports = {
  plugins: [lovinspPlugin({ bundler: 'rspack' })]
};
```

### Esbuild

```js
const { lovinspPlugin } = require('lovinsp');

esbuild.build({
  plugins: [lovinspPlugin({ bundler: 'esbuild', dev: () => true })]
});
```

### Nuxt

```js
// nuxt.config.js
import { lovinspPlugin } from 'lovinsp';

export default defineNuxtConfig({
  vite: {
    plugins: [lovinspPlugin({ bundler: 'vite' })]
  }
});
```

### Astro

```js
// astro.config.mjs
import { lovinspPlugin } from 'lovinsp';

export default defineConfig({
  vite: {
    plugins: [lovinspPlugin({ bundler: 'vite' })]
  }
});
```

### UmiJS (with Mako)

```js
// .umirc.ts
import { lovinspPlugin } from 'lovinsp';

export default defineConfig({
  mako: {
    plugins: [lovinspPlugin({ bundler: 'mako' })]
  }
});
```

### Vue CLI

```js
// vue.config.js
const { lovinspPlugin } = require('lovinsp');

module.exports = {
  chainWebpack: (config) => {
    config.plugin('lovinsp').use(lovinspPlugin({ bundler: 'webpack' }));
  }
};
```

### Farm

```js
// farm.config.js
import { lovinspPlugin } from 'lovinsp';

export default defineConfig({
  vitePlugins: [lovinspPlugin({ bundler: 'vite' })]
});
```

</details>

## Migrating from code-inspector (Cloudsmith)

If you were using `code-inspector` from a private Cloudsmith registry, follow these steps to migrate to the new `lovinsp` package on npm:

### 1. Remove old packages

```bash
# Remove old code-inspector packages
pnpm remove code-inspector @code-inspector/core @code-inspector/vite @code-inspector/webpack
# or
npm uninstall code-inspector @code-inspector/core @code-inspector/vite @code-inspector/webpack
```

### 2. Clean up .npmrc

Remove or comment out Cloudsmith registry configuration from your `.npmrc`:

```diff
- @code-inspector:registry=https://npm.cloudsmith.io/your-org/your-repo/
- //npm.cloudsmith.io/your-org/your-repo/:_authToken=${CLOUDSMITH_TOKEN}
```

### 3. Install lovinsp

```bash
pnpm add lovinsp
# or
npm install lovinsp
```

### 4. Update imports

```diff
- import { codeInspectorPlugin } from 'code-inspector';
+ import { lovinspPlugin } from 'lovinsp';
```

Or for individual adapters:

```diff
- import { vitePlugin } from '@code-inspector/vite';
+ import { vitePlugin } from '@lovinsp/vite';
```

### 5. Update configuration

```diff
// vite.config.js
- codeInspectorPlugin({ bundler: 'vite' })
+ lovinspPlugin({ bundler: 'vite' })
```

### Package name mapping

| Old (code-inspector) | New (lovinsp) |
|---------------------|---------------|
| `code-inspector` | `lovinsp` |
| `@code-inspector/core` | `@lovinsp/core` |
| `@code-inspector/vite` | `@lovinsp/vite` |
| `@code-inspector/webpack` | `@lovinsp/webpack` |
| `@code-inspector/esbuild` | `@lovinsp/esbuild` |
| `@code-inspector/turbopack` | `@lovinsp/turbopack` |
| `@code-inspector/mako` | `@lovinsp/mako` |

### API compatibility

The API remains **100% compatible**. Only the package names and import paths have changed. All configuration options work exactly the same.

## Packages

| Package | Description |
|---------|-------------|
| [`lovinsp`](https://www.npmjs.com/package/lovinsp) | Main plugin (use this) |
| [`@lovinsp/core`](https://www.npmjs.com/package/@lovinsp/core) | Core logic |
| [`@lovinsp/vite`](https://www.npmjs.com/package/@lovinsp/vite) | Vite adapter |
| [`@lovinsp/webpack`](https://www.npmjs.com/package/@lovinsp/webpack) | Webpack adapter |
| [`@lovinsp/esbuild`](https://www.npmjs.com/package/@lovinsp/esbuild) | Esbuild adapter |
| [`@lovinsp/turbopack`](https://www.npmjs.com/package/@lovinsp/turbopack) | Turbopack adapter |
| [`@lovinsp/mako`](https://www.npmjs.com/package/@lovinsp/mako) | Mako adapter |

## Credits

Based on [code-inspector](https://github.com/zh-lx/code-inspector) by [@zh-lx](https://github.com/zh-lx).

## License

MIT
